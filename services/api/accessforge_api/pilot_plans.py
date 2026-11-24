"""Fremont pilot plans, kept in memory and refreshed whenever barriers change.

Exhaustive search on the real network takes about 40 s at a budget of 2 repair units and does not
finish at 3 (measured 2026-11-18), far past a web request. Plans are computed in one background
thread: at startup, and again after each new report or review decision. Requests that arrive
while a refresh runs collapse into one more run. The previous plans keep being served until the
new ones are ready, and a failed refresh keeps the last good plans.
"""

import logging
import threading
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from datetime import UTC, datetime
from types import MappingProxyType

from sqlalchemy import Engine

from .pilot_network import PilotNetwork, load_pilot_network
from .planning_adapter import build_plan
from .planning_schemas import PlanningDataset, PlanView

logger = logging.getLogger(__name__)

# Repair units. Larger budgets are out of reach of exhaustive search on this network.
PILOT_BUDGETS = (0.0, 1.0, 2.0)
PILOT_TIME_LIMIT_S = 180.0


class PlanNotReadyError(Exception):
    """The pilot plan is still being computed, or no pilot network is loaded."""


@dataclass(frozen=True)
class PilotSnapshot:
    """One network and the plans computed on it, published together."""

    network: PilotNetwork
    plans: Mapping[float, PlanView]


def compute_snapshot(engine: Engine) -> PilotSnapshot | None:
    """Reads the current barriers and plans every pilot budget. None when no network is loaded."""
    # Taken before the read, so the plans include every barrier recorded up to this moment.
    barriers_as_of = datetime.now(UTC)
    pilot = load_pilot_network(engine)
    if pilot is None:
        return None
    plans = {
        budget: build_plan(
            pilot.network,
            PlanningDataset.fremont_pilot,
            budget,
            PILOT_TIME_LIMIT_S,
            pilot.destination_names,
        ).model_copy(update={"barriers_as_of": barriers_as_of})
        for budget in PILOT_BUDGETS
    }
    return PilotSnapshot(pilot, MappingProxyType(plans))


class _Refresher:
    """Runs `compute` in one background worker; the latest good snapshot is what gets served."""

    def __init__(self, compute: Callable[[Engine], PilotSnapshot | None]) -> None:
        self._compute = compute
        self._lock = threading.Lock()
        self._engine: Engine | None = None
        self._snapshot: PilotSnapshot | None = None
        self._pending = False
        self._running = False

    def start(self, engine: Engine) -> None:
        with self._lock:
            self._engine = engine
        self.request()

    def request(self) -> None:
        """Asks for a fresh snapshot. Never blocks; a no-op before `start`."""
        with self._lock:
            if self._engine is None:
                return
            self._pending = True
            if self._running:
                return
            self._running = True
        threading.Thread(target=self._run, name="pilot-plans", daemon=True).start()

    def snapshot(self) -> PilotSnapshot:
        with self._lock:
            snapshot = self._snapshot
        if snapshot is None:
            raise PlanNotReadyError
        return snapshot

    def _run(self) -> None:
        while True:
            with self._lock:
                if not self._pending or self._engine is None:
                    self._running = False
                    return
                self._pending = False
                engine = self._engine
            self._refresh(engine)

    def _refresh(self, engine: Engine) -> None:
        try:
            snapshot = self._compute(engine)
        except Exception:
            # A failed refresh must not stop the API or the worker; the last good plans stay.
            logger.exception(
                "Fremont pilot plan refresh failed; serving the previous plans"
            )
            return
        if snapshot is None:
            logger.info("no Fremont pilot network loaded; pilot plans disabled")
            return
        with self._lock:
            self._snapshot = snapshot
        logger.info("Fremont pilot plans refreshed")


_refresher = _Refresher(compute_snapshot)


def start_precompute(engine: Engine) -> None:
    _refresher.start(engine)


def request_refresh() -> None:
    """Call after a change to the barrier table commits."""
    _refresher.request()


def pilot_snapshot() -> PilotSnapshot:
    """Raises PlanNotReadyError before the first snapshot is ready."""
    return _refresher.snapshot()


def pilot_plan(budget: float, snapshot: PilotSnapshot | None = None) -> PlanView:
    """Raises ValueError for a budget that is not precomputed, PlanNotReadyError before it is."""
    if budget not in PILOT_BUDGETS:
        raise ValueError(f"budget must be one of {PILOT_BUDGETS} repair units")
    return (snapshot or pilot_snapshot()).plans[budget]
