/**
 * RESET//07 — WorldScene: the loop.
 *
 * Owns the full gameplay cycle: scripted opening → seven-minute run →
 * reset/ending → garage. Wires every system together and pushes HUD state
 * to the React shell through the bridge.
 */

import Phaser from 'phaser';
import { PAL } from '../palette';
import { bus, updateSnapshot, getSnapshot, type DialogueLine, type LoopEndPayload } from '../bridge';
import { audio } from '../systems/AudioEngine';
import { EffectManager } from '../systems/Effects';
import { ExplosionSystem } from '../systems/Explosions';
import { CameraRig } from '../systems/CameraRig';
import { InputManager, resetTouchInput, touchInput } from '../systems/InputState';
import { LoopTimer } from '../systems/LoopTimer';
import { buildCity } from '../world/CityBuilder';
import { districtAt, GATES, TILE, type GateDef } from '../world/cityData';
import { Player, boltDamage } from '../entities/Player';
import { createEnemy, ShieldUnit, type EnemyBase } from '../entities/enemies';
import { CoreGuardian } from '../entities/boss';
import { RescueCapsule, MemoryCrystal, Relay, EvacCapsule, Explosive, type Interactable } from '../entities/environment';
import { DamageableSprite } from '../entities/base';
import { buildLoopPlan, ObjectiveTracker } from '../data/objectives';
import { MEMORY_FLAGS, dialogueById, type DialogueLineDef } from '../data/dialogue';
import { TUTORIALS } from '../data/tutorials';
import { MEMORIES, memoryById } from '../data/memories';
import { MODULE_SOURCES } from '../data/modules';
import { evaluateEndings, type EndingId } from '../data/endings';
import { DISTRICT_CAPS, SPAWN_WEIGHTS, enemyUnlocked, type EnemyKind } from '../data/enemies';
import { saveSystem, type SaveData } from '../systems/SaveSystem';
import { t } from '../data/strings';
import { EXPLOSION_PRESETS } from '../data/fx';
import type { WorldScene as WorldSceneI } from '../types';

const TILE_CENTER = (tx: number, ty: number) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 });

export class WorldScene extends Phaser.Scene implements WorldSceneI {
  fx!: EffectManager;
  explosions!: ExplosionSystem;
  pathfinder!: import('../systems/Pathfinder').Pathfinder;
  rig!: CameraRig;
  inputMgr!: InputManager;
  playerPos = { x: 528, y: 2640 };
  player!: Player;
  objectives!: ObjectiveTracker;
  loopTimer!: LoopTimer;
  save!: SaveData;
  flags = new Set<string>();
  collideWalls!: Phaser.Physics.Arcade.StaticGroup;
  enemyGroup!: Phaser.Physics.Arcade.Group;
  explosiveGroup!: Phaser.Physics.Arcade.Group;
  puddleList: import('../entities/environment').Puddle[] = [];
  lamps: Array<{ pole: import('../entities/environment').DecorativeProp; light: Phaser.GameObjects.Image }> = [];
  coreShell: Phaser.GameObjects.Image | null = null;
  enemyList: EnemyBase[] = [];
  enemyBolts!: Phaser.Physics.Arcade.Group;
  playerBolts!: Phaser.Physics.Arcade.Group;
  explosiveProps: Explosive[] = [];
  interactables: Interactable[] = [];
  boss: CoreGuardian | null = null;
  bossActive = false;
  gates: import('../world/CityBuilder').GateInstance[] = [];
  loopState: 'opening' | 'playing' | 'reset' | 'ending' | 'over' = 'opening';

  // internals
  private openingStep = 0;
  private openingDrone: EnemyBase | null = null;
  private openingDrone2: EnemyBase | null = null;
  private openingDroneDead = false;
  private openingDrone2Dead = false;
  private introDone = false;
  private tutorialDone = new Set<string>();
  private dialogueQueue: DialogueLineDef[] = [];
  private currentDialogue: DialogueLineDef | null = null;
  private dialogueTimer = 0;
  private choicePending = false;
  private currentInteract: Interactable | null = null;
  private interactHold = 0;
  private hudTimer = 0;
  private spawnTimer = 3;
  private ambTimer = 0;
  private stats = { kills: 0, rescues: 0, chains: 0 };
  private newMemories = 0;
  private deathTimer = -1;
  private resetTimer = -1;
  private endingScript: Array<{ at: number; fn: () => void }> = [];
  private endingTime = 0;
  private pendingEnding: EndingId | null = null;
  private unsubs: Array<() => void> = [];
  private flashOverlay!: Phaser.GameObjects.Rectangle;
  private whiteOverlay!: Phaser.GameObjects.Rectangle;
  private sirenTimer = 0;
  private bossTriggered = false;
  private openingVehicleGone = false;
  private spawnData: Array<{ x: number; y: number; kind: string; district: string }> = [];

  constructor() {
    super('world');
  }

