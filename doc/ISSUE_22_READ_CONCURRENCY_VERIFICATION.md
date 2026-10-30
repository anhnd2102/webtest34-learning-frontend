# Issue #22 — Read concurrency: hardening progress

Date: 2026-10-30 (Asia/Saigon).
Branch: `refactor/frontend-architecture-plan`.
Status: implemented locally; ready for review. GitHub issue remains open.

## Implemented at this checkpoint

- Fixed generation reuse after cancel/restart. A stale request must never become current when the same scope starts again. A new regression test failed before the fix and passed afterward.
- Repaired the deferred-response fixtures for attempt details and incident timelines: provide browser globals with cleanup, trigger reads explicitly, and use the actual room endpoint and button selector.
- Strengthened browser search coverage: wait until the slow request has actually started, then assert the fresh student and exact query in the URL. Previously debounce could prevent the slow request entirely.
- Cancel results immediately when search input changes, before the debounce fires.
- Invalidate catalog/detail reads when leaving Studio or reloading the catalog. Browser coverage confirms late detail responses cannot mount a Builder after leaving Studio.
- Invalidate attempt detail when switching class/assignment or closing the drawer; cancel outstanding read groups on logout.
- Ignore aborted/disposed responses before processing HTTP errors, including stale 401 responses. Current requests retain the existing server authorization handling.
- Give session restoration its own generation and abort signal so disposed/logout owners cannot restore an old profile.
- Replace ineffective page/catalog tests with request-count assertions and checks that the current DOM survives a late response.

## Shell read inventory

| Group | Current protection | Verification / boundary |
| --- | --- | --- |
| Session restoration | `sessionRestore` generation | Deferred profile after dispose cannot render |
| Classes | `classes` generation, canceled when class selection changes | Scope checks and browser class switching |
| Bài được giao | `assignments` generation and class check | Browser rapid class switching; new loads invalidate results |
| Results | `results` generation and class/assignment checks | Search debounce, filters, actual page changes, stale errors and stale 401 |
| Lần làm bài detail | `attemptDetail` generation and selected IDs | Drawer close, class/assignment cancellation, out-of-order detail |
| Studio catalog | `testStudio` generation | Reload and navigation-away deferred responses |
| Studio detail | `testStudioBuilder` generation plus catalog generation | Browser late detail after leaving Studio; new catalog cancels detail |
| Room status | `examRoom` generation | Stream owner and fallback are #23 |
| Incident timeline | `examRoomTimeline` generation | Parent room scope transitions |

## Verification

- `node --test tests/dashboard-read-concurrency.test.mjs tests/query-coordinator.test.mjs`: 21 pass, 0 fail.
- `npm test`: 521 pass, 0 fail, 0 skip.
- `node tests/browser/dashboard-read-concurrency-smoke.mjs`: passed at 1440x900, 1024x768 and 390x844; no page errors. Uses synthetic, intercepted API responses, not production.
- `git diff --check`: passed.
- Backend unchanged. `npm run check` passed; `npm test`: 328 pass, 0 fail, 47 skip (375 total). Skipped database/private-input coverage is not validated.
- Backend `npm run contract`: 4 pass; `npm run webtest34:types:check`: passed; `npm run webtest34:content:test`: 3 skip, 0 pass (private input unavailable).
- CI, live API and deployment not verified.

## Review and next work

Standards self-review: the coordinator keeps one generation counter per instance and frees active scope entries on cancel; no new dependency, API, CSS or framework changes. Browser globals in tests are restored after each test.

Spec self-review: shell reads have freshness checks across response/error paths, with explicit scope cancellation and deferred-response/browser coverage. No API/payload, grading, design system, canonical renderer or published content changes. SSE reconnect and stream-owned REST fallback remain scoped to #23. Independent review has not been performed; review was performed inline because repository instructions require user permission to run subagents.

Next: #23 SSE/reconnect/REST ownership, then #24 integration and rollback verification. #21 has implementation commits but remains open on the issue tracker. #18 and #20 are closed. This checkpoint does not push, merge, deploy or close remote issues.

Rollback: revert this checkpoint commit; no database or published content changes. Do not include unrelated backend untracked files.
