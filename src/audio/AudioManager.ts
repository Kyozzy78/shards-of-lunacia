type MusicScene = 'lobby' | 'battle' | 'result';
type SfxCue = 'select' | 'move' | 'attack' | 'guard' | 'block';
type AxieClass = 'Beast' | 'Bird' | 'Plant' | 'Reptile';

/** Local user-supplied tracks. Playback begins only after an actual user gesture. */
export class AudioManager {
  private readonly tracks = { lobby: new Audio('./assets/audio/lobby.mp3'), battle: new Audio('./assets/audio/battle.mp3') };
  private scene: MusicScene = 'lobby';
  private musicVolume = .35;
  private sfxVolume = .6;
  private unlocked = false;
  private timer = 0;
  private context?: AudioContext;
  private readonly originsSfx: Record<'Beast' | 'Bird' | 'Plant' | 'Reptile' | 'guard' | 'block', string> = {
    Beast: './assets/audio/origins/beast-attack.wav', Bird: './assets/audio/origins/bird-attack.wav', Plant: './assets/audio/origins/plant-attack.wav', Reptile: './assets/audio/origins/reptile-attack.wav',
    guard: './assets/audio/origins/shield.wav', block: './assets/audio/origins/block.wav',
  };

  constructor() {
    for(const track of Object.values(this.tracks)) {track.loop=true;track.preload='none';track.volume=0;track.addEventListener('error',()=>{document.documentElement.dataset.audioStatus='track-unavailable';});}
    document.addEventListener('pointerdown',this.unlock);
    document.addEventListener('keydown',this.unlock);
    document.addEventListener('visibilitychange',this.visibility);
  }
  private unlock=():void=>{if(this.unlocked)return;this.unlocked=true;this.context=new AudioContext();void this.context.resume();this.transition();};
  setScene(scene:MusicScene):void {if(this.scene===scene)return;this.scene=scene;this.transition();}
  setVolumes(music:number,sfx:number):void {this.musicVolume=Math.max(0,Math.min(1,music));this.sfxVolume=Math.max(0,Math.min(1,sfx));this.transition();}
  private transition():void {
    clearInterval(this.timer);if(!this.unlocked||document.hidden)return;
    const active=this.scene==='battle'?'battle':'lobby';const level=this.musicVolume*(this.scene==='result'?.65:1);
    if(level>0)void this.tracks[active].play().then(()=>{document.documentElement.dataset.musicScene=this.scene;}).catch(()=>{document.documentElement.dataset.audioStatus='playback-blocked';});
    const initial={lobby:this.tracks.lobby.volume,battle:this.tracks.battle.volume};const start=performance.now();
    this.timer=window.setInterval(()=>{const t=Math.min(1,(performance.now()-start)/850);for(const key of ['lobby','battle'] as const){const target=key===active?level:0;this.tracks[key].volume=initial[key]+(target-initial[key])*t;if(t===1&&target===0)this.tracks[key].pause();}if(t===1)clearInterval(this.timer);},40);
  }
  cue(kind:SfxCue, axieClass?: AxieClass):void {
    const ctx=this.context;if(!ctx||this.sfxVolume===0||document.hidden)return;
    const source = kind === 'attack' && axieClass ? this.originsSfx[axieClass] : kind === 'guard' || kind === 'block' ? this.originsSfx[kind] : undefined;
    if (source) {
      const sound = new Audio(source); sound.volume = Math.min(1, this.sfxVolume * .72); sound.preload = 'auto';
      void sound.play().then(() => { document.documentElement.dataset.lastSfx = source; }).catch(() => { document.documentElement.dataset.audioStatus = 'sfx-playback-blocked'; });
      return;
    }
    const oscillator=ctx.createOscillator();const gain=ctx.createGain();oscillator.connect(gain);gain.connect(ctx.destination);
    const now=ctx.currentTime;oscillator.type=kind==='attack'?'triangle':'sine';oscillator.frequency.setValueAtTime(kind==='attack'?210:kind==='guard'?420:720,now);oscillator.frequency.exponentialRampToValueAtTime(kind==='attack'?65:1000,now+.13);gain.gain.setValueAtTime(.08*this.sfxVolume,now);gain.gain.exponentialRampToValueAtTime(.001,now+.18);oscillator.start();oscillator.stop(now+.2);
  }
  private visibility=():void=>{if(document.hidden){clearInterval(this.timer);for(const track of Object.values(this.tracks))track.pause();void this.context?.suspend();}else{void this.context?.resume();this.transition();}};
  dispose():void {clearInterval(this.timer);for(const track of Object.values(this.tracks)){track.pause();track.removeAttribute('src');track.load();}document.removeEventListener('pointerdown',this.unlock);document.removeEventListener('keydown',this.unlock);document.removeEventListener('visibilitychange',this.visibility);void this.context?.close();}
}