  create(): void {
    // ── reset per-instance state (scene.restart() reuses this instance) ──
    this.puddleList.length = 0;
    this.explosiveProps.length = 0;
    this.enemyList.length = 0;
    this.interactables.length = 0;
    this.gates = [];
    this.spawnData = [];
    this.lamps.length = 0;
    this.coreShell = null;
    this.boss = null;
    this.openingDrone = null;
    this.openingDrone2 = null;
    this.openingStep = 1;
    this.openingVehicleGone = false;
    this.openingDroneDead = false;
    this.openingDrone2Dead = false;
    this.introDone = false;
    this.tutorialDone.clear();
    this.dialogueQueue.length = 0;
    this.currentDialogue = null;
    this.dialogueTimer = 0;
    this.choicePending = false;
    this.currentInteract = null;
    this.interactHold = 0;
    this.hudTimer = 0;
    this.spawnTimer = 3;
    this.ambTimer = 0;
    this.stats = { kills: 0, rescues: 0, chains: 0 };
    this.newMemories = 0;
    this.deathTimer = -1;
    this.resetTimer = -1;
    this.endingScript = [];
    this.endingTime = 0;
    this.pendingEnding = null;
    this.sirenTimer = 0;
    this.bossActive = false;
    this.bossTriggered = false;
    this.loopState = 'opening';
    for (const unsubscribe of this.unsubs) unsubscribe();
    this.unsubs = [];
    this.events.off('boss-collapse');

    // ── settings / registry ──
    this.save = saveSystem.load().data;
    this.flags = new Set([...this.save.memories, ...this.save.dialogueSeen, ...this.save.flags]);
    const s = this.save.settings;
    this.registry.set('cameraShake', s.cameraShake);
    this.registry.set('flashIntensity', s.flashIntensity);
    this.registry.set('autoAim', s.autoAim);
    this.registry.set('aimAssist', s.aimAssist);
    this.registry.set('highContrast', s.highContrast);
    this.registry.set('reducedMotion', s.reducedMotion);
    this.registry.set('effectsQuality', s.effectsQuality);
    audio.setVolumes({ master: s.master, music: s.music, sfx: s.sfx, dialogue: s.dialogue });

    // ── services ──
    this.fx = new EffectManager(this, s.effectsQuality);
    this.rig = new CameraRig(this);
    this.rig.shakeEnabled = s.cameraShake !== 'off' && !s.reducedMotion;
    this.explosions = new ExplosionSystem(this, this.fx, {
      onExploded: (x, y, kind) => this.onExploded(x, y, kind),
      damagePlayer: (amount, x, y) => {
        const ddx = this.player.x - x;
        const ddy = this.player.y - y;
        const dist = Math.hypot(ddx, ddy);
        if (dist < 175) {
          const falloff = Math.max(0.4, 1 - dist / 175);
          this.damagePlayer(Math.round(amount * falloff), x, y);
        }
      },
      onIgnite: () => {
        this.stats.chains++;
        this.player.addOverdriveCharge(10);
      },
      onSound: (name) => this.sfx(name),
    });
    this.inputMgr = new InputManager(this);

    // ── world ──
    const built = buildCity(this);
    this.gates = built.gates;
    this.spawnData = built.spawnPoints;
    this.enemyGroup = this.physics.add.group();
    this.explosiveGroup = this.physics.add.group();
    this.enemyBolts = this.physics.add.group();
    this.playerBolts = this.physics.add.group();
    for (const p of this.explosiveProps) this.explosiveGroup.add(p as Phaser.GameObjects.Sprite);

    // ── player (must exist before colliders reference it) ──
    const spawn = TILE_CENTER(16, 82);
    this.playerPos = { ...spawn };
    this.player = new Player(this, spawn.x, spawn.y, this.fx, this.save.modulesEquipped as import('../data/modules').ModuleId[], {
      onFire: (x, y, angle) => this.firePlayerBolt(x, y, angle),
      onDash: () => this.onPlayerDash(),
      onOverdrive: () => this.onOverdrive(),
      onOverdriveEnd: () => this.onOverdriveEnd(),
      onDeath: () => this.onPlayerDeath(),
      onHit: (dmg) => this.onPlayerHit(dmg),
      onWeaponArc: (x, y) => this.arcChain(x, y),
    });

    // ── colliders / overlaps ──
    this.physics.add.collider(this.playerBolts, this.collideWalls, (bolt) => this.boltHitWall(bolt as Phaser.GameObjects.Sprite));
    this.physics.add.collider(this.enemyBolts, this.collideWalls, (bolt) => this.boltHitWall(bolt as Phaser.GameObjects.Sprite));
    this.physics.add.collider(this.player, this.collideWalls);
    this.physics.add.collider(this.enemyGroup, this.collideWalls);
    for (const { gate } of this.gates) {
      const playerGateCollider = this.physics.add.collider(this.player, gate);
      const enemyGateCollider = this.physics.add.collider(this.enemyGroup, gate);
      gate.once('destroy', () => {
        playerGateCollider.destroy();
        enemyGateCollider.destroy();
      });
    }
    this.physics.add.overlap(this.playerBolts, this.enemyGroup, (bolt, enemy) =>
      this.boltHitEnemy(bolt as Phaser.GameObjects.Sprite, enemy as DamageableSprite),
    );
    this.physics.add.overlap(this.enemyBolts, this.player, (_player, bolt) => this.enemyBoltHitPlayer(bolt as Phaser.GameObjects.Sprite));
    // bullets damage explosives: player bolts (the core chain mechanic) + enemy bolts (drones can set off chains)
    this.physics.add.overlap(this.playerBolts, this.explosiveGroup, (bolt, prop) => {
      const b = bolt as Phaser.GameObjects.Sprite;
      if (!b.active || !(prop instanceof Explosive)) return;
      b.destroy();
      prop.damage(8);
      this.fx.spawnSpark(b.x, b.y, PAL.orange, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, 0.15, 0.8);
    });
    this.physics.add.overlap(this.enemyBolts, this.explosiveGroup, (bolt, prop) => {
      const b = bolt as Phaser.GameObjects.Sprite;
      if (!b.active || !(prop instanceof Explosive)) return;
      b.destroy();
      prop.damage(8);
    });

    // gates: pre-open from persistent routes
    for (const { gate, def } of this.gates) {
      if (def.id === 'coreS' && this.save.routes.includes('relayCode')) gate.openGate();
      if (def.id === 'coreW' && this.save.routes.includes('maintenance')) gate.openGate();
      this.explosions.register(gate);
    }

    this.rig.setFollow(this.playerPos);

    // ── objectives + loop ──
    const plan = buildLoopPlan({
      loopsCompleted: this.save.story.loops,
      memories: this.save.memories,
      rescued: this.save.rescued,
      routes: this.save.routes,
      hiddenObjectiveDone: this.save.flags.includes('evacDone'),
    });
    this.objectives = new ObjectiveTracker(plan);
    this.loopTimer = new LoopTimer(undefined, {
      onPhase: (phase) => this.onLoopPhase(phase),
      onSecond: (sec) => {
        if (sec <= 10 && sec > 0 && this.loopState === 'playing') {
          this.sfx('countdown');
          if (sec <= 3) this.rig.addShake(2 + sec);
        }
      },
      onReset: () => this.startResetSequence(),
    });

    // register damageables (the player takes explosion damage via the callback)
    for (const p of this.explosiveProps) this.explosions.register(p);

    // ── overlay rectangles (flashes, whiteout) ──
    this.flashOverlay = this.add.rectangle(0, 0, 0, 0, PAL.cyan, 0).setDepth(400).setScrollFactor(0);
    this.whiteOverlay = this.add.rectangle(0, 0, 0, 0, PAL.white, 0).setDepth(410).setScrollFactor(0);

    // ── bridge listeners ──
    this.unsubs.push(
      bus.on('screen', (sc) => {
        if (sc === 'playing') this.resumeGame();
        if (sc === 'title') this.scene.stop();
      }),
    );
    this.events.once('shutdown', () => {
      for (const u of this.unsubs) u();
      this.unsubs = [];
    });

    // ── initial population + HUD ──
    this.seedDistricts();
    this.pushHud(true);
    updateSnapshot({ screen: 'playing', paused: false });
    bus.emit('screen', 'playing');

    // ── opening script ──
    this.loopState = 'opening';
    this.runOpening();

    // Dev/test-only QA hook. Production bundles do not receive this object.
    if (import.meta.env.DEV || import.meta.env.VITE_E2E === 'true') {
      (window as unknown as Record<string, unknown>).__r07 = {
        scene: this,
        player: this.player,
        touchInput,
        worldToScreen: (wx: number, wy: number) => {
          const cam = this.cameras.main;
          return { x: (wx - cam.scrollX) * cam.zoom, y: (wy - cam.scrollY) * cam.zoom };
        },
        loopState: () => this.loopState,
        timer: () => ({ remaining: this.loopTimer.remaining, phase: this.loopTimer.phase }),
      };
    }
  }

  // ─────────────────────────────────────────────────────────
  // Opening script
  // ─────────────────────────────────────────────────────────

  private runOpening(): void {
    const first = this.save.story.loops === 0;
    if (first) {
      this.queueDialogue('open1', 'open2', 'open3');
      this.openingStep = 1;
    } else {
      if (!this.flags.has('loop2a')) this.queueDialogue('loop2a', 'loop2b');
      // timer runs immediately for later loops
      this.openingStep = 99;
      this.finishOpening();
    }
  }

  private finishOpening(): void {
    this.loopState = 'playing';
    this.introDone = true;
    this.showTutorial('move', true);
    audio.musicStart();
    audio.musicIntensity(1);
  }

