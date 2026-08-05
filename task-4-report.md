## Fix round 1
- Finding: ambush retrigger/reward farming
- Change: Pass the event into `ambushTriggerLine` and block overlap callbacks after `ev.completed` is set.
- Tests: tsc — PASS; vitest — PASS (71)
- Commit: pending
