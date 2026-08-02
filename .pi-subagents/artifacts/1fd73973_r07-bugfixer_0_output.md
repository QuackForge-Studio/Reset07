**Báo cáo sanity check (read-only — không thay đổi code):**

1. `entities/base.ts` — Lớp nền `DamageableSprite` (HP, damage, hit-flash, knockback, die) + `Telegraph` + `deathBurst` dùng chung cho mọi thực thể.
2. `entities/Player.ts` — K-07: di chuyển gia tốc (accel 1700 > friction 1150 ✓), ngắm chuột/gamepad/touch, vũ khí nhiệt (overheat), dash + i-frames, overdrive, module.
3. `entities/enemies.ts` — `EnemyBase` trừu tượng + 4 loại địch (PatrolDrone, Hunter, ShieldUnit, Detonator) + factory `createEnemy`; AI seek/attack, LOS + pathfinding.
4. `entities/boss.ts` — `CoreGuardian` 3 phase: shield arc, radial burst, summon drone, beam sweep, detonator, arena collapse; hook `BossHooks` (onPhase/onDefeated...).
5. `entities/environment.ts` — Prop nổ (`Explosive` state máy intact→destroyed, fuse cảnh báo), Vehicle/FuelTank/GasPipe/Transformer, `Puddle` dẫn điện, `Uplink` + interactables.
6. `systems/LoopTimer.ts` — State machine 7 phút (CALM→RISING→DANGER→FINAL→RESETTING), thuần logic, không phụ thuộc Phaser.
7. `systems/combat.ts` — Toán sát thương + chain-reaction rules (`ChainTracker`) thuần, không import Phaser, unit-testable.
8. `systems/Pathfinder.ts` — A* trên `CityGrid` + line-of-sight, rate-limited + cache (dùng cho hàng chục địch trên mobile).
9. `systems/SaveSystem.ts` — Save/settings localStorage có version + validate, storage injectable (test được trong Node).
10. `systems/InputState.ts` — Trạng thái input hợp nhất (keyboard/mouse/gamepad/touch); touch push qua bridge.
11. `systems/AudioEngine.ts` — 100% WebAudio tổng hợp: SFX recipe + step-sequencer nhạc theo phase loop; chỉ chơi sau user gesture.
12. `systems/CameraRig.ts` — Camera follow, zoom theo orientation, focus boss, shake, hit-stop, slow-motion (wall-clock, không wedge game).
13. `systems/Effects.ts` — Pool particle/float-text dùng chung, ngân sách co theo `EffectsQuality` (từ SaveSystem).
14. `systems/Explosions.ts` — Hệ nổ 13+ lớp (flash, fireball, shockwave, smoke, scorch...) + chain ignition giới hạn lan truyền.
15. `systems/InputState` + `Player` import `calcDamage` (combat); mọi liên kết import/export khớp — không phát hiện lỗi.