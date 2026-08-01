/**
 * RESET//07 — GameShell: mounts the Phaser world and hosts every UI layer.
 * React owns all menus/HUD; Phaser owns the world. Communication through the
 * bridge (typed bus + snapshot store).
 *
 * overlay: 'none' during gameplay; 'title' | 'garage' | 'paused' |
 *          'settings' | 'memory' | 'howto' | 'credits' otherwise.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Phaser from 'phaser';
import { createGame } from '../phaser/createGame';
import { api, bus, getSnapshot, subscribeSnapshot, updateSnapshot, type GameApi } from '../bridge';
import { audio } from '../systems/AudioEngine';
import { saveSystem, type SaveData, type Settings } from '../systems/SaveSystem';
import { TitleScreen } from './TitleScreen';
import { HUD } from './HUD';
import { TouchControls } from './TouchControls';
import { DialoguePanel } from './DialoguePanel';
import { PauseMenu } from './PauseMenu';
import { SettingsPanel } from './SettingsPanel';
import { MemoryBoard } from './MemoryBoard';
import { GarageScreen } from './GarageScreen';
import { EndingScreen, EndingDecisionModal } from './EndingScreen';
import { HowToPlay } from './HowToPlay';
import { CreditsScreen } from './HowToPlay';

export let gameRef: Phaser.Game | null = null;

type Overlay = 'none' | 'title' | 'garage' | 'paused' | 'settings' | 'memory' | 'howto' | 'credits';

export function GameShell() {
  const mountRef = useRef<HTMLDivElement>(null);
  const snap = useSyncExternalStore(subscribeSnapshot, getSnapshot, getSnapshot);
  const [overlay, setOverlay] = useState<Overlay>('title');
  const overlayRef = useRef(overlay);
  const setOv = useCallback((o: Overlay) => {
    overlayRef.current = o;
    setOverlay(o);
  }, []);
  const [save, setSave] = useState<SaveData>(() => saveSystem.load().data);
  const [endingDecision, setEndingDecision] = useState<{ preserve: boolean; break: boolean; release: boolean } | null>(null);
  const [ended, setEnded] = useState<{ id: 'preserve' | 'break' | 'release' } | null>(null);
  const [loopEndData, setLoopEndData] = useState<import('../bridge').LoopEndPayload | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; text: string; tone: string }>>([]);

  // ── boot phaser ──
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const game = createGame(el);
    gameRef = game;
    return () => {
      gameRef = null;
      game.destroy(true);
    };
  }, []);

  // ── save helpers ──
  const persist = useCallback((mut: (s: SaveData) => void) => {
    setSave((prev) => {
      const next = structuredClone(prev);
      mut(next);
      saveSystem.save(next);
      return next;
    });
  }, []);

  const applySettings = useCallback(
    (patch: Partial<Settings>) => {
      persist((s) => {
        s.settings = { ...s.settings, ...patch };
      });
      const merged = { ...save.settings, ...patch };
      audio.setVolumes({ master: merged.master, music: merged.music, sfx: merged.sfx, dialogue: merged.dialogue });
      document.documentElement.dataset.motion = merged.reducedMotion ? 'reduced' : 'full';
      document.documentElement.dataset.flash = merged.flashIntensity;
      document.documentElement.dataset.effects = merged.effectsQuality;
      const scene = gameRef?.scene.getScene('world') as (Phaser.Scene & { registry: Phaser.Data.DataManager }) | undefined;
      if (scene) {
        scene.registry.set('cameraShake', merged.cameraShake);
        scene.registry.set('autoAim', merged.autoAim);
        scene.registry.set('aimAssist', merged.aimAssist);
        scene.registry.set('reducedMotion', merged.reducedMotion);
        scene.registry.set('highContrast', merged.highContrast);
      }
    },
    [persist, save.settings],
  );

  const worldScene = useCallback(() => {
    const s = gameRef?.scene.getScene('world');
    return s as (Phaser.Scene & { resumeGame: () => void; restartLoop: () => void; quitToTitle: () => void; chooseDialogue: (c: 'a' | 'b') => void; chooseEnding: (e: string) => void }) | undefined;
  }, []);

  // ── api wiring ──
  useEffect(() => {
    const impl: GameApi = {
      startLoop: () => {
        audio.init();
        audio.musicStart();
        setEnded(null);
        setLoopEndData(null);
        setEndingDecision(null);
        const game = gameRef;
        if (!game) return;
        if (game.scene.isActive('world')) worldScene()?.scene.restart();
        else game.scene.start('world');
        setOv('none');
      },
      pause: () => setOv('paused'),
      resume: () => {
        worldScene()?.resumeGame();
        setOv('none');
        audio.duck(0);
      },
      restartLoop: () => {
        worldScene()?.restartLoop();
        setOv('none');
      },
      quitToTitle: () => {
        worldScene()?.quitToTitle();
        setOv('title');
      },
      equipModules: (ids: string[]) => {
        persist((s) => {
          s.modulesEquipped = ids.slice(0, 2);
        });
      },
      chooseDialogue: (choice) => worldScene()?.chooseDialogue(choice),
      chooseEnding: (id) => {
        setEndingDecision(null);
        worldScene()?.chooseEnding(id);
      },
      setFullscreen: () => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen().catch(() => undefined);
      },
      applySettings: (settings) => applySettings(settings as Partial<Settings>),
      isPaused: () => overlayRef.current === 'paused',
    };
    Object.assign(api, impl);
  }, [applySettings, persist, setOv, worldScene]);

  // ── bridge events ──
  useEffect(() => {
    const offs = [
      bus.on('dialogue', (d) => updateSnapshot({ dialogue: d })),
      bus.on('interact', (i) => updateSnapshot({ interact: i })),
      bus.on('toast', (t) => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev.slice(-3), { id, text: t.text, tone: t.tone }]);
        window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3600);
      }),
      bus.on('screen', (sc) => {
        if (sc === 'paused' && overlayRef.current === 'none') setOv('paused');
        if (sc === 'title') setOv('title');
      }),
      bus.on('ending-decision', (p) => setEndingDecision(p.available)),
      bus.on('ending', (p) => setEnded(p)),
      bus.on('loopEnd', (p) => {
        setLoopEndData(p);
        setOv('garage');
      }),
    ];
    return () => offs.forEach((f) => f());
  }, [setOv]);

  const startNew = useCallback(() => {
    audio.init();
    api.startLoop();
  }, []);

  const quitToTitle = useCallback(() => {
    setEnded(null);
    setEndingDecision(null);
    worldScene()?.quitToTitle();
    setOv('title');
    audio.musicStop();
  }, [worldScene]);

  const hasSave = useMemo(() => saveSystem.hasSave, []);
  const canContinue = useMemo(
    () => saveSystem.hasSave && (save.story.loops > 0 || save.memories.length > 0 || save.rescued.length > 0),
    [save],
  );

  const inGame = overlay === 'none';
  const showHUD = inGame && snap.screen === 'playing';

  return (
    <div className={`game-shell ${snap.inputMode === 'touch' ? 'is-touch' : 'is-kb'} overlay-${overlay}`}>
      <div ref={mountRef} className="game-shell__canvas" />
      <div className="game-shell__scanlines" aria-hidden />
      <div className="game-shell__vignette" aria-hidden />

      {/* toasts */}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>

      {/* in-game HUD + touch controls */}
      {showHUD && <HUD snap={snap} />}
      {showHUD && snap.inputMode === 'touch' && <TouchControls />}
      {inGame && snap.dialogue && <DialoguePanel snap={snap} />}

      {/* screens */}
      {overlay === 'title' && (
        <TitleScreen canContinue={canContinue} onNew={startNew} onContinue={startNew} onSettings={() => setOv('settings')} onHowTo={() => setOv('howto')} onCredits={() => setOv('credits')} hasSave={hasSave} />
      )}
      {overlay === 'garage' && loopEndData && (
        <GarageScreen
          summary={loopEndData}
          save={save}
          onStart={startNew}
          onMemory={() => setOv('memory')}
          onTitle={quitToTitle}
          onEquip={(ids) => api.equipModules(ids)}
        />
      )}
      {overlay === 'paused' && (
        <PauseMenu
          snap={snap}
          save={save}
          onResume={() => api.resume()}
          onRestart={() => api.restartLoop()}
          onTitle={quitToTitle}
          onSettings={() => setOv('settings')}
          onMemory={() => setOv('memory')}
          onHowTo={() => setOv('howto')}
        />
      )}
      {overlay === 'settings' && <SettingsPanel save={save} onApply={applySettings} onBack={() => setOv(overlayRef.current === 'settings' ? 'title' : 'title')} onReset={() => { saveSystem.clear(); setSave(saveSystem.load().data); setOv('title'); }} />}
      {overlay === 'memory' && <MemoryBoard save={save} onClose={() => setOv(overlayRef.current === 'paused' ? 'paused' : 'garage')} />}
      {overlay === 'howto' && <HowToPlay onClose={() => setOv('paused')} inputMode={snap.inputMode} />}
      {overlay === 'credits' && <CreditsScreen onClose={() => setOv('title')} />}

      {/* boss decision + ending */}
      {endingDecision && <EndingDecisionModal available={endingDecision} save={save} />}
      {ended && <EndingScreen id={ended.id} save={save} onContinue={startNew} onTitle={quitToTitle} />}
    </div>
  );
}