  /** Opening beat progression (loop 1). */
  private openingUpdate(): void {
    if (this.loopState !== 'opening') return;
    switch (this.openingStep) {
      case 1: {
        // after intro dialogue → movement tutorial
        if (this.currentDialogue === null && this.dialogueQueue.length === 0) {
          this.openingStep = 2;
          this.showTutorial('move', true);
        }
        break;
      }
      case 2: {
        // spawn the first drone after the player moves a little
        if (this.tutorialDone.has('move') && !this.openingDrone) {
          this.openingDrone = this.spawnEnemyAt('drone', 600, 2550, true); // flies in through the hatch, hovers inside
          this.openingDrone.setAlpha(0);
          this.tweens.add({ targets: this.openingDrone, alpha: 1, duration: 600 });
          this.openingStep = 3;
        }
        break;
      }
      case 3: {
        // drone killed → queue Mara line + spawn drone 2 + vehicle hint
        if (this.openingDroneDead) {
          this.openingDroneDead = false;
          this.openingStep = 4;
          this.queueDialogue('open4');
          this.openingDrone2 = this.spawnEnemyAt('drone', 568, 2696, true); // hovers beside the damaged vehicle
          this.showTutorial('vehicle', false);
        }
        break;
      }
      case 4: {
        // drone 2 dead → small reward
        if (this.openingDrone2Dead) {
          this.openingDrone2Dead = false;
          this.player.addOverdriveCharge(8);
        }
        // vehicle destroyed (blast opens gate) → dash tutorial
        if (this.openingVehicleGone) {
          this.openingStep = 5;
          this.showTutorial('dash', true);
          this.queueDialogue('open5');
          const gate = this.gates.find((g) => g.def.id === 'garage');
          gate?.gate.openGate();
        }
        break;
      }
      case 5: {
        // leave the garage → loop begins
        const d = districtAt(Math.round(this.playerPos.x / TILE), Math.round(this.playerPos.y / TILE));
        if (d.id !== 'garage') {
          this.openingStep = 99;
          this.finishOpening();
          this.queueDialogue('open6');
        }
        break;
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  // Update
  // ─────────────────────────────────────────────────────────

  update(_time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    this.rig.update(dt);
    this.fx.update(dt);

    if (this.loopState === 'opening') {
      this.openingUpdate();
    }

    const playing = this.loopState === 'playing' || this.loopState === 'opening';

    if (playing) {
      const input = this.inputMgr.sample();
      this.playerPos.x = this.player.x;
      this.playerPos.y = this.player.y;

      // pause
      if (input.pausePressed && this.loopState === 'playing') {
        this.pauseGame();
        return;
      }

      if (input.dashPressed) this.player.dash(input.moveX, input.moveY);
      if (input.overdrivePressed) this.player.tryOverdrive();
      this.player.update(dt, input, this.enemyList);

      // enemies
      for (const e of [...this.enemyList]) {
        if (!e.active) continue;
        e.update(dt);
      }
      // boss
      this.boss?.update(dt);
      this.checkBossTrigger();

      // enemy bolts
      for (const b of this.enemyBolts.getChildren() as Phaser.GameObjects.Sprite[]) {
        b.setData('life', (b.getData('life') ?? 0) - dt);
        if (b.getData('life') <= 0) b.destroy();
        else if (b.x < 0 || b.x > 4608 || b.y < 0 || b.y > 3328) b.destroy();
      }
      // player bolts (life + bounds)
      for (const b of this.playerBolts.getChildren() as Phaser.GameObjects.Sprite[]) {
        b.setData('life', (b.getData('life') ?? 0) - dt);
        if (b.getData('life') <= 0 || b.x < 0 || b.x > 4608 || b.y < 0 || b.y > 3328) b.destroy();
      }

      // dialogue skip: pressing E during a line advances it
      if (input.interactPressed && this.currentDialogue && !this.choicePending) {
        this.dialogueTimer = 0;
      }

      // interact prompt
      this.updateInteraction(input);

      // tutorial proximity
      this.updateTutorials();

      // loop timer (only after intro)
      if (this.introDone) this.loopTimer.update(dt);

      // dialogue
      this.updateDialogue(dt);

      // ambient spawner
      this.updateSpawner(dt);
    }

    if (this.loopState === 'reset') {
      this.updateReset(dt);
    }
    if (this.loopState === 'ending') {
      this.updateEnding(dt);
    }
    if (this.loopState === 'over') {
      // world idle behind the garage overlay — keep ambient alive
      this.updateAmbient(dt);
    }

    // props updates
    for (const p of this.explosiveProps) if (p.active) p.update(dt);
    for (const i of this.interactables) {
      const upd = (i as unknown as { update?: (dt: number) => void }).update;
      if (upd) upd.call(i, dt);
    }
    for (const g of this.gates) if (g.gate.active) g.gate.update(dt);

    this.updateAmbient(dt);
    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.1;
      this.pushHud(false);
    }
  }

  // ─────────────────────────────────────────────────────────
  // Combat plumbing
  // ─────────────────────────────────────────────────────────

  sfx(name: import('../systems/AudioEngine').SfxName): void {
    audio.play(name);
  }

  firePlayerBolt(x: number, y: number, angle: number): void {
    const b = this.physics.add.sprite(x, y, 'bullet');
    this.playerBolts.add(b); // add BEFORE setting velocity (group add resets the body)
    b.setRotation(angle);
    b.setDepth(70);
    const body = b.body as Phaser.Physics.Arcade.Body;
    body.setCircle(4, 8, 1);
    body.setVelocity(Math.cos(angle) * 640, Math.sin(angle) * 640);
    b.setData('life', 0.7);
    // muzzle flash
    const m = this.add.image(x, y, 'fx-muzzle');
    m.setRotation(angle);
    m.setDepth(71);
    m.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: m, alpha: 0, scale: 0.4, duration: 60, onComplete: () => m.destroy() });
  }

  private boltHitWall(bolt: Phaser.GameObjects.Sprite): void {
    this.fx.spawnSpark(bolt.x, bolt.y, PAL.cyan, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, 0.12, 0.7);
    bolt.destroy();
  }

