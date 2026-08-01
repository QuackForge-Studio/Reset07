/**
 * RESET//07 — scene augmentation: shared services on the world scene.
 */
import Phaser from 'phaser';
import type { EffectManager } from './systems/Effects';
import type { ExplosionSystem } from './systems/Explosions';
import type { Pathfinder } from './systems/Pathfinder';
import type { CameraRig } from './systems/CameraRig';
import type { ObjectiveTracker } from './data/objectives';
import type { LoopTimer } from './systems/LoopTimer';
import type { SfxName } from './systems/AudioEngine';
import type { EnemyBase } from './entities/enemies';
import type { Puddle, Interactable, Explosive, DecorativeProp } from './entities/environment';
import type { GateDef } from './world/cityData';
import type { SaveData } from './systems/SaveSystem';
import type { CoreGuardian } from './entities/boss';
import type { Player } from './entities/Player';
import type { InputManager } from './systems/InputState';

export interface WorldScene extends Phaser.Scene {
  // services
  fx: EffectManager;
  explosions: ExplosionSystem;
  pathfinder: Pathfinder;
  rig: CameraRig;
  inputMgr: InputManager;
  playerPos: { x: number; y: number };
  player: Player;
  objectives: ObjectiveTracker;
  loopTimer: LoopTimer;
  sfx: (name: SfxName) => void;
  save: SaveData;
  flags: Set<string>;
  // world state
  collideWalls: Phaser.Physics.Arcade.StaticGroup;
  puddleList: Puddle[];
  lamps: Array<{ pole: DecorativeProp; light: Phaser.GameObjects.Image }>;
  coreShell: Phaser.GameObjects.Image | null;
  enemyList: EnemyBase[];
  explosiveGroup: Phaser.Physics.Arcade.Group;
  enemyBolts: Phaser.Physics.Arcade.Group;
  playerBolts: Phaser.Physics.Arcade.Group;
  explosiveProps: Explosive[];
  interactables: Interactable[];
  boss: CoreGuardian | null;
  bossActive: boolean;
  loopState: 'opening' | 'playing' | 'reset' | 'ending' | 'over';
  // builder + entity callbacks
  districtName: (tx: number, ty: number) => string;
  damagePlayer: (amount: number, x: number, y: number) => void;
  openDoor: (gateId: string) => void;
  onGateOpened: (def: GateDef) => void;
  onRescued: (id: string) => void;
  onEvacOpened: (id: string) => void;
  onMemoryCollected: (id: string) => boolean;
  onRelayStabilized: () => void;
  onUplinkDestroyed: () => void;
  onTutorialVehicleDestroyed: () => void;
  gates: import('./world/CityBuilder').GateInstance[];
}
