# Issue #23 — Phòng thi stream ownership and reconnect

Date: 2026-10-30 (Asia/Saigon). Branch: `refactor/frontend-architecture-plan`.
Spec: GitHub frontend issue #23, parent #19. Starting commit: `7ab2f3e`.
Status: implemented locally; remote issue remains open. No push, merge or deployment.

## Result

Each open Phòng thi creates an independent session before its initial REST read. The session captures class, Bài được giao, origin and authorization for the connection. Closing, changing scope, logout or dashboard disposal ends that owner. Old fetches, reads, decoded events, fallback responses and reconnect continuations cannot update a new room.

`shell/exam-room-session.js` owns the stream loop behind `start()`, `dispose()` and `isCurrent()`. Dashboard retains rendering, API paths and domain event transformations. The existing SSE parser is unchanged.

## Resource inventory

| Resource | Owner and cleanup |
| --- | --- |
| Initial room load | Session exists before await; #22 query generation plus session freshness prevents late stream startup |
| Stream connection | Per-session AbortController; mount/scope identity checked before response/error effects |
| Reader | Session cancels active reader; loop releases its lock in finally, including error responses and late transport responses |
| Decoder/frame buffer | Local to each connection; freshness checked after each read and before each decoded event |
| Reconnect delay | Per-session 1000ms timeout; dispose clears only that timeout and resolves its waiter |
| REST fallback | Captures originating session and uses #22 query coordinator; checks freshness before reads and response/error commits |
| Timeline | #22 generation canceled together with the room on stop |
| Dashboard cleanup | `lifecycle.onDispose(stopExamRoomEvents)`; idempotent dispose stops stream and reads |
| Logout | Stops stream immediately, before awaiting the existing logout HTTP request |
| Existing polling/listeners | Remain owned by dashboard lifecycle; polling policy/frequency unchanged |

An abort-ignoring external transport may keep its own promise pending until it settles. Session checks prevent any later UI or reconnect effects; reader cancellation is requested immediately and lock release is attempted when the read settles.

## Acceptance checklist

- [x] Owner is tied to mount/class/assignment; reopen uses a fresh controller.
- [x] Close, class/assignment change, logout and dispose abort the stream and cancel reader/reconnect resources.
- [x] Late fetch, snapshot and already-decoded batch events cannot render for a stopped owner.
- [x] REST fallback/status/timeline use #22 freshness protection, including late success and error.
- [x] Parser, progress, incident, connection and active-401 logout semantics remain unchanged; reconnect remains 1000ms.
- [x] Stopping a room leaves unrelated timers/listeners intact.
- [x] Public `mountDashboard` tests use deferred fake streams and fake clocks for pending initial REST, fetch, reader, fallback and delay.
- [x] Ten open/close cycles plus reopen prove fresh streams still update correctly without duplicate reconnects.
- [x] Browser smoke uses synthetic API/SSE only; full suite and rollback checks recorded below.

## TDD and verification

Initial public-seam tests failed 8/9 on the starting implementation: pending initial read opened a stream after close; close/scope/logout lacked reader cancellation; dispose did not abort; late snapshot rendered; readers were not released. They pass after implementation. Additional failing tests caught unread error-response bodies and logout waiting for HTTP before stopping the stream.

| Check | Actual result |
| --- | --- |
| `node --test tests/exam-room-lifecycle.test.mjs` | 21 pass, 0 fail; fake clock, no real reconnect waits |
| Related lifecycle/read/parser/format/UI/coordinator tests | 58 pass before the final two added room cases; those final cases also pass in the full suite |
| `npm test` | 542 pass, 0 fail, 0 skip |
| `node --check` on changed shell modules | Passed; syntax checks, not TypeScript checking |
| New `tests/browser/exam-room-lifecycle-smoke.mjs` | Passed at 1440x900, 1024x768, 390x844; 10 keyboard open/close cycles each, fresh snapshot/progress, EOF reconnect and close during delay; 0 page errors |
| Existing browser read-concurrency smoke | Passed at all three viewports, 0 page errors |
| Backend `npm run check` | Passed |
| Backend `npm test` | 328 pass, 0 fail, 47 skip (375 total) |
| Backend `npm run contract` | 4 pass, 0 fail |
| Backend `npm run webtest34:types:check` | Passed: 9 canonical types and 6 legacy aliases |
| Backend `npm run webtest34:content:test` | 3 skip, 0 pass; private inputs unavailable |
| `git diff --check` | Passed |

Browser imports exercise the actual static HTML/module paths and browser MIME handling on the local server. Screenshots are stored outside tracked files at `.git/verification/issue-23/room-{1440,1024,390}.png`; the mobile screenshot was inspected. No CSS/markup changes or claim of screenshot parity against a production baseline. Existing mobile layout issues are outside this ticket.

No TypeScript compiler is configured in frontend. Backend skips do not verify database/private content. CI, live API, production, hosted project-prefix routing and deployment have not been validated by these local tests.

## Standards review

Reviewed the changes from `7ab2f3e` in this session. Resource ownership and cleanup are encapsulated in one ESM module; no dependency, CSS, canonical renderer or backend changes. The shared DOM test fixture was extracted unchanged so #22 and #23 use the same public dashboard seam. Existing source-contract tests were updated for the moved stream code; behavioral checks remain at `mountDashboard`.

No unresolved standards findings. Review is inline, not independent: repo instructions require user permission before spawning subagents.

## Spec review

Checked each #23 criterion against the implementation and tests above. Current 401 still logs out, stale 401 is ignored; EOF/read errors refresh REST then reconnect at the original delay. Unknown events retain REST refresh behavior. No write retries, server rollback, grading/auth policy or event payload changes.

No unresolved implementation findings for #23. Remote issue state is unchanged. Integrated dashboard/Builder lifecycle and broader rollback acceptance continue in #24.

## Rollback

Revert the issue #23 commit as a unit, including module, lifecycle hook, shell integration, test fixture migration and documentation. The starting frontend `7ab2f3e` remains the rollback baseline. No schema/data migration or published content changes.

The staged binary patch is checked with `git apply --reverse --check .git/issue23.patch` before commit; this checks patch reversibility without changing the working tree. It is not a claim that the older baseline has the fixed behavior. Do not use reset/clean or revert the earlier #22 commits.
