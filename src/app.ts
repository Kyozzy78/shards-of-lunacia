import { applyCommand, beginPlayerPhase, chooseEnemyAction, createInitialState, getUnit, useSelfAbility, type MissionId } from './game/engine';
import { findPath, keyOf, reachableCells } from './game/grid';
import type { ActionMode, Unit } from './game/types';
import { BattleRenderer } from './rendering/BattleRenderer';
import { SquadPreviewRenderer } from './rendering/SquadPreviewRenderer';
import { AudioManager } from './audio/AudioManager';

type Screen = 'menu' | 'squad' | 'battle';

function createEncounter(mission: MissionId = 'crossing'): ReturnType<typeof createInitialState> { return createInitialState(mission); }

export class App {
  private screen: Screen = 'menu';
  private mission: MissionId = 'crossing';
  private state = createEncounter(this.mission);
  private battleRenderer?: BattleRenderer;
  private squadPreview?: SquadPreviewRenderer;
  private tutorialStep = 0;
  private showHelp = false;
  private showSettings = false;
  private showEndConfirm = false;
  private enemyBusy = false;
  private moving = false;
  private loading = false;
  private readonly audio = new AudioManager();
  private status = 'Select an Axie, then choose a highlighted tile.';
  private settings = { music: 0.35, sfx: 0.6, reducedMotion: false, confirmEnd: true, quality: 'high' };

  constructor(private readonly root: HTMLElement) {
    const saved = localStorage.getItem('shards-settings');
    try { if (saved) this.settings = { ...this.settings, ...JSON.parse(saved) as Partial<typeof this.settings> }; } catch { /* Ignore corrupt local preferences. */ }
    this.audio.setVolumes(this.settings.music, this.settings.sfx);
    window.addEventListener('keydown', this.onKey);
    this.render();
  }

  private render(): void {
    this.audio.setScene(this.screen === 'battle' ? 'battle' : 'lobby');
    if (this.screen === 'menu') this.renderMenu();
    else if (this.screen === 'squad') this.renderSquad();
    else this.renderBattle();
  }

  private renderMenu(): void {
    this.destroyRenderer();
    this.destroySquadPreview();
    this.root.innerHTML = `<main class="menu-screen">
      <div class="menu-shade"></div>
      <section class="menu-card" aria-labelledby="game-title">
        <div class="shard-mark" aria-hidden="true">◇</div>
        <p class="eyebrow">A LUNACIAN TACTICS STORY</p>
        <h1 id="game-title"><span>SHARDS</span><small>OF</small><span>LUNACIA</span></h1>
        <p class="tagline">YOUR AXIES. YOUR STRATEGY.</p>
        <button class="primary huge" data-action="play">Begin Mission <span>›</span></button>
        <div class="menu-links">
          <button data-action="help">How to Play</button><button data-action="settings">Settings</button>
        </div>
        <p class="menu-note">Single-player · 5–10 minutes · No wallet required</p>
      </section>
      ${this.modalMarkup()}
    </main>`;
    this.bindCommon();
    this.root.querySelector('[data-action="play"]')?.addEventListener('click', () => { this.screen = 'squad'; this.render(); });
  }