  private boltHitEnemy(bolt: Phaser.GameObjects.Sprite, enemy: DamageableSprite): void {
    if (!enemy.alive || !bolt.active) return;
    bolt.destroy();
    // shield check
    if (enemy instanceof ShieldUnit) {
      const a = Math.atan2(bolt.y - enemy.y, bolt.x - enemy.x);
      if (enemy.blocksAngle(a)) {
        this.fx.spawnSpark(bolt.x, bolt.y, PAL.cyan, 0, 0, 0.2, 1);
        this.sfx('impact');
        return;
      }
    }
    if (enemy instanceof CoreGuardian) {
      const a = Math.atan2(bolt.y - enemy.y, bolt.x - enemy.x);
      if (enemy.blocksAngle(a)) {
        this.fx.spawnSpark(bolt.x, bolt.y, PAL.magenta, 0, 0, 0.2, 1);
        this.sfx('impact');
        return;
      }
      if (this.boss?.phase === 3 && enemy.coreTarget) {
        this.boss.damageCore(boltDamage(this.player.overdriveActive, this.player.overdriveActive));
        return;
      }
    }
    const dmg = boltDamage(this.player.overdriveActive, this.player.overdriveActive);
    enemy.damage(dmg);
    this.player.onBoltHit(enemy);
    // knockback
    const a = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
    enemy.knockback(Math.cos(a) * 120, Math.sin(a) * 120);
    this.fx.spawnSpark(bolt.x, bolt.y, PAL.white, (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 120, 0.15, 0.8);
    this.rig.addShake(1);
    if (this.player.overdriveActive) {
      this.fx.spawnGlow(bolt.x, bolt.y, PAL.cyan, 0.6, 0.2);
    }
  }

  /** Arc module: chained electricity between nearby enemies. */
  private arcChain(x: number, y: number): void {
    const targets = this.enemyList.filter((e) => e.alive && (e.x - x) ** 2 + (e.y - y) ** 2 < 110 * 110).slice(0, 2);
    for (const tg of targets) {
      this.fx.electricArc(x, y, tg.x, tg.y, PAL.cyan);
      tg.damage(6);
      this.sfx('spark');
    }
  }

  private enemyBoltHitPlayer(bolt: Phaser.GameObjects.Sprite): void {
    if (!bolt.active) return;
    bolt.destroy();
    const dmg = (bolt.getData('dmg') as number) ?? 8;
    this.damagePlayer(dmg, bolt.x, bolt.y);
  }

  damagePlayer(amount: number, x: number, y: number): void {
    if (this.loopState !== 'playing' && this.loopState !== 'opening') return;
    if (this.player.invulnerable) return;
    this.player.damage(amount);
    // knockback away from source
    const a = Math.atan2(this.player.y - y, this.player.x - x);
    this.player.knockback(Math.cos(a) * 240, Math.sin(a) * 240);
  }

  private onPlayerHit(dmg: number): void {
    this.sfx('playerDamage');
    this.rig.addShake(4, 100);
    this.rig.hitStop(40);
    this.fx.spawnGlow(this.player.x, this.player.y, PAL.danger, 1.2, 0.25);
    this.flashOverlay.setFillStyle(PAL.danger, 0.18);
    this.flashOverlay.setSize(this.scale.width, this.scale.height);
    this.flashOverlay.setPosition(this.scale.width / 2, this.scale.height / 2);
    this.tweens.add({ targets: this.flashOverlay, alpha: 0, duration: 300, onComplete: () => this.flashOverlay.setAlpha(0) });
    if (this.player.hp <= 0) return;
    void dmg;
  }

  private onPlayerDash(): void {
    this.sfx('dash');
    // breach module: dash damages breakables in a small radius
    if (this.player.modules.includes('breach')) {
      const px = this.player.x;
      const py = this.player.y;
      for (const p of this.explosiveProps) {
        if (!p.alive) continue;
        if ((p.x - px) ** 2 + (p.y - py) ** 2 < 55 * 55) p.damage(30);
      }
      for (const g of this.gates) {
        if (g.gate.isOpen || !g.gate.active) continue;
        if ((g.gate.x - px) ** 2 + (g.gate.y - py) ** 2 < 90 * 90) g.gate.damage(35);
      }
    }
  }

  private onOverdrive(): void {
    this.sfx('overdrive');
    this.rig.slowMo(0.45, 1200);
    this.rig.addShake(6, 200);
    this.flashOverlay.setFillStyle(PAL.cyan, 0.25);
    this.flashOverlay.setSize(this.scale.width, this.scale.height);
    this.flashOverlay.setPosition(this.scale.width / 2, this.scale.height / 2);
    this.tweens.add({ targets: this.flashOverlay, alpha: 0, duration: 400, onComplete: () => this.flashOverlay.setAlpha(0) });
    const pulseR = this.player.modules.includes('pulse') ? 270 : 170;
    const pulseDmg = this.player.modules.includes('pulse') ? 45 : 32;
    void pulseDmg;
    this.explosions.explode('electric', this.player.x, this.player.y, {});
    // pulse: damage + mark enemies
    for (const e of [...this.enemyList]) {
      if (!e.alive) continue;
      const d2 = (e.x - this.player.x) ** 2 + (e.y - this.player.y) ** 2;
      if (d2 < pulseR * pulseR) {
        e.mark();
        e.damage(pulseDmg);
        const a = Math.atan2(e.y - this.player.y, e.x - this.player.x);
        e.knockback(Math.cos(a) * 320, Math.sin(a) * 320);
      }
    }
    this.player.addOverdriveCharge(0); // keep at 0 while active
  }

  private onOverdriveEnd(): void {
    this.sfx('dashReady');
  }

  private onExploded(x: number, y: number, kind: import('../data/fx').ExplosionKind): void {
    const preset = EXPLOSION_PRESETS[kind];
    const shakeSetting = this.registry.get('cameraShake') as string;
    if (shakeSetting !== 'off' && !this.registry.get('reducedMotion')) {
      const mag = shakeSetting === 'low' ? preset.shake * 0.4 : preset.shake;
      this.rig.addShake(mag, 90);
    }
    if (preset.hitStop > 0) this.rig.hitStop(preset.hitStop);
    if (preset.slowMo && !this.registry.get('reducedMotion')) {
      this.rig.slowMo(preset.slowMo.scale, preset.slowMo.dur * 1000);
    }
    void x;
    void y;
  }

  private onPlayerDeath(): void {
    if (this.loopState !== 'playing' && this.loopState !== 'opening') return;
    this.loopState = 'reset';
    this.save.stats.deaths++;
    this.saveNow();
    this.sfx('playerDamage');
    this.sfx('reset');
    this.rig.slowMo(0.3, 900);
    this.fx.spawnGlow(this.player.x, this.player.y, PAL.danger, 2.5, 0.5);
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      this.fx.spawnSpark(this.player.x, this.player.y, i % 2 ? PAL.cyan : PAL.danger, Math.cos(a) * 260, Math.sin(a) * 260, 0.7, 1.2);
    }
    this.player.setVisible(false);
    this.player.alive = false;
    this.deathTimer = 2.2;
    this.resetTimer = -1;
  }

  // ─────────────────────────────────────────────────────────
  // Loop lifecycle
  // ─────────────────────────────────────────────────────────

  private onLoopPhase(phase: import('../systems/LoopTimer').LoopPhase): void {
    const music =
      phase === 'RESETTING' || phase === 'DONE'
        ? 0
        : phase === 'FINAL10' || phase === 'FINAL'
          ? 4
          : phase === 'DANGER'
            ? 3
            : phase === 'RISING'
              ? 2
              : 1;
    if (this.bossActive) audio.musicIntensity(4);
    else audio.musicIntensity(music);
    if (phase === 'DANGER') {
      this.sfx('siren');
      this.sirenTimer = 1;
    }
    if (phase === 'FINAL') {
      this.sfx('siren');
      // routes close: any unopened side gates slam shut
      this.tweens.add({ targets: this.player, scale: 1.1, duration: 200, yoyo: true });
    }
    if (phase === 'FINAL10') {
      bus.emit('toast', { text: t('loop.final10', { n: 10 }), tone: 'bad' });
    }
  }

  startResetSequence(): void {
    if (this.loopState === 'reset') return;
    this.loopState = 'reset';
    this.save.story.loops++;
    this.resetTimer = 0;
    this.sfx('reset');
    this.rig.slowMo(0.45, 800);
    this.rig.addShake(10, 500);
  }

