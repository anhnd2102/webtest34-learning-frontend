# Issue #22 — Read concurrency: hardening progress

Date: 2026-10-30 (Asia/Saigon).
Branch: `refactor/frontend-architecture-plan`.
Status: in progress; this checkpoint does not close #22.

## Implemented at this checkpoint

- Fixed generation reuse after cancel/restart. A stale request must never become current when the same scope starts again. A new regression test failed before the fix and passed afterward.
- Repaired the deferred-response fixtures for attempt details and incident timelines: provide browser globals with cleanup, trigger reads explicitly, and use the actual room endpoint and button selector.
- Strengthened browser search coverage: wait until the slow request has actually started, then assert the fresh student and exact query in the URL. Previously debounce could prevent the slow request entirely.

## Shell read inventory

| Group | Current protection | Remaining audit |
| --- | --- | --- |
| Classes | `classes` generation | Auth/session restoration and scope changes while classes load |
| Bài được giao | `assignments` generation and class check | Parent scope cancellation and stale errors |
| Results | `results` generation and class/assignment checks | Search debounce, filter/sort/page transitions |
| Lần làm bài detail | `attemptDetail` generation and selected IDs | Closing drawer and changing parent scope |
| Studio catalog | `testStudio` generation | Navigation away while loading |
| Studio detail | `testStudioBuilder` generation plus catalog generation | Switching draft/catalog and stale Builder mount |
| Room status | `examRoom` generation | Stream owner and fallback are #23 |
| Incident timeline | `examRoomTimeline` generation | Parent room scope transitions |

## Verification

- `node --test tests/dashboard-read-concurrency.test.mjs tests/query-coordinator.test.mjs`: 15 pass, 0 fail.
- `npm test`: 515 pass, 0 fail, 0 skip.
- `node tests/browser/dashboard-read-concurrency-smoke.mjs`: passed at 1440x900, 1024x768 and 390x844; no page errors. Uses synthetic, intercepted API responses, not production.
- `git diff --check`: passed.
- Backend unchanged; backend suite, CI, live API and deployment not verified at this checkpoint.

## Review and next work

Standards self-review: the coordinator keeps one generation counter per instance and frees active scope entries on cancel; no new dependency, API, CSS or framework changes. Browser globals in tests are restored after each test.

Spec self-review: this commit fixes cancel/restart freshness and makes existing tests exercise their intended flows. The remaining audit above is required before marking every acceptance criterion complete. Independent review has not been performed.

Next: finish #22 scope/navigation coverage, then #23 SSE/reconnect/REST ownership, then #24 integration and rollback verification. #21 has implementation commits but remains open on the issue tracker. #18 and #20 are closed.

Rollback: revert this checkpoint commit; no database or published content changes. Do not include unrelated backend untracked files.