  private renderSquad(): void {
    this.destroyRenderer();
    this.destroySquadPreview();
    const players = this.state.units.filter((unit) => unit.team === 'player');
    this.root.innerHTML = `<main class="squad-screen">
      <canvas id="squad-preview-canvas" aria-hidden="true"></canvas>
      <button class="back-link" data-action="menu">‹ Menu</button>
      <section class="squad-heading"><p class="eyebrow">CAMPAIGN DEPLOYMENT</p><h2>Choose your approach</h2><p>Five official mixer-built Axies deploy together. Pick a battlefield, then start the mission.</p></section>
      <section class="mission-select" aria-label="Choose mission">
        ${([['crossing','01','The Shattered Crossing','Balanced ruins and cover.'],['canopy','02','The Verdant Canopy','Flanking lanes in dense growth.'],['citadel','03','The Sky Citadel','Tight high-ground corridors.']] as const).map(([id,no,name,description]) => `<button class="mission-card ${this.mission === id ? 'selected' : ''}" data-mission="${id}"><span>MISSION ${no}</span><b>${name}</b><small>${description}</small></button>`).join('')}
      </section>
      <section class="squad-cards">${players.map((u, index) => `<article class="squad-card accent-${index}">
        <div class="portrait-orb mixer-portrait"><span>${u.axieClass}</span><small>OFFICIAL 3D MIXER</small></div>
        <span class="role">${u.axieClass} · ${u.role}</span><h3>${u.name}</h3><p>${u.ability.description}</p>
        <dl><div><dt>HP</dt><dd>${u.hp}</dd></div><div><dt>MOVE</dt><dd>${u.moveRange}</dd></div><div><dt>RANGE</dt><dd>${u.attackRange}</dd></div></dl>
        <div class="ability-chip"><b>${u.ability.name}</b><span>${u.ability.cost} AP</span></div>
      </article>`).join('')}</section>
      <div class="squad-launch"><p>Confirmed: all five player units are created at runtime with the official 3D mixer: Beast, Reptile, Bird, Reptile, Plant.</p><button class="primary huge launch" data-action="start">Start Mission <span>›</span></button></div>
    </main>`;
    this.root.querySelector('[data-action="menu"]')?.addEventListener('click', () => { this.screen = 'menu'; this.render(); });
    this.root.querySelectorAll<HTMLElement>('[data-mission]').forEach((button) => button.addEventListener('click', () => { this.mission = button.dataset.mission as MissionId; this.state = createEncounter(this.mission); this.renderSquad(); }));
    this.root.querySelector('[data-action="start"]')?.addEventListener('click', () => { this.state = createEncounter(this.mission); this.screen = 'battle'; this.tutorialStep = 0; this.render(); });
    const previewCanvas = this.root.querySelector<HTMLCanvasElement>('#squad-preview-canvas');
    const portraits = [...this.root.querySelectorAll<HTMLElement>('.mixer-portrait')];
    if (previewCanvas) {
      this.squadPreview = new SquadPreviewRenderer(previewCanvas);
      void this.squadPreview.load(players, portraits).catch((error: unknown) => {
        console.error('Unable to load squad preview models.', error);
        this.root.querySelectorAll('.mixer-portrait').forEach((portrait) => portrait.classList.add('preview-unavailable'));
      });
    }
  }

  private renderBattle(): void {
    this.destroySquadPreview();
    const existingCanvas = this.root.querySelector<HTMLCanvasElement>('#battle-canvas');
    const selected = this.state.units.find((unit) => unit.id === this.state.selectedId) ?? this.state.units.find((unit) => unit.team === 'player' && unit.alive);
    if (!existingCanvas) {
      this.root.innerHTML = `<main class="battle-screen">
        <canvas id="battle-canvas" aria-label="3D tactical battlefield"></canvas>
        <div class="battle-loading"><div class="spinner"></div><h2>Entering the Shattered Crossing</h2><p>Loading official Axies and Lunacian ruins…</p></div>
        <div class="vignette"></div>
        <header class="battle-top"><div class="phase-banner"></div><div class="objective"><span>◆</span><div><small>PRIMARY OBJECTIVE</small><b>Defeat all Chimeras</b></div></div></header>
        <aside class="squad-rail" aria-label="Squad"></aside>
        <aside class="mission-panel"><small>THE SHATTERED CROSSING</small><b>Enemies remaining <span id="enemy-count"></span></b></aside>
        <section class="tutorial-callout"></section>
        <section class="target-tip"></section>
        <div class="bottom-hud"><section class="unit-panel"></section><section class="ability-bar"></section><button class="end-turn" data-action="end">End Turn <span>›</span></button></div>
        <canvas class="minimap" width="210" height="145" aria-label="Battlefield minimap"></canvas>
        <ol class="combat-log"></ol>
        <div class="battle-tools"><button data-action="help" title="Help">?</button><button data-action="settings" title="Settings">⚙</button><button data-action="rotate-left" title="Rotate left">↶</button><button data-action="rotate-right" title="Rotate right">↷</button><button data-action="cancel" title="Move / cancel targeting">↖</button></div>
        <section class="result-overlay"></section>${this.modalMarkup()}
      </main>`;
      const canvas = this.root.querySelector<HTMLCanvasElement>('#battle-canvas');
      if (!canvas) throw new Error('Battle canvas is unavailable.');
      try {
        this.loading = true;
        this.battleRenderer = new BattleRenderer(canvas); this.battleRenderer.onCell = (x, z) => this.onCell(x, z); this.battleRenderer.onUnit = (id) => this.onUnit(id);
        this.battleRenderer.onHover = (text) => { const tip = this.root.querySelector('.target-tip'); if (tip) tip.textContent = text; };
        this.battleRenderer.onCancel = () => this.cancelTargeting();
      } catch (error) {
        this.root.innerHTML = `<main class="fatal"><h1>WebGL2 is required</h1><p>${String(error)}</p><button class="primary" onclick="location.reload()">Retry</button></main>`; return;
      }
      this.root.querySelector('[data-action="end"]')?.addEventListener('click', () => this.endTurn()); this.bindCommon();
      this.root.querySelector('[data-action="rotate-left"]')?.addEventListener('click', () => this.battleRenderer?.rotate(-Math.PI / 4));
      this.root.querySelector('[data-action="rotate-right"]')?.addEventListener('click', () => this.battleRenderer?.rotate(Math.PI / 4));
      this.root.querySelector('[data-action="cancel"]')?.addEventListener('click', () => this.cancelTargeting());
      this.root.querySelector<HTMLCanvasElement>('.minimap')?.addEventListener('click', (event) => this.onMinimap(event));
    }
    void this.battleRenderer?.setState(this.state).then(() => { this.loading = false; this.root.querySelector('.battle-loading')?.remove(); }).catch((error: unknown) => { const panel = this.root.querySelector('.battle-loading'); if (panel) { panel.textContent = `An asset could not load: ${String(error)}. Reload to retry.`; } });
    this.updateBattleUi(selected);
  }

