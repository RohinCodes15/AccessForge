# Using AccessForge

AccessForge is an independent project, not a City of Fremont service. Nothing here is an official inspection or says a route is safe.

## Residents: report a barrier

1. Open **Report a barrier** (`/report`). No account or name is needed.
2. Choose the barrier type and a severity from 1 (minor) to 5 (impassable).
3. Describe what you saw. Leave out names, phone numbers, and anything about other people.
4. Set the location: click the map, or type latitude and longitude. Check it carefully; the map background is a simple street outline.
5. Submit. You will see a confirmation.

**What happens next:** the type, severity, and location appear on the barrier map straight away, marked **Pending**. Your description stays hidden until a trained volunteer reviewer confirms the report. A reviewer may also reject it, for example if the barrier cannot be found. You can follow a report's status on the barrier map and list (`/barriers`), using the status filter.

Photos: the form can preview a photo on your device, but it is never uploaded.

## Everyone: explore barriers

`/barriers` shows reports on a map and in a list with the same content. Filter by type and status. The list works fully with a keyboard and screen reader; you never need the map.

**Status meanings:** *Pending* means not yet checked. *Verified* means a reviewer accepted it and recorded why. That is a volunteer check, not a city inspection. *Rejected* means a reviewer could not confirm it.

## Everyone: the pilot dashboard

`/pilot` shows how many reports exist, split by status and type, with the first and latest report dates. Counts show who chose to report, not how many barriers exist. Download the counts as CSV. Use the feedback form at the bottom to tell us what is hard to use, inaccessible, or wrong. It is anonymous.

## Planners and advocates: the repair planner

1. Open `/planner`. Choose an example network and a budget.
2. Run it. The page compares four ways of choosing repairs: an exact search over every affordable combination, and three simpler rankings.
3. **Recommended plan** lists the chosen repairs. **Why these repairs** explains what each repair fixes, who gains, and which other repair it depends on.
4. Save a scenario, change the budget, and run again to compare them side by side.
5. Export as CSV (with generation date, source, and method), as full JSON, or print the page.

The planner opens on the **Fremont pilot**: real streets, homes and destinations around Fremont BART from OpenStreetMap and the 2020 Census, with two kinds of barrier: raised curbs mapped in OpenStreetMap that nobody has checked on site, and community reports. A report of any type (missing curb ramp, broken surface, obstruction, missing sidewalk or steep slope) with severity 3 or higher is treated as blocking wheelchair users; milder reports stay on the map but do not change routes, and a barrier more than 15 m from the mapped walking network is left out. This rule is a modeling assumption, not a standard. Its budget is in repair units, one per barrier, and only 0, 1 or 2 are offered, because exhaustive search takes about 40 seconds at 2 and does not finish at 3. The service computes these plans when it starts and again after every new report or review decision. Until the first computation finishes, the planner asks you to try again; after that it shows the previous plan until the new one is ready, with the time of the last report or review it includes.

The other three networks are **generated examples** with relative cost units, not dollars. Every result, on either kind of network, is a modeled estimate. Use it to decide what to check on site, not to make repair decisions.

## Reviewers

1. Get a reviewer key from the project maintainer (`docs/DEPLOYMENT.md` §4). Keep it private.
2. Open `/verify` and sign in. The session lasts up to 8 hours.
3. Signed in, you see every report's full description. Pick a report and choose **Verify** or **Reject**. You must write a reason, such as what you checked, when, and how (site visit or dated photo). Follow `docs/AUDIT_PROTOCOL.md`.
4. Decisions are final and kept in an audit log that cannot be edited. Only pending reports can be reviewed.
5. Do not verify a report whose description contains personal information. Reject it and say why. Its text then stays hidden.
6. Sign out on shared computers.
