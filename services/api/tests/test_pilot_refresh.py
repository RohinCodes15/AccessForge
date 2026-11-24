"""Pilot plans follow the barrier table: every report type counts, and changes trigger a refresh."""

import threading
import time
from typing import cast
from unittest.mock import patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text
from test_api import application
from test_pilot_plans import tiny_pilot  # noqa: F401 - shared PostGIS fixture
from test_reports_unit import PAYLOAD, example_report
from test_reviews import REVIEW, REVIEWER_KEY, example_review, reviewer_app

from accessforge_api import pilot_plans
from accessforge_api.pilot_network import (
    BLOCKING_SEVERITY,
    PROFILES,
    STEPS_TYPE,
    load_pilot_network,
)
from accessforge_api.planning_schemas import PlanningMethod
from accessforge_api.review_schemas import ReviewConflict
from accessforge_api.schemas import BarrierType

WAIT_S = 5.0
POLL_S = 0.01
FAKE_ENGINE = cast(Engine, object())

# The tiny pilot's curb sits at (-121.979, 37.55); a new barrier there blocks the same path.
_ADD_BARRIER = text("""
    WITH loc AS (
      INSERT INTO location (geom) VALUES (ST_SetSRID(ST_MakePoint(-121.979, 37.55), 4326))
      RETURNING id
    )
    INSERT INTO barrier (location_id, type, description, severity, presence_prob)
    SELECT id, :type, 'Test report', :severity, 1.0 FROM loc
""")


def _add_barrier(engine: Engine, kind: str, severity: int) -> None:
    with engine.begin() as connection:
        connection.execute(_ADD_BARRIER, {"type": kind, "severity": severity})


def _wait_until_idle(refresher: pilot_plans._Refresher) -> None:
    deadline = time.monotonic() + WAIT_S
    while refresher._running:
        assert time.monotonic() < deadline, "refresh worker did not finish"
        time.sleep(POLL_S)


def test_every_report_type_blocks_wheelchair_routes() -> None:
    wheelchair = next(profile for profile in PROFILES if profile.id == "wheelchair")

    assert {kind.value for kind in BarrierType} | {
        STEPS_TYPE
    } <= wheelchair.impassable_types


@pytest.mark.integration
def test_only_reports_at_blocking_severity_enter_the_model(tiny_pilot: Engine) -> None:  # noqa: F811
    _add_barrier(tiny_pilot, BarrierType.obstruction.value, BLOCKING_SEVERITY - 1)
    _add_barrier(tiny_pilot, BarrierType.surface_problem.value, BLOCKING_SEVERITY)

    pilot = load_pilot_network(tiny_pilot)

    assert pilot is not None
    kinds = sorted(barrier.type for barrier in pilot.network.instance.barriers)
    assert kinds == ["missing_curb_ramp", "surface_problem"]
    assert len(pilot.network.instance.repairs) == len(kinds)


@pytest.mark.integration
def test_a_new_report_changes_the_next_computed_plan(tiny_pilot: Engine) -> None:  # noqa: F811
    before = pilot_plans.compute_snapshot(tiny_pilot)
    _add_barrier(tiny_pilot, BarrierType.obstruction.value, BLOCKING_SEVERITY + 1)

    after = pilot_plans.compute_snapshot(tiny_pilot)

    assert before is not None and after is not None
    best = {
        budget: next(p for p in plan.plans if p.method == PlanningMethod.exhaustive)
        for budget, plan in after.plans.items()
    }
    assert best[1.0].delta_a == 0  # one repair no longer opens the only path
    assert len(best[2.0].selected_repair_ids) == 2
    assert best[2.0].delta_a > 0
    as_of_before = before.plans[1.0].barriers_as_of
    as_of_after = after.plans[1.0].barriers_as_of
    assert as_of_before is not None and as_of_after is not None
    assert as_of_after > as_of_before


def test_refresh_requests_during_a_run_coalesce_into_one_more_run() -> None:
    started, release = threading.Event(), threading.Event()
    calls: list[Engine] = []

    def slow_compute(engine: Engine) -> None:
        calls.append(engine)
        if len(calls) == 1:
            started.set()
            release.wait(WAIT_S)

    refresher = pilot_plans._Refresher(slow_compute)
    refresher.start(FAKE_ENGINE)
    assert started.wait(WAIT_S)

    for _ in range(3):
        refresher.request()
    release.set()
    _wait_until_idle(refresher)

    assert calls == [FAKE_ENGINE, FAKE_ENGINE]


def test_a_failed_refresh_keeps_serving_the_previous_plans() -> None:
    previous = pilot_plans.PilotSnapshot(network=object(), plans={})  # type: ignore[arg-type]
    outcomes: list[object] = [previous, RuntimeError("database went away")]

    def compute(_: Engine) -> pilot_plans.PilotSnapshot:
        outcome = outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return cast(pilot_plans.PilotSnapshot, outcome)

    refresher = pilot_plans._Refresher(compute)
    refresher.start(FAKE_ENGINE)
    _wait_until_idle(refresher)
    refresher.request()
    _wait_until_idle(refresher)

    assert refresher.snapshot() is previous


def test_requests_before_start_do_nothing_and_plans_are_not_ready() -> None:
    refresher = pilot_plans._Refresher(lambda _: pytest.fail("must not compute"))

    refresher.request()

    with pytest.raises(pilot_plans.PlanNotReadyError):
        refresher.snapshot()


def test_a_new_report_triggers_a_plan_refresh() -> None:
    with (
        patch(
            "accessforge_api.reports.report_repository.create_report",
            return_value=example_report(),
        ),
        patch("accessforge_api.reports.request_refresh") as refresh,
        TestClient(application()) as client,
    ):
        response = client.post("/reports", json=PAYLOAD)

    assert response.status_code == 201
    refresh.assert_called_once_with()


def test_a_review_decision_triggers_a_plan_refresh() -> None:
    report_id = uuid4()
    with (
        patch(
            "accessforge_api.reviews.review_repository.review_report",
            return_value=example_review(report_id),
        ),
        patch("accessforge_api.reviews.request_refresh") as refresh,
        TestClient(reviewer_app()) as client,
    ):
        response = client.post(
            f"/reports/{report_id}/reviews",
            headers={"Authorization": f"Bearer {REVIEWER_KEY}"},
            json=REVIEW,
        )

    assert response.status_code == 201
    refresh.assert_called_once_with()


def test_a_rejected_review_request_does_not_refresh() -> None:
    with (
        patch(
            "accessforge_api.reviews.review_repository.review_report",
            side_effect=ReviewConflict,
        ),
        patch("accessforge_api.reviews.request_refresh") as refresh,
        TestClient(reviewer_app()) as client,
    ):
        response = client.post(
            f"/reports/{uuid4()}/reviews",
            headers={"Authorization": f"Bearer {REVIEWER_KEY}"},
            json=REVIEW,
        )

    assert response.status_code == 409
    refresh.assert_not_called()