  private updateBattleUi(selected?: Unit): void {
    const root = this.root; const enemies = this.state.units.filter((u) => u.team === 'enemy' && u.alive);
    const phase = root.querySelector('.phase-banner'); if (phase) phase.innerHTML = `<small>TURN ${this.state.turn}</small><b>${this.state.phase === 'PLAYER_PHASE' ? 'PLAYER PHASE' : this.state.phase === 'ENEMY_PHASE' ? 'CHIMERA PHASE' : this.state.phase}</b>`;
    const count = root.querySelector('#enemy-count'); if (count) count.textContent = `${enemies.length} / 3`;
    const rail = root.querySelector('.squad-rail'); if (rail) rail.innerHTML = this.state.units.filter((u) => u.team === 'player').map((u, i) => `<button class="squad-token ${u.id === selected?.id ? 'selected' : ''} ${u.alive ? '' : 'defeated'}" data-unit="${u.id}" title="${i + 1} · ${u.name}"><span>${u.axieClass?.[0] ?? 'A'}</span><div><b>${u.name}</b><em>${u.hp}/${u.maxHp}</em></div></button>`).join('');
    rail?.querySelectorAll<HTMLElement>('[data-unit]').forEach((button) => button.addEventListener('click', () => this.select(button.dataset.unit ?? '')));
    const panel = root.querySelector('.unit-panel'); if (panel && selected) panel.innerHTML = `<div class="unit-avatar">${selected.axieClass?.[0] ?? 'A'}</div><div class="unit-info"><span>${selected.axieClass} · ${selected.role}</span><h3>${selected.name}${selected.guarding ? ' · GUARDING' : ''}</h3><div class="health"><i style="width:${selected.hp / selected.maxHp * 100}%"></i><b>${selected.hp} / ${selected.maxHp}</b></div><div class="ap"><span>AP</span>${Array.from({length: selected.maxAp}, (_, i) => `<i class="${i < selected.ap ? 'full' : ''}"></i>`).join('')}</div></div>`;
    const bar = root.querySelector('.ability-bar'); if (bar && selected) bar.innerHTML = `<button class="ability ${this.state.actionMode === 'attack' ? 'active' : ''}" data-mode="attack" ${selected.ap < 1 ? 'disabled' : ''}><i>⚔</i><b>Basic Attack</b><span>1 AP · ${selected.damage} DMG</span></button><button class="ability signature ${this.state.actionMode === 'ability' ? 'active' : ''}" data-mode="ability" ${selected.ap < selected.ability.cost || selected.cooldown > 0 ? 'disabled' : ''}><i>✦</i><b>${selected.ability.name}</b><span>${selected.cooldown ? `Cooldown ${selected.cooldown}` : `${selected.ability.cost} AP · ${Math.abs(selected.ability.damage)} ${selected.ability.damage < 0 ? 'HEAL' : 'DMG'}`}</span></button><button class="ability" data-action="guard" ${selected.ap < 1 ? 'disabled' : ''}><i>⬡</i><b>Guard</b><span>1 AP · −40% damage</span></button>`;
    bar?.querySelectorAll<HTMLElement>('[data-mode]').forEach((button) => button.addEventListener('click', () => this.setMode(button.dataset.mode as ActionMode)));
    bar?.querySelector('[data-action="guard"]')?.addEventListener('click', () => this.runCommand({ type: 'guard', unitId: selected?.id ?? '' }));
    const callout = root.querySelector('.tutorial-callout'); if (callout) callout.innerHTML = this.tutorialMarkup();
    callout?.querySelector('[data-action="skip-tutorial"]')?.addEventListener('click', () => { this.tutorialStep = 4; this.updateBattleUi(selected); });
    const tip = root.querySelector('.target-tip'); if (tip) tip.textContent = this.status;
    const log = root.querySelector('.combat-log'); if (log) log.innerHTML = this.state.events.map((event) => `<li>${event.text}</li>`).join('');
    this.drawMinimap(); this.renderResult();
  }