  private updateReset(dt: number): void {
    if (this.deathTimer > 0) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this.finishReset();
      return;
    }
    if (this.resetTimer >= 0) {
      this.resetTimer += dt;
      const t = this.resetTimer;
      // converging light streaks
      if (Math.random() < 0.4) {
        const a = Math.random() * Math.PI * 2;
        const r = 500 + Math.random() * 400;
        this.fx.spawnSpark(
          this.player.x + Math.cos(a) * r,
          this.player.y + Math.sin(a) * r,
          Math.random() < 0.5 ? PAL.cyan : PAL.magenta,
          -Math.cos(a) * 500,
          -Math.sin(a) * 500,
          0.5,
          1.2,
        );
      }
      if (t > 1.4 && this.flashOverlay.alpha < 0.8) {
        this.flashOverlay.setFillStyle(PAL.white, Math.min(0.9, t * 0.4));
        this.flashOverlay.setSize(this.scale.width, this.scale.height);
        this.flashOverlay.setPosition(this.scale.width / 2, this.scale.height / 2);
        this.flashOverlay.setAlpha(Math.min(0.9, (t - 1.4) * 0.7));
      }
      if (t >= 2.6) {
        this.finishReset();
      }
    }
  }

  private finishReset(): void {
    // persist + emit summary → React shows garage
    this.save.stats.kills += this.stats.kills;
    this.save.stats.rescues += this.stats.rescues;
    this.save.stats.chains += this.stats.chains;
    this.save.stats.totalTime += this.loopTimer.duration - this.loopTimer.remaining;
    this.save.story.bestTime = Math.max(this.save.story.bestTime, this.loopTimer.duration - this.loopTimer.remaining);
    this.save.lastLoop = {
      loop: this.save.story.loops,
      survived: Math.round(this.loopTimer.duration - this.loopTimer.remaining),
      kills: this.stats.kills,
      rescues: this.stats.rescues,
      chains: this.stats.chains,
      outcome: 'reset',
    };
    this.saveNow();
    this.loopState = 'over';
    const payload: LoopEndPayload = {
      outcome: 'reset',
      loop: this.save.story.loops,
      survived: Math.round(this.loopTimer.duration - this.loopTimer.remaining),
      kills: this.stats.kills,
      rescues: this.stats.rescues,
      chains: this.stats.chains,
      newMemoryCount: this.newMemories,
    };
    this.cameras.main.fadeOut(400, 7, 10, 15);
    this.time.delayedCall(450, () => {
      bus.emit('loopEnd', payload);
      updateSnapshot({ screen: 'garage', paused: true });
    });
    audio.musicIntensity(0);
  }

  startLoop(): void {
    this.scene.restart();
  }

  pauseGame(): void {
    if (this.loopState !== 'playing') return;
    resetTouchInput();
    this.loopTimer.pause();
    updateSnapshot({ paused: true });
    bus.emit('screen', 'paused');
    audio.duck(1);
    this.scene.pause();
  }

  resumeGame(): void {
    if (this.loopState !== 'playing' && this.loopState !== 'opening') return;
    this.scene.resume();
    this.loopTimer.resume();
    updateSnapshot({ paused: false });
    audio.duck(0);
  }

  restartLoop(): void {
    this.saveNow();
    this.scene.resume();
    this.scene.restart();
  }

  quitToTitle(): void {
    this.saveNow();
    this.scene.resume();
    audio.musicStop();
    bus.emit('screen', 'title');
    this.scene.stop();
  }

  // ─────────────────────────────────────────────────────────
  // World events (called by entities)
  // ─────────────────────────────────────────────────────────

  districtName(tx: number, ty: number): string {
    return districtAt(tx, ty).id;
  }

  openDoor(gateId: string): void {
    this.pathfinder.setDoorOpen(gateId, true);
    // remove the physical colliders covering this gate's tiles so entities can pass
    const def = GATES.find((g) => g.id === gateId);
    if (!def) return;
    const gx1 = def.rect.x1 * TILE;
    const gy1 = def.rect.y1 * TILE;
    const gx2 = (def.rect.x2 + 1) * TILE;
    const gy2 = (def.rect.y2 + 1) * TILE;
    for (const child of this.collideWalls.getChildren()) {
      const b = (child as Phaser.GameObjects.Zone).body as Phaser.Physics.Arcade.StaticBody | undefined;
      if (!b) continue;
      const ox1 = b.x;
      const oy1 = b.y;
      const ox2 = b.x + b.width;
      const oy2 = b.y + b.height;
      if (ox1 < gx2 && ox2 > gx1 && oy1 < gy2 && oy2 > gy1) {
        (child as Phaser.GameObjects.Zone).destroy();
      }
    }
  }

  onGateOpened(def: GateDef): void {
    this.pathfinder.invalidate();
    bus.emit('toast', { text: `${def.label} OPEN`, tone: 'good' });
    if (def.id === 'coreN' || def.id === 'coreS' || def.id === 'coreW') {
      this.save.routes = [...new Set([...this.save.routes, `gate:${def.id}`])];
      this.saveNow();
    }
  }

  onTutorialVehicleDestroyed(): void {
    this.openingVehicleGone = true;
  }

  onRescued(id: string): void {
    this.stats.rescues++;
    this.save.rescued = [...new Set([...this.save.rescued, id])];
    const moduleId = MODULE_SOURCES[id];
    if (moduleId && !this.save.modulesOwned.includes(moduleId)) {
      this.save.modulesOwned.push(moduleId);
      bus.emit('toast', { text: `MODULE ACQUIRED: ${moduleId.toUpperCase()}`, tone: 'good' });
    }
    if (id === 'eli') {
      this.grantMemory('eliChip');
      this.flags.add('rescue:eli');
      this.queueDialogue('eliRescue');
    } else if (id === 'capsuleA') {
      this.objectives.complete('rescueA');
      this.sfx('objective');
      bus.emit('toast', { text: t('obj.rescueCapsuleA') + ' ✓', tone: 'good' });
    }
    if (id === 'capsuleA') this.player.addOverdriveCharge(20);
    else this.player.addOverdriveCharge(25);
    this.saveNow();
  }

  onEvacOpened(_id: string): void {
    const evacCount = ((this.registry.get('evacCount') as number) ?? 0) + 1;
    this.registry.set('evacCount', evacCount);
    this.sfx('objective');
    if (evacCount >= 3 && !this.save.flags.includes('evacDone')) {
      this.save.flags.push('evacDone');
      this.flags.add('evacDone');
      this.saveNow();
      bus.emit('toast', { text: 'EVACUATION ROUTE SECURED', tone: 'good' });
      this.queueDialogue('evacHint');
      this.objectives.complete('hiddenCapsules');
      const moduleId = MODULE_SOURCES.hidden;
      if (moduleId && !this.save.modulesOwned.includes(moduleId)) {
        this.save.modulesOwned.push(moduleId);
        bus.emit('toast', { text: `MODULE ACQUIRED: ${moduleId.toUpperCase()}`, tone: 'good' });
      }
    } else {
      bus.emit('toast', { text: `EVAC CAPSULE OPEN (${evacCount}/3)`, tone: 'info' });
    }
  }

  onMemoryCollected(id: string): boolean {
    if (this.save.memories.includes(id)) return false;
    // maraOrigin is locked behind the decommission file
    if (id === 'maraOrigin' && !this.flags.has('decommission')) {
      bus.emit('toast', { text: 'SIGNAL LOCKED — DECOMMISSION FILE REQUIRED', tone: 'bad' });
      return false;
    }
    this.grantMemory(id);
    return true;
  }

  private grantMemory(id: string): void {
    const mem = memoryById(id);
    if (!mem) return;
    this.save.memories.push(id);
    this.flags.add(id);
    this.newMemories++;
    const flag = MEMORY_FLAGS[id];
    if (flag) this.flags.add(flag);
    this.player.addOverdriveCharge(30);
    this.sfx('memory');
    bus.emit('toast', { text: `MEMORY FRAGMENT: ${mem.name}`, tone: 'memory' });
    // route unlocks
    if (mem.unlockRoute && !this.save.routes.includes(mem.unlockRoute)) {
      this.save.routes.push(mem.unlockRoute);
      this.flags.add(mem.unlockRoute);
      this.saveNow();
      if (mem.unlockRoute === 'relayCode') {
        bus.emit('toast', { text: 'RELAY BYPASS CODE DECRYPTED — SOUTH GATE OPEN', tone: 'good' });
        const gate = this.gates.find((g) => g.def.id === 'coreS');
        gate?.gate.openGate();
      }
      if (mem.unlockRoute === 'maintenance') {
        bus.emit('toast', { text: 'MAINTENANCE PASSAGE UNLOCKED — WEST GATE OPEN', tone: 'good' });
        const gate = this.gates.find((g) => g.def.id === 'coreW');
        gate?.gate.openGate();
      }
      if (mem.unlockRoute === 'tram') {
        bus.emit('toast', { text: 'TRAM ROUTE SIGNALED — ROOF CROSSING OPEN', tone: 'good' });
        this.events.emit('tram-open');
      }
    }
    if (mem.unlockDialogue) this.flags.add(mem.unlockDialogue);
    // story dialogue triggers
    if (id === 'serviceGrid' && !this.flags.has('gridChallengeShown')) {
      this.flags.add('gridChallengeShown');
      this.queueDialogue('gridChallenge');
    }
    if (id === 'decommission' && !this.flags.has('decommissionShown')) {
      this.flags.add('decommissionShown');
      this.queueDialogue('decommissionFound', 'evacHint');
    }
    if (id === 'maraOrigin' && !this.flags.has('maraOriginShown')) {
      this.flags.add('maraOriginShown');
      this.queueDialogue('maraOrigin');
    }
    this.objectives.complete(`memory:${id}`);
    this.saveNow();
  }

  onRelayStabilized(): void {
    this.objectives.complete('stabilizeRelay');
    this.sfx('objective');
    bus.emit('toast', { text: 'RELAY STABILIZED — CORE GATE OPEN', tone: 'good' });
    const gate = this.gates.find((g) => g.def.id === 'coreN');
    gate?.gate.openGate();
    this.queueDialogue('relayDone');
    this.saveNow();
  }

  onUplinkDestroyed(): void {
    this.objectives.complete('destroyUplink');
    this.sfx('objective');
    bus.emit('toast', { text: 'UPLINK DESTROYED — SHIELDS DOWN CITYWIDE', tone: 'good' });
    const gate = this.gates.find((g) => g.def.id === 'coreN');
    gate?.gate.openGate();
    this.queueDialogue('tr2');
    this.saveNow();
  }

  // ─────────────────────────────────────────────────────────
  // Dialogue
  // ─────────────────────────────────────────────────────────

  queueDialogue(...ids: string[]): void {
    for (const id of ids) {
      const def = dialogueById(id);
      if (!def) continue;
      if (def.once && this.flags.has(def.id)) continue;
      if (def.requiresFlag && !this.flags.has(def.requiresFlag)) continue;
      if (def.setFlag && this.flags.has(def.id)) continue;
      this.dialogueQueue.push(def);
    }
    this.processDialogue();
  }

  private processDialogue(): void {
    if (this.currentDialogue || this.choicePending || this.dialogueQueue.length === 0) return;
    const def = this.dialogueQueue.shift()!;
    this.currentDialogue = def;
    this.flags.add(def.id);
    this.save.dialogueSeen = [...new Set([...this.save.dialogueSeen, def.id])];
    if (def.setFlag) {
      this.flags.add(def.setFlag);
      this.save.flags = [...new Set([...this.save.flags, def.setFlag])];
      this.saveNow();
      this.onFlagSet(def.setFlag);
    }
    audio.dialogueBlip(def.speaker);
    audio.duck(0.6);
    const line: DialogueLine = { speaker: def.speaker, text: def.text };
    if (def.choice) {
      line.choice = def.choice;
      this.choicePending = true;
      this.dialogueTimer = 0;
    } else {
      this.dialogueTimer = Math.max(1.8, 1.1 + def.text.length * 0.032);
    }
    bus.emit('dialogue', line);
  }

  private onFlagSet(flag: string): void {
    // challenge flags feed ending evaluation
    void flag;
  }

  chooseDialogue(choice: 'a' | 'b'): void {
    const def = this.currentDialogue;
    if (!def || !def.choice) return;
    if (choice === 'b' && def.choice.lockB) {
      bus.emit('toast', { text: def.choice.lockBHint ?? 'LOCKED', tone: 'bad' });
      return;
    }
    this.choicePending = false;
    // follow-up lines
    if (def.id === 'gridChallenge' && choice === 'a') {
      this.queueDialogue('maraAfterChallenge');
    }
    if (def.id === 'decommissionFound' && choice === 'a') {
      this.queueDialogue('maraConfession');
    }
    if (def.id === 'guardianChallenge' && choice === 'a') {
      this.flags.add('guardianAccepted');
    }
    this.dialogueTimer = 0.4;
    bus.emit('dialogue', null);
    this.saveNow();
  }

  private updateDialogue(dt: number): void {
    if (!this.currentDialogue) return;
    if (this.choicePending) return;
    this.dialogueTimer -= dt;
    if (this.dialogueTimer <= 0) {
      this.currentDialogue = null;
      audio.duck(0);
      bus.emit('dialogue', null);
      this.processDialogue();
    }
  }

  get dialogueBusy(): boolean {
    return this.currentDialogue !== null || this.choicePending || this.dialogueQueue.length > 0;
  }

  // ─────────────────────────────────────────────────────────
  // Interaction
  // ─────────────────────────────────────────────────────────

  private updateInteraction(input: import('../systems/InputState').InputState): void {
    // find nearest interactable
    let best: Interactable | null = null;
    let bd = 62 * 62;
    for (const i of this.interactables) {
      if (!i.enabled) continue;
      const dx = i.x - this.player.x;
      const dy = i.y - this.player.y;
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    const changed = best !== this.currentInteract;
    this.currentInteract = best;

    if (best) {
      const label = this.interactLabel(best);
      if (changed) {
        bus.emit('interact', { label, kind: best.kind });
      }
      if (input.interactPressed || (best.kind === 'hold' && input.interactHeld)) {
        // press or hold
        if (best.kind === 'press') {
          best.onInteract();
          return;
        }
        const holdTotal = best.holdTime * (this.player.modules.includes('rescue') ? 0.6 : 1);
        this.interactHold += 0.016;
        if (this.interactHold >= holdTotal) {
          this.interactHold = 0;
          best.onInteract();
        }
        bus.emit('interact', { label, kind: best.kind, progress: Math.min(1, this.interactHold / holdTotal) });
      } else {
        this.interactHold = Math.max(0, this.interactHold - 0.03);
        if (this.interactHold > 0) {
          const holdTotal = best.holdTime * (this.player.modules.includes('rescue') ? 0.6 : 1);
          bus.emit('interact', { label, kind: best.kind, progress: Math.min(1, this.interactHold / holdTotal) });
        }
      }
    } else if (changed) {
      this.interactHold = 0;
      bus.emit('interact', null);
    }
  }

  private interactLabel(i: Interactable): string {
    if (i instanceof RescueCapsule) return 'OPEN CAPSULE';
    if (i instanceof MemoryCrystal) return 'RECOVER MEMORY';
    if (i instanceof Relay) {
      return i.stageCount === 0 ? 'STABILIZE RELAY (1/2)' : 'STABILIZE RELAY (2/2)';
    }
    if (i instanceof EvacCapsule) return 'OPEN EVAC CAPSULE';
    return 'INTERACT';
  }

  // ─────────────────────────────────────────────────────────
  // Tutorials
  // ─────────────────────────────────────────────────────────

  private showTutorial(id: string, _force: boolean): void {
    const def = TUTORIALS.find((t) => t.id === id);
    if (!def) return;
    if (this.save.tutorialsDone.includes(id)) {
      // already learned in a past loop — mark for script flow but don't re-teach
      this.tutorialDone.add(id);
      return;
    }
    if (this.tutorialDone.has(id)) return;
    this.tutorialDone.add(id);
    this.save.tutorialsDone.push(id);
    const controlKey = def.control === 'overdrive' ? 'od' : (def.control ?? '');
    const text = def.control ? t(def.textKey, { [controlKey]: this.inputMgr.label(def.control) }) : t(def.textKey);
    bus.emit('toast', { text, tone: 'info' });
    this.saveNow();
  }

  private updateTutorials(): void {
    const p = this.player;
    for (const def of TUTORIALS) {
      if (def.trigger !== 'proximity') continue;
      if (this.save.tutorialsDone.includes(def.id)) continue;
      if (this.tutorialDone.has(def.id)) continue;
      if (def.requireFlag && !this.flags.has(def.requireFlag)) continue;
      if (def.targetId === 'spawn-shield' && this.enemyList.length && this.enemyList[0]) {
        // only when a shield unit is near
        const shield = this.enemyList.find((e) => e.kind === 'shield' && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < (def.radius ?? 300) ** 2);
        if (!shield) continue;
      } else if (def.targetId === 'spawn-detonator') {
        const det = this.enemyList.find((e) => e.kind === 'detonator' && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < (def.radius ?? 300) ** 2);
        if (!det) continue;
      } else if (def.targetId) {
        // proximity to an interactable or prop tile
        let found = false;
        for (const i of this.interactables) {
          if (i.intId === def.targetId && (i.x - p.x) ** 2 + (i.y - p.y) ** 2 < (def.radius ?? 200) ** 2) found = true;
        }
        const mem = MEMORIES.find((m) => m.id === def.targetId);
        if (mem) {
          const mx = mem.tile[0] * TILE + TILE / 2;
          const my = mem.tile[1] * TILE + TILE / 2;
          if ((mx - p.x) ** 2 + (my - p.y) ** 2 < (def.radius ?? 200) ** 2) found = true;
        }
        if (!found) continue;
      }
      this.showTutorial(def.id, true);
    }
  }

  // ─────────────────────────────────────────────────────────
  // Spawning
  // ─────────────────────────────────────────────────────────

  spawnEnemyAt(kind: EnemyKind, x: number, y: number, training = false): EnemyBase {
    const e = createEnemy(
      this,
      kind,
      x,
      y,
      this.playerPos,
      {
        onDeath: (enemy, byExplosion) => {
          this.enemyList = this.enemyList.filter((n) => n !== enemy);
          this.explosions.unregister(enemy);
          if (this.loopState === 'playing' || this.loopState === 'opening') {
            this.stats.kills++;
            this.player.addOverdriveCharge(byExplosion ? 6 : 4);
          }
          if (enemy === this.openingDrone) this.openingDroneDead = true;
          if (enemy === this.openingDrone2) this.openingDrone2Dead = true;
        },
        onPlayerHit: (dmg) => {
          if (e.alive) this.damagePlayer(dmg, e.x, e.y);
        },
        onShieldStun: () => this.sfx('explosionElectric'),
      },
      training,
    );
    this.enemyList.push(e);
    this.enemyGroup.add(e);
    this.explosions.register(e);
    return e;
  }

  private seedDistricts(): void {
    if (this.save.story.loops === 0) return; // opening script handles loop 1
    const count = this.save.story.loops >= 2 ? 2 : 1;
    const spawns = this.spawnPointsByDistrict();
    for (const points of spawns.values()) {
      for (let i = 0; i < count; i++) {
        const pt = points[i % points.length];
        if (!pt) continue;
        const kinds = ['drone', 'drone', 'hunter'] as EnemyKind[];
        const kind = kinds[i % kinds.length];
        if (!enemyUnlocked(kind, 1, this.save.story.loops)) continue;
        this.spawnEnemyAt(kind, pt.x, pt.y);
      }
    }
  }

  private spawnPointsByDistrict(): Map<string, Array<{ x: number; y: number }>> {
    const map = new Map<string, Array<{ x: number; y: number }>>();
    for (const s of this.spawnData) {
      if (!map.has(s.district)) map.set(s.district, []);
      map.get(s.district)!.push({ x: s.x, y: s.y });
    }
    return map;
  }

  private updateSpawner(dt: number): void {
    if (this.loopState !== 'playing') return;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = 2.6;
    const phaseIdx =
      this.loopTimer.phase === 'CALM' ? 0 : this.loopTimer.phase === 'RISING' ? 1 : this.loopTimer.phase === 'DANGER' ? 2 : 3;
    const pts = this.spawnData;
    // count per district
    const counts = new Map<string, number>();
    for (const e of this.enemyList) {
      const d = districtAt(Math.round(e.x / TILE), Math.round(e.y / TILE)).id;
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    for (const [district, cap] of Object.entries(DISTRICT_CAPS)) {
      const cur = counts.get(district) ?? 0;
      if (cur >= cap[phaseIdx]) continue;
      const candidates = pts.filter((p) => p.district === district);
      if (!candidates.length) continue;
      // weighted pick by kind
      const weights = SPAWN_WEIGHTS[district] ?? SPAWN_WEIGHTS.service;
      const available = (Object.keys(weights) as EnemyKind[]).filter((k) => enemyUnlocked(k, phaseIdx, this.save.story.loops));
      const pick = available[Math.floor(Math.random() * available.length)] ?? 'drone';
      const pt = candidates[Math.floor(Math.random() * candidates.length)];
      // don't spawn inside the core arena while the boss is active
      const d = districtAt(Math.round(pt.x / TILE), Math.round(pt.y / TILE)).id;
      if (d === 'core' && this.bossActive) continue;
      this.spawnEnemyAt(pick, pt.x, pt.y);
    }
  }

  // ─────────────────────────────────────────────────────────
  // Boss
  // ─────────────────────────────────────────────────────────

  private checkBossTrigger(): void {
    if (this.bossActive || this.bossTriggered) return;
    if (this.loopState !== 'playing') return;
    const d = districtAt(Math.round(this.playerPos.x / TILE), Math.round(this.playerPos.y / TILE));
    if (d.id !== 'core') return;
    this.bossTriggered = true;
    this.bossActive = true;
    this.objectives.complete('enterCore');
    this.sfx('bossAttack');
    audio.musicIntensity(4);
    // spawn guardian
    const center = TILE_CENTER(96, 52);
    this.boss = new CoreGuardian(this, center.x, center.y, {
      onPhase: (phase) => {
        if (phase === 3) this.queueDialogue('coreP3', 'coreP3b');
      },
      onDefeated: () => this.onBossDefeated(),
      onPlayerHit: (dmg) => this.damagePlayer(dmg, this.boss!.x, this.boss!.y),
      onSummon: (e) => {
        this.enemyList.push(e as EnemyBase);
        this.enemyGroup.add(e as Phaser.GameObjects.Sprite);
        this.explosions.register(e);
      },
      onRemoveSummon: (e) => {
        this.enemyList = this.enemyList.filter((n) => n !== e);
        this.explosions.unregister(e);
      },
    });
    this.enemyGroup.add(this.boss);
    this.explosions.register(this.boss);
    this.rig.focusOn(center.x, center.y, 1.05);
    this.queueDialogue('core1', 'core2', 'guardianChallenge');
    this.time.delayedCall(2500, () => this.rig.clearFocus());
    this.events.on('boss-collapse', () => this.collapseArenaWalls());
  }

  private collapseArenaWalls(): void {
    // visual collapse: rubble rings around the arena + shake + slow-mo
    this.rig.addShake(10, 700);
    this.rig.slowMo(0.5, 500);
    this.sfx('explosionMed');
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const x = 96 * TILE + Math.cos(a) * 480;
      const y = 52 * TILE + Math.sin(a) * 300;
      this.time.delayedCall(i * 90, () => {
        this.fx.spawnSmoke(x, y, 1.4, 1.6, -50);
        this.fx.spawnDebris(x, y, PAL.metalHi, Math.cos(a) * 120, Math.sin(a) * 120 - 60, 1.2);
        this.fx.spawnGlow(x, y, PAL.orange, 1, 0.3);
      });
    }
    const ring = this.add.image(96 * TILE, 52 * TILE, 'fx-ring');
    ring.setTint(PAL.magenta);
    ring.setBlendMode(Phaser.BlendModes.ADD);
    ring.setScale(0.2);
    this.tweens.add({ targets: ring, scale: 15, alpha: 0, duration: 3000, onComplete: () => ring.destroy() });
  }

  private onBossDefeated(): void {
    if (this.loopState !== 'playing') return;
    this.bossActive = false;
    this.objectives.complete('defeatGuardian');
    this.save.stats.kills += 1;
    this.saveNow();
    this.loopState = 'over';
    this.rig.slowMo(0.35, 800);
    this.rig.focusOn(this.player.x, this.player.y, 1.1);
    // decision UI
    const p = this.endingProgress();
    const available = evaluateEndings(p);
    bus.emit('ending-decision', { available });
    bus.emit('toast', { text: 'CORE GUARDIAN DOWN', tone: 'good' });
    this.pendingEnding = null;
  }

  private endingProgress() {
    return {
      savedEli: this.save.rescued.includes('eli'),
      memories: this.save.memories,
      hiddenObjectiveDone: this.save.flags.includes('evacDone'),
      challengedMara: this.flags.has('challengedMara'),
      challengedGuardian: this.flags.has('challengedGuardian'),
    };
  }

  /** Called by the React decision modal. */
  chooseEnding(id: EndingId): void {
    if (this.pendingEnding) return;
    this.pendingEnding = id;
    this.save.story.endings[id] = true;
    this.save.story.endingCount = Object.values(this.save.story.endings).filter(Boolean).length;
    this.saveNow();
    this.loopState = 'ending';
    this.endingTime = 0;
    this.endingScript = [];
    const cx = this.player.x;
    const cy = this.player.y;
    if (id === 'preserve') {
      this.queueDialogue('endPreserve');
      this.endingScript.push({ at: 3.5, fn: () => this.rig.slowMo(0.5, 1200) });
      this.endingScript.push({ at: 4, fn: () => this.sfx('reset') });
      this.endingScript.push({ at: 5.5, fn: () => this.finishEnding(id) });
    } else if (id === 'break') {
      // the largest sequence in the game
      this.queueDialogue('endBreak');
      const shell = this.coreShell;
      const sx = shell ? shell.x : cx;
      const sy = shell ? shell.y : cy;
      this.endingScript.push({
        at: 1.0,
        fn: () => {
          this.explosions.explode('final', sx, sy);
          this.rig.slowMo(0.3, 900);
        },
      });
      this.endingScript.push({
        at: 1.5,
        fn: () => {
          this.explosions.explode('boss', sx - 140, sy + 60);
          this.explosions.explode('boss', sx + 130, sy - 80);
        },
      });
      this.endingScript.push({
        at: 2.1,
        fn: () => {
          this.explosions.explode('final', sx + 60, sy - 100);
          this.explosions.explode('large', sx - 90, sy - 60);
        },
      });
      this.endingScript.push({
        at: 2.8,
        fn: () => {
          this.explosions.explode('final', sx - 40, sy + 90);
          this.explosions.explode('large', sx + 100, sy + 40);
          this.rig.addShake(14, 400);
        },
      });
      this.endingScript.push({
        at: 3.6,
        fn: () => {
          this.explosions.explode('final', sx, sy);
          this.rig.slowMo(0.25, 1500);
          this.sfx('explosionLarge');
        },
      });
      this.endingScript.push({ at: 4.6, fn: () => this.whiteout(0.95) });
      this.endingScript.push({ at: 5.6, fn: () => this.finishEnding(id) });
    } else {
      // release
      this.queueDialogue('endRelease');
      // evacuation capsules open
      for (const i of this.interactables) {
        if (i.intId.startsWith('evac')) i.onInteract();
      }
      this.endingScript.push({
        at: 2.0,
        fn: () => {
          this.sfx('memory');
          this.rig.slowMo(0.4, 1200);
        },
      });
      this.endingScript.push({
        at: 2.6,
        fn: () => {
          this.fx.spawnGlow(this.player.x, this.player.y, PAL.teal, 3, 0.6);
          this.sfx('gateOpen');
        },
      });
      this.endingScript.push({ at: 3.4, fn: () => this.whiteout(0.9) });
      this.endingScript.push({ at: 4.4, fn: () => this.finishEnding(id) });
    }
  }

  private whiteout(alpha: number): void {
    this.whiteOverlay.setFillStyle(PAL.white, 0);
    this.whiteOverlay.setSize(this.scale.width, this.scale.height);
    this.whiteOverlay.setPosition(this.scale.width / 2, this.scale.height / 2);
    this.tweens.add({ targets: this.whiteOverlay, alpha, duration: 700, onComplete: () => this.whiteOverlay.setAlpha(0) });
  }

  private updateEnding(dt: number): void {
    this.endingTime += dt;
    for (const ev of this.endingScript) {
      if (ev.at > this.endingTime - dt && ev.at <= this.endingTime) ev.fn();
    }
  }

  private finishEnding(id: EndingId): void {
    if (this.loopState !== 'ending') return;
    this.loopState = 'over';
    this.save.lastLoop = {
      loop: this.save.story.loops,
      survived: Math.round(this.loopTimer.duration - this.loopTimer.remaining),
      kills: this.stats.kills,
      rescues: this.stats.rescues,
      chains: this.stats.chains,
      outcome: 'ending',
    };
    this.saveNow();
    bus.emit('ending', { id });
    updateSnapshot({ screen: 'ending', paused: true });
    audio.musicIntensity(0);
  }

  // ─────────────────────────────────────────────────────────
  // Ambient + HUD
  // ─────────────────────────────────────────────────────────

  private updateAmbient(dt: number): void {
    this.ambTimer -= dt;
    if (this.ambTimer > 0) return;
    this.ambTimer = 0.12;
    // dust motes near the player
    const cam = this.cameras.main;
    const cx = cam.scrollX + cam.width / (2 * cam.zoom);
    const cy = cam.scrollY + cam.height / (2 * cam.zoom);
    const halfW = cam.width / cam.zoom / 2;
    const halfH = cam.height / cam.zoom / 2;
    if (Math.random() < 0.5) {
      this.fx.spawnEmber(
        cx + (Math.random() - 0.5) * halfW * 2,
        cy + (Math.random() - 0.5) * halfH * 2,
        Math.random() < 0.6 ? PAL.cyan : PAL.white,
        (Math.random() - 0.5) * 14,
        -8 - Math.random() * 12,
        1.6,
        0.5,
      );
    }
    // siren pulses in danger phases
    if (this.sirenTimer > 0) {
      this.sirenTimer -= dt;
      if (this.sirenTimer <= 0 && (this.loopTimer.phase === 'DANGER' || this.loopTimer.phase === 'FINAL')) {
        this.sirenTimer = 2.4;
        this.sfx('siren');
      }
    }
    // lamp flicker sync
    for (const l of this.lamps) {
      const flicker = Math.sin(this.time.now * 0.002 + l.pole.x * 0.05) > 0.94;
      l.light.setAlpha(flicker ? 0.05 : 0.22);
    }
  }

  private pushHud(force: boolean): void {
    const snap = getSnapshot();
    const s = this.save;
    const time = this.loopTimer;
    const remaining = Math.max(0, time.remaining);
    const m = Math.floor(remaining / 60);
    const sec = Math.floor(remaining % 60);
    const obj = this.objectives.current;
    const district = districtAt(Math.round(this.playerPos.x / TILE), Math.round(this.playerPos.y / TILE)).id;
    const cam = this.cameras.main;
    const camInfo = { x: cam.scrollX, y: cam.scrollY, zoom: cam.zoom, w: cam.width, h: cam.height };
    const next = {
      screen: snap.screen,
      loop: s.story.loops,
      time: { m, s: sec, pct: time.progress, final10: time.phase === 'FINAL10' },
      hp: Math.max(0, Math.round(this.player.hp)),
      maxHp: this.player.maxHp,
      dash: this.player.dashPct,
      overdrive: this.player.overdrivePct,
      overdriveActive: this.player.overdriveActive,
      objective: obj ? { text: t(obj.descKey), worldX: obj.tile[0] * TILE + TILE / 2, worldY: obj.tile[1] * TILE + TILE / 2 } : null,
      sideObjectives: this.objectives.plan.side.filter((o) => this.objectives.isSideActive(o.id)).map((o) => t(o.descKey)),
      interact: snap.interact,
      dialogue: snap.dialogue,
      memories: s.memories.length,
      civilians: s.rescued.length,
      boss: this.boss && this.boss.alive ? { pct: this.boss.hpPct } : null,
      lowHp: this.player.hp <= 30 && this.player.alive,
      finalMinute: time.phase === 'FINAL' || time.phase === 'FINAL10',
      district,
      inputMode: this.inputMgr.mode,
      paused: snap.paused,
      cam: camInfo,
    };
    updateSnapshot(next);
    void force;
  }

  saveNow(): void {
    saveSystem.save(this.save);
    bus.emit('save', undefined);
  }
}

// expose world scene camera info for the React objective arrow
export function worldCameraInfo(scene: WorldScene): { x: number; y: number; zoom: number; w: number; h: number } {
  const cam = scene.cameras.main;
  return { x: cam.scrollX, y: cam.scrollY, zoom: cam.zoom, w: cam.width, h: cam.height };
}
