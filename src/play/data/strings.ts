/**
 * RESET//07 — central string table.
 *
 * Every user-facing string lives here (or in data/dialogue.ts). The UI code
 * only ever calls `t(key)`, so adding a language never touches gameplay code.
 * English is complete; Vietnamese is provided for the core UI and falls back
 * to English for any missing key.
 */

export type Lang = 'en' | 'vi';

type Dict = Record<string, string>;

const en: Dict = {
  // ── Title ──────────────────────────────────────────────
  'title.tagline': 'A city trapped in a seven-minute loop.',
  'title.newLoop': 'NEW LOOP',
  'title.continue': 'CONTINUE',
  'title.settings': 'SETTINGS',
  'title.howto': 'HOW TO PLAY',
  'title.credits': 'CREDITS',
  'title.loopCount': 'LOOP {n}',
  'title.noContinue': 'NO SAVE DATA',
  'title.resetConfirm': 'Erase all save data? This cannot be undone.',

  // ── Garage ─────────────────────────────────────────────
  'garage.title': 'SERVICE GARAGE 07',
  'garage.subtitle': 'K-07 READY // MEMORY CORE {n}% SYNCED',
  'garage.start': 'START LOOP',
  'garage.modules': 'MODULES',
  'garage.memory': 'MEMORY BOARD',
  'garage.rescued': 'RESCUED',
  'garage.memories': 'MEMORIES',
  'garage.loops': 'LOOPS',
  'garage.equipped': 'EQUIPPED {n}/2',
  'garage.moduleInfo': 'TWO MODULES MAX. CHOOSE YOUR TACTICS.',
  'garage.slotHint': 'SELECT A MODULE TO EQUIP',

  // ── HUD ────────────────────────────────────────────────
  'hud.objective': 'OBJECTIVE',
  'hud.health': 'HULL',
  'hud.overdrive': 'OVERDRIVE',
  'hud.dash': 'DASH',
  'hud.interact': 'INTERACT',
  'hud.pause': 'PAUSE',
  'hud.memory': 'MEMORY',
  'hud.civilians': 'CIVILIANS',
  'hud.ready': 'READY',
  'hud.boss': 'CORE GUARDIAN',

  // ── Pause ──────────────────────────────────────────────
  'pause.title': 'PAUSED',
  'pause.resume': 'RESUME',
  'pause.objectives': 'OBJECTIVES',
  'pause.memory': 'MEMORY LOG',
  'pause.controls': 'CONTROLS',
  'pause.settings': 'SETTINGS',
  'pause.restart': 'RESTART LOOP',
  'pause.title2': 'RETURN TO TITLE',
  'pause.restartConfirm': 'Restart the current loop? Progress inside this loop will be lost.',

  // ── Settings ───────────────────────────────────────────
  'set.audio': 'AUDIO',
  'set.master': 'MASTER',
  'set.music': 'MUSIC',
  'set.sfx': 'SOUND FX',
  'set.dialogue': 'DIALOGUE',
  'set.video': 'VIDEO',
  'set.effects': 'EFFECTS QUALITY',
  'set.effects.low': 'LOW',
  'set.effects.med': 'MEDIUM',
  'set.effects.high': 'HIGH',
  'set.shake': 'CAMERA SHAKE',
  'set.shake.off': 'OFF',
  'set.shake.low': 'LOW',
  'set.shake.high': 'HIGH',
  'set.flash': 'FLASH INTENSITY',
  'set.flash.reduced': 'REDUCED',
  'set.flash.full': 'FULL',
  'set.motion': 'REDUCED MOTION',
  'set.aim': 'CONTROLS',
  'set.autoAim': 'AUTO-AIM',
  'set.aimAssist': 'AIM ASSIST',
  'set.highContrast': 'HIGH-CONTRAST TARGETS',
  'set.fullscreen': 'FULLSCREEN',
  'set.save': 'SAVE DATA',
  'set.resetSave': 'RESET SAVE',
  'set.lang': 'LANGUAGE',
  'set.back': 'BACK',

  // ── Controls ───────────────────────────────────────────
  'ctrl.move': 'MOVE',
  'ctrl.aim': 'AIM',
  'ctrl.fire': 'FIRE',
  'ctrl.dash': 'DASH',
  'ctrl.interact': 'INTERACT',
  'ctrl.overdrive': 'OVERDRIVE',
  'ctrl.pause': 'PAUSE',
  'ctrl.dashHint': 'DASH GIVES BRIEF INVULNERABILITY',
  'ctrl.odHint': 'OVERDRIVE: TIME SLOWS, ENEMIES ARE MARKED, FIRE RATE UP',

  // ── Tutorial ───────────────────────────────────────────
  'tut.move': 'MOVE WITH {move}',
  'tut.aim': 'AIM WITH {aim}',
  'tut.fire': 'HOLD {fire} TO FIRE',
  'tut.vehicle': 'DAMAGED VEHICLES ARE UNSTABLE. SHOOT THEM.',
  'tut.dash': 'PRESS {dash} TO DASH THROUGH THE GATE',
  'tut.interact': 'PRESS {interact} TO INTERACT',
  'tut.overdrive': 'OVERDRIVE READY — PRESS {od}',
  'tut.hint.unstable': 'UNSTABLE OBJECT DETECTED',
  'tut.hint.critical': 'CRITICAL — DETONATION IMMINENT',
  'tut.hint.capsule': 'RESCUE CAPSULE — INTERACT TO OPEN',
  'tut.hint.gas': 'GAS LEAK — IGNITE IT',
  'tut.hint.puddle': 'WATER CONDUCTS ELECTRICITY',
  'tut.hint.shield': 'SHIELD UNIT — HIT IT FROM BEHIND OR USE ELECTRICITY',
  'tut.hint.detonator': 'DETONATION DRONE — SHOOT IT, THEN GET BACK',
  'tut.hint.gate': 'GATE LOCKED — FIND POWER',

  // ── Dialogue system ────────────────────────────────────
  'dlg.mara': 'MARA',
  'dlg.eli': 'ELI',
  'dlg.k07': 'K-07',
  'dlg.guardian': 'CORE GUARDIAN',
  'dlg.system': 'CITY SYSTEMS',

  // ── Objectives ─────────────────────────────────────────
  'obj.reachService': 'REACH THE SERVICE QUARTER',
  'obj.reachRelay': 'REACH THE POWER GRID RELAY',
  'obj.stabilizeRelay': 'STABILIZE THE POWER RELAY',
  'obj.reachTransit': 'REACH THE TRANSIT SECTOR',
  'obj.destroyUplink': 'DESTROY THE SECURITY UPLINK',
  'obj.enterCore': 'ENTER THE CITY CORE',
  'obj.defeatGuardian': 'DEFEAT THE CORE GUARDIAN',
  'obj.rescueCapsuleA': 'RESCUE THE TRAPPED CIVILIAN',
  'obj.rescueEli': 'SAVE ELI — TRANSIT PLATFORM',
  'obj.rescueChoice': 'TWO CAPSULES — ONE RELAY. CHOOSE.',
  'obj.memory': 'RECOVER MEMORY FRAGMENT',
  'obj.hiddenCapsules': 'FIND THE EVACUATION CAPSULES',
  'obj.escape': 'SURVIVE THE RESET',

  // ── Endings ────────────────────────────────────────────
  'end.preserve.title': 'ENDING 01 — PRESERVE',
  'end.break.title': 'ENDING 02 — BREAK',
  'end.release.title': 'ENDING 03 — RELEASE',
  'end.continue': 'CONTINUE FROM BEFORE THE DECISION',
  'end.newCycle': 'NEW MEMORY CYCLE',
  'end.unlocked': 'ENDING {n} UNLOCKED',

  // ── Loop / reset ───────────────────────────────────────
  'loop.reset.title': 'LOOP RESET',
  'loop.reset.memory': 'MEMORY FRAGMENTS PRESERVED: {n}',
  'loop.summary': 'LOOP {n} SUMMARY',
  'loop.time': 'TIME SURVIVED',
  'loop.kills': 'MACHINES DOWN',
  'loop.rescues': 'CIVILIANS RESCUED',
  'loop.chains': 'CHAIN REACTIONS',
  'loop.final10': 'LOOP TERMINATION IN {n}',

  // ── Memory board ───────────────────────────────────────
  'mem.title': 'MEMORY BOARD',
  'mem.locked': 'SIGNAL LOST — RECOVER MORE FRAGMENTS',
  'mem.close': 'CLOSE',

  // ── Misc UI ────────────────────────────────────────────
  'ui.on': 'ON',
  'ui.off': 'OFF',
  'ui.yes': 'YES',
  'ui.no': 'NO',
  'ui.locked': 'LOCKED',
  'ui.press': 'PRESS',
  'ui.hold': 'HOLD',
  'ui.damaged': 'DAMAGED',
  'ui.critical': 'CRITICAL',
  'ui.intact': 'INTACT',
  'ui.destroyed': 'DESTROYED',

  // ── Credits ────────────────────────────────────────────
  'credits.title': 'CREDITS',
  'credits.role': 'DESIGN, CODE, ART, SOUND',
  'credits.thanks': 'THANKS FOR PLAYING',
  'credits.back': 'BACK',
} as const;