  private tutorialMarkup(): string {
    const steps = [
      ['1 / 4 · SELECT', 'Kibo is selected. Cyan tiles show where 1 AP can take him.'],
      ['2 / 4 · MOVE', 'Click a highlighted tile. Movement costs 1 AP.'],
      ['3 / 4 · ATTACK', 'Choose Basic Attack or a signature ability, then a visible Chimera.'],
      ['4 / 4 · END TURN', 'When ready, end the phase. Chimeras act one at a time.'],
    ];
    if (this.tutorialStep >= steps.length) return '';
    const current = steps[this.tutorialStep]!; return `<div><small>${current[0]}</small><b>${current[1]}</b></div><button data-action="skip-tutorial">Skip</button>`;
  }

  private onUnit(id: string): void {
    const clicked = getUnit(this.state, id); const selected = this.state.selectedId ? getUnit(this.state, this.state.selectedId) : undefined;
    if (!clicked || this.state.phase !== 'PLAYER_PHASE' || this.enemyBusy || this.moving || this.loading) return;
    if (clicked.team === 'player') { this.select(id); return; }
    if (selected && (this.state.actionMode === 'attack' || this.state.actionMode === 'ability')) this.runCommand({ type: 'attack', unitId: selected.id, targetId: clicked.id, ability: this.state.actionMode === 'ability' });
    else this.status = 'Choose an attack, then a visible enemy.';
  }

  private onCell(x: number, z: number): void {
    const canvas = this.root.querySelector<HTMLCanvasElement>('#battle-canvas');
    if (canvas) canvas.dataset.lastAppCell = `${x},${z}:${this.state.phase}:${String(this.state.actionMode)}:${String(this.state.selectedId)}:${String(this.enemyBusy)}`;
    if (this.state.phase !== 'PLAYER_PHASE' || this.state.actionMode !== 'move' || !this.state.selectedId || this.enemyBusy || this.moving || this.loading) return;
    const unit = getUnit(this.state, this.state.selectedId); if (!unit) return; const to = { x, z }; const path = findPath(this.state, unit.cell, to, unit.id);
    const isReachable = reachableCells(this.state, unit).some((cell) => keyOf(cell) === keyOf(to));
    if (canvas) canvas.dataset.lastPath = `${String(path?.length)}:${String(isReachable)}`;
    if (!path || !isReachable) { this.status = 'That tile is blocked or beyond this Axie’s move range.'; this.updateBattleUi(unit); return; }
    const result = applyCommand(this.state, { type: 'move', unitId: unit.id, to });
    if (result.error) { this.status = result.error; this.updateBattleUi(unit); return; }
    this.tutorialStep = Math.max(this.tutorialStep, 2); this.status = `${unit.name} moved. AP ${unit.ap} → ${result.state.units.find((u) => u.id === unit.id)?.ap}.`;
    this.moving = true; this.audio.cue('move');
    this.battleRenderer?.moveUnit(unit.id, path, () => { this.moving = false; this.state = result.state; this.renderBattle(); });
  }

  private select(id: string): void { if (this.moving || this.loading || this.enemyBusy) return; const result = applyCommand(this.state, { type: 'select', unitId: id }); if (!result.error) { this.audio.cue('select'); this.state = result.state; this.tutorialStep = Math.max(this.tutorialStep, 1); this.status = `${getUnit(this.state, id)?.name} selected. Choose a highlighted tile or an action.`; this.renderBattle(); } }
  private cancelTargeting(): void { if (this.moving || this.loading || this.enemyBusy) return; this.state = { ...this.state, actionMode: 'move' }; this.status = 'Movement selected.'; this.renderBattle(); }
  private setMode(mode: ActionMode): void {
    if (this.moving || this.loading || this.enemyBusy) return;
    const selected = this.state.selectedId ? getUnit(this.state, this.state.selectedId) : undefined; if (!selected) return;
    if (mode === 'ability' && selected.ability.kind === 'shield') { const result = useSelfAbility(this.state, selected.id); if (!result.error) { this.state = result.state; this.status = `${selected.ability.name} activated.`; this.renderBattle(); } return; }
    this.state = { ...this.state, actionMode: mode }; this.tutorialStep = Math.max(this.tutorialStep, 2); this.status = mode === 'attack' ? `Select a visible enemy within ${selected.attackRange} tiles.` : `Select a target for ${selected.ability.name}.`; this.renderBattle();
  }
  private runCommand(command: Parameters<typeof applyCommand>[1]): void { if (this.moving || this.loading || this.enemyBusy) return; const attacker = command.type === 'attack' ? getUnit(this.state, command.unitId) : undefined; const target = command.type === 'attack' ? getUnit(this.state, command.targetId) : undefined; const result = applyCommand(this.state, command); if (result.error) this.status = result.error; else { if (command.type === 'attack') { this.battleRenderer?.attack(command.unitId, command.targetId); this.audio.cue('attack', attacker?.axieClass); if (target?.guarding) this.audio.cue('block'); } else this.audio.cue('guard'); this.state = result.state; this.status = this.state.events[0]?.text ?? 'Action complete.'; this.tutorialStep = Math.max(this.tutorialStep, 3); } this.renderBattle(); }

  private endTurn(): void {
    if (this.state.phase !== 'PLAYER_PHASE' || this.enemyBusy || this.moving || this.loading) return; const hasAp = this.state.units.some((u) => u.team === 'player' && u.alive && u.ap > 0);
    if (hasAp && this.settings.confirmEnd) { this.showEndConfirm = true; this.rebuildForModal(); return; }
    this.commitEndTurn();
  }

  private commitEndTurn(): void {
    this.showEndConfirm = false;
    // The battle canvas is intentionally preserved between UI updates, so remove
    // the in-game confirmation layer before handing control to the enemy phase.
    this.rebuildForModal();
    this.state = applyCommand(this.state, { type: 'end-turn' }).state; this.enemyBusy = true; this.status = 'Chimeras are choosing their actions…'; this.renderBattle(); void this.runEnemyPhase();
  }

  private async runEnemyPhase(): Promise<void> {
    for (const enemy of this.state.units.filter((u) => u.team === 'enemy' && u.alive)) {
      if (this.state.phase !== 'ENEMY_PHASE') break;
      for (let actionIndex = 0; actionIndex < 2; actionIndex += 1) {
        const current = getUnit(this.state, enemy.id); if (!current?.alive || current.ap < 1) break; const command = chooseEnemyAction(this.state, current); if (command.type === 'end-turn') break;
        await this.delay(this.settings.reducedMotion ? 120 : 450); const target = command.type === 'attack' ? getUnit(this.state, command.targetId) : undefined; const result = applyCommand(this.state, command); if (result.error) break; if (command.type === 'move') { const path = findPath(this.state, current.cell, command.to, current.id); if (path && this.battleRenderer) await new Promise<void>((resolve) => this.battleRenderer!.moveUnit(current.id, path, resolve)); } if (command.type === 'attack') { this.battleRenderer?.attack(command.unitId, command.targetId); this.audio.cue('attack'); if (target?.guarding) this.audio.cue('block'); } this.state = result.state; this.status = this.state.events[0]?.text ?? 'Enemy acted.'; this.renderBattle();
      }
    }
    if (this.state.phase === 'ENEMY_PHASE') this.state = beginPlayerPhase(this.state); this.enemyBusy = false; this.status = 'Your squad is ready. AP refreshed to 3.'; this.renderBattle();
  }