const vi: Dict = {
  'title.newLoop': 'VÒNG MỚI',
  'title.continue': 'TIẾP TỤC',
  'title.settings': 'CÀI ĐẶT',
  'title.howto': 'HƯỚNG DẪN',
  'title.credits': 'CREDITS',
  'title.resetConfirm': 'Xóa toàn bộ dữ liệu lưu? Không thể hoàn tác.',
  'garage.start': 'BẮT ĐẦU VÒNG LẶP',
  'garage.modules': 'MÔ-ĐUN',
  'garage.memory': 'BẢNG KÝ ỨC',
  'pause.resume': 'TIẾP TỤC',
  'pause.settings': 'CÀI ĐẶT',
  'pause.restart': 'LẶP LẠI VÒNG',
  'pause.title2': 'VỀ MÀN HÌNH CHÍNH',
  'set.master': 'ÂM LƯỢNG CHÍNH',
  'set.music': 'NHẠC',
  'set.sfx': 'HIỆU ỨNG',
  'set.dialogue': 'HỘI THOẠI',
  'set.back': 'QUAY LẠI',
  'ui.yes': 'CÓ',
  'ui.no': 'KHÔNG',
  'end.continue': 'TIẾP TỤC TỪ TRƯỚC QUYẾT ĐỊNH',
  'end.newCycle': 'CHU KỲ KÝ ỨC MỚI',
} as const;

const dicts: Record<Lang, Dict> = { en: en as Dict, vi };

export function t(key: string, vars?: Record<string, string | number>, lang: Lang = 'en'): string {
  let s = dicts[lang][key] ?? dicts.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replace(new RegExp(`{${k}}`, 'g'), String(v));
  }
  return s;
}