  private drawMinimap(): void {
    const canvas = this.root.querySelector<HTMLCanvasElement>('.minimap'); const ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return; ctx.clearRect(0, 0, canvas.width, canvas.height); const cw = canvas.width / this.state.width; const ch = canvas.height / this.state.height;
    for (let x = 0; x < this.state.width; x += 1) for (let z = 0; z < this.state.height; z += 1) { const vis = this.state.visibility.get(`${x},${z}`) ?? 'unknown'; ctx.fillStyle = vis === 'unknown' ? '#091525' : vis === 'explored' ? '#41565a' : this.state.blocked.has(`${x},${z}`) ? '#9b8e71' : '#6b8f78'; ctx.fillRect(x * cw + 1, z * ch + 1, cw - 2, ch - 2); }
    for (const unit of this.state.units.filter((u) => u.alive)) { if (unit.team === 'enemy' && this.state.visibility.get(keyOf(unit.cell)) !== 'visible') continue; ctx.fillStyle = unit.team === 'player' ? '#58dcff' : '#ff6175'; ctx.beginPath(); ctx.arc((unit.cell.x + 0.5) * cw, (unit.cell.z + 0.5) * ch, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = '#d9f7ff'; ctx.lineWidth = 1.5; ctx.strokeRect(2 * cw, 2 * ch, 9 * cw, 6 * ch);
  }
  private onMinimap(event: MouseEvent): void { const canvas = event.currentTarget as HTMLCanvasElement; const rect = canvas.getBoundingClientRect(); const x = Math.floor((event.clientX - rect.left) / rect.width * this.state.width); const z = Math.floor((event.clientY - rect.top) / rect.height * this.state.height); this.battleRenderer?.centerOn({ cell: {x,z} } as Unit); }

  private renderResult(): void { const overlay = this.root.querySelector('.result-overlay'); if (!overlay) return; if (this.state.phase !== 'VICTORY' && this.state.phase !== 'DEFEAT') { overlay.innerHTML = ''; overlay.classList.remove('show'); return; } this.audio.setScene('result'); overlay.classList.add('show'); const squadTotal = this.state.units.filter((u) => u.team === 'player').length; overlay.innerHTML = `<div class="result-card"><p class="eyebrow">MISSION COMPLETE</p><h2>${this.state.phase === 'VICTORY' ? 'The crossing is secure' : 'The shards have fallen'}</h2><p>${this.state.phase === 'VICTORY' ? 'Your Axies drove the Chimera incursion from the ruin.' : 'Regroup, adjust your flanks, and try again.'}</p><dl><div><dt>Turns</dt><dd>${this.state.turn}</dd></div><div><dt>Chimeras defeated</dt><dd>${this.state.units.filter((u) => u.team === 'enemy' && !u.alive).length}/3</dd></div><div><dt>Axies standing</dt><dd>${this.state.units.filter((u) => u.team === 'player' && u.alive).length}/${squadTotal}</dd></div></dl><button class="primary" data-action="retry">Retry Mission</button><button data-action="menu">Return to Menu</button></div>`; overlay.querySelector('[data-action="retry"]')?.addEventListener('click', () => { this.state = createEncounter(this.mission); this.destroyRenderer(); this.root.innerHTML = ''; this.render(); }); overlay.querySelector('[data-action="menu"]')?.addEventListener('click', () => { this.screen = 'menu'; this.render(); }); }

  private modalMarkup(): string { if (!this.showHelp && !this.showSettings && !this.showEndConfirm) return '<div class="modal-layer"></div>'; if (this.showEndConfirm) return `<div class="modal-layer show"><section class="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="end-turn-title"><p class="eyebrow">PHASE CHECK</p><h2 id="end-turn-title">End player phase?</h2><p>Some Axies still have AP. You can keep commanding them or let the Chimeras act now.</p><div class="modal-actions"><button data-action="keep-playing">Keep Playing</button><button class="primary" data-action="confirm-end">End Turn</button></div></section></div>`; if (this.showHelp) return `<div class="modal-layer show"><section class="modal"><button class="modal-close" data-action="close">×</button><p class="eyebrow">FIELD GUIDE</p><h2>Command your squad</h2><div class="help-grid"><b>Left click</b><span>Select, move, or confirm</span><b>Right click / Esc</b><span>Cancel targeting</span><b>WASD</b><span>Pan camera</span><b>Wheel · Q / E</b><span>Zoom · rotate</span><b>1 · 2 · 3</b><span>Select an Axie</span><b>Space · Enter</b><span>Center · end turn</span></div><p>Cover reduces incoming damage. Full cover is stronger. Shrouded terrain is dimmed. Hidden enemies never appear on the field or minimap. Hover a movement tile to preview your path.</p></section></div>`; return `<div class="modal-layer show"><section class="modal"><button class="modal-close" data-action="close">×</button><p class="eyebrow">SETTINGS</p><h2>Battle preferences</h2><label>Music <input data-setting="music" type="range" min="0" max="1" step="0.1" value="${this.settings.music}"></label><label>SFX <input data-setting="sfx" type="range" min="0" max="1" step="0.1" value="${this.settings.sfx}"></label><label class="check"><input data-setting="reducedMotion" type="checkbox" ${this.settings.reducedMotion ? 'checked' : ''}> Reduced motion</label><label class="check"><input data-setting="confirmEnd" type="checkbox" ${this.settings.confirmEnd ? 'checked' : ''}> Confirm end turn when AP remains</label></section></div>`; }
  private rebuildForModal(): void {
    if (this.screen === 'battle') {
      const layer = this.root.querySelector('.modal-layer');
      if (layer) { layer.outerHTML = this.modalMarkup(); this.bindModalControls(); return; }
    }
    this.render();
  }
  private bindModalControls(): void {
    this.root.querySelector('[data-action="close"]')?.addEventListener('click', () => { this.showHelp = false; this.showSettings = false; this.showEndConfirm = false; this.rebuildForModal(); });
    this.root.querySelector('[data-action="keep-playing"]')?.addEventListener('click', () => { this.showEndConfirm = false; this.rebuildForModal(); });
    this.root.querySelector('[data-action="confirm-end"]')?.addEventListener('click', () => this.commitEndTurn());
    this.root.querySelectorAll<HTMLInputElement>('[data-setting]').forEach((input) => input.addEventListener('input', () => { const key = input.dataset.setting as keyof typeof this.settings; if (input.type === 'checkbox') (this.settings[key] as boolean) = input.checked; else (this.settings[key] as number) = Number(input.value); localStorage.setItem('shards-settings', JSON.stringify(this.settings)); this.audio.setVolumes(this.settings.music, this.settings.sfx); }));
  }
  private bindCommon(): void { this.root.querySelector('[data-action="help"]')?.addEventListener('click', () => { this.showHelp = true; this.showSettings = false; this.rebuildForModal(); }); this.root.querySelector('[data-action="settings"]')?.addEventListener('click', () => { this.showSettings = true; this.showHelp = false; this.rebuildForModal(); }); this.bindModalControls(); }
  private onKey = (event: KeyboardEvent): void => { if (event.key === 'Escape' && (this.showHelp || this.showSettings || this.showEndConfirm)) { this.showHelp = false; this.showSettings = false; this.showEndConfirm = false; this.rebuildForModal(); return; } if (event.key === 'Escape' && this.screen === 'battle') this.cancelTargeting(); if (event.key === '?' || event.key.toLowerCase() === 'h') { this.showHelp = !this.showHelp; this.rebuildForModal(); } if (this.screen !== 'battle' || this.showHelp || this.showSettings || this.showEndConfirm) return; if (['1','2','3','4','5'].includes(event.key)) { const unit = this.state.units.filter((u) => u.team === 'player')[Number(event.key) - 1]; if (unit) this.select(unit.id); } if (event.key === 'Enter') this.endTurn(); if (event.key === ' ' && this.state.selectedId) { event.preventDefault(); const unit = getUnit(this.state, this.state.selectedId); if (unit) this.battleRenderer?.centerOn(unit); } };
  private delay(ms: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, ms)); }
  private destroySquadPreview(): void { this.squadPreview?.dispose(); this.squadPreview = undefined; }
  private destroyRenderer(): void { this.battleRenderer?.dispose(); this.battleRenderer = undefined; }
}
