'use strict';

// Audio files are decoded once per path. A host may provide a reviewed cue map;
// otherwise the versioned baseline remains. Gameplay never waits for audio.
class LiveWireAudio extends CinematicAudio {
  static files = ['music','motor','reel-stop','bolt-1','bolt-2','bolt-3','bolt-4','collect','win','bonus','mega','ui'];
  constructor() {
    super();
    this.buffers = new Map(); this.voices = new Set(); this.enabled = false;
    this.paused = false; this.loading = null; this.attempted = false;
    this.music = null; this.musicOffset = null; this.motorSample = null;
    this.motorWanted = false;
    this.buses = null; this.bonusPhase = 'closed';
    const pack = globalThis.CashfireAudioPack || {}, overrides = pack.paths;
    this.gains = {...pack.mix?.gains}; this.loops = {...pack.loops};
    this.musicLevel = this.validLevel(pack.mix?.music, .34);
    this.paths = Object.fromEntries(LiveWireAudio.files.map(name => [name,
      typeof overrides?.[name] === 'string' && overrides[name].trim() ? overrides[name] : 'assets/audio/1.0.0/' + name + '.mp3']));
    if (typeof overrides?.transition === 'string' && overrides.transition.trim()) this.paths.transition = overrides.transition;
    this.decodes = new Map();
    this.revealResultPlayed = false;
  }
  validLevel(value, fallback) { return Number.isFinite(value) && value >= 0 && value <= 2 ? value : fallback; }
  cueGain(name, fallback) { return this.validLevel(this.gains[name], fallback); }
  loopRegion(name, buffer) {
    const region = this.loops[name], duration = buffer.duration;
    const start = Number.isFinite(region?.start) ? Math.max(0, Math.min(region.start, duration)) : 0;
    const end = Number.isFinite(region?.end) ? Math.max(0, Math.min(region.end, duration)) : duration;
    return end > start ? {start, end} : {start:0, end:duration};
  }
  loopOffset(region, offset = region.start) {
    const length = region.end - region.start;
    return region.start + ((offset - region.start) % length + length) % length;
  }
  bonusActive() { return ['loading','playing','paused','error'].includes(this.bonusPhase); }
  applyBonusMix() {
    if (!this.buses || !this.context) return;
    const now = this.context.currentTime;
    const levels = {music:this.bonusActive() ? 0 : this.bonusPhase === 'reveal' ? .5 : 1, effects:this.bonusActive() ? 0 : 1, feature:this.bonusPhase === 'loading' ? 1 : 0, ui:1};
    for (const [name, value] of Object.entries(levels)) {
      const gain = this.buses[name].gain;
      gain.cancelScheduledValues(now);
      // Deployment can fade the base bed over ~80 ms; once footage is ready,
      // hard-zero wins over every pending fade. Recovery takes about 400 ms.
      if (name === 'music' && !['playing','paused','error'].includes(this.bonusPhase)) gain.setTargetAtTime(value, now, this.bonusPhase === 'loading' ? .025 : .13);
      else gain.setValueAtTime(value, now);
    }
    this.report();
  }
  setBonusPhase(phase) {
    if (!['closed','loading','playing','paused','error','reveal'].includes(phase)) return;
    const previous = this.bonusPhase;
    this.bonusPhase = phase;
    if (phase === 'loading') this.revealResultPlayed = false;
    if (this.bonusActive()) {
      this.stopMotor(); this.cancelTransient();
      // Cancel future starts too: a delayed reel/result cue must never leak into
      // native film sound, pause, Retry or the media recovery screen.
      for (const voice of [...this.voices]) if (voice.name !== 'ui') this.release(voice, true);
    }
    if (phase === 'closed' && previous !== 'closed') {
      for (const voice of [...this.voices]) if (['feature','result'].includes(voice.group)) this.release(voice, true);
      this.cancelTransient();
    }
    this.applyBonusMix();
    if (!this.bonusActive()) this.startMusic();
    // Return owns one short transition, after footage has stopped. This cue is
    // not a prize cue and repeated close notifications cannot stack it.
    if (phase === 'closed' && previous === 'reveal' && this.play('transition', {gain:.35, priority:2})) this.duck(.65);
    this.report();
  }
  report() {
    if (typeof document === 'undefined') return;
    document.body.setAttribute('data-audio-loaded', this.buffers.size);
    document.body.setAttribute('data-audio-voices', this.voices.size);
    document.body.setAttribute('data-audio-music', this.music ? 'playing' : 'stopped');
    document.body.setAttribute('data-audio-enabled', this.enabled && !this.paused ? 'true' : 'false');
    document.body.setAttribute('data-audio-bonus-phase', this.bonusPhase);
  }
  unlock() {
    if (!super.unlock()) return false;
    if (!this.buses) {
      this.buses = Object.fromEntries(['music', 'effects', 'feature', 'ui'].map(name => {
        const bus = this.context.createGain(); bus.gain.value = 1;
        bus.connect(this.master); return [name, bus];
      }));
      // Synthesized offline tails share the effects bus, including their wet
      // send, so residual convolution cannot play over native footage.
      this.reverb.disconnect(); this.reverb.connect(this.buses.effects);
    }
    this.enabled = true; this.paused = false;
    this.applyBonusMix();
    if (!this.attempted) this.load();
    this.startMusic(); this.report(); return true;
  }
  load() {
    if (this.loading) return this.loading;
    this.attempted = true;
    const missing = Object.keys(this.paths).filter(name => !this.buffers.has(name));
    const decode = async name => {
      const path = this.paths[name];
      if (!this.decodes.has(path)) {
        const pending = (async () => {
          const response = await fetch(path);
          if (!response.ok) throw Error('Audio unavailable');
          return this.context.decodeAudioData(await response.arrayBuffer());
        })();
        this.decodes.set(path, pending);
        pending.catch(() => { if (this.decodes.get(path) === pending) this.decodes.delete(path); });
      }
      const buffer = await this.decodes.get(path);
      this.buffers.set(name, buffer);
      if (this.enabled && !this.paused) {
        if (name === 'music') this.startMusic();
        if (name === 'motor' && this.motorWanted) this.startMotor();
      }
    };
    // Keep heavy music decoding from gating contacts. Limit concurrent effect
    // decodes; assets arriving late never replay contacts from an old round.
    const queue = missing.filter(name => name !== 'music');
    const worker = async () => { while (queue.length) { try { await decode(queue.shift()); } catch {} } };
    this.loading = Promise.allSettled([
      ...Array.from({length:3}, worker),
      ...(missing.includes('music') ? [decode('music')] : [])
    ]).then(() => {
      this.loading = null;
      this.attempted = Object.keys(this.paths).every(name => this.buffers.has(name));
      if (this.enabled && !this.paused) {
        this.startMusic();
        if (this.motorWanted) this.startMotor();
      }
      this.report();
    });
    return this.loading;
  }
  play(name, {gain = .7, pan = 0, delay = 0, rate = 1, loop = false, group = 'effect', priority = 2} = {}) {
    if (!this.enabled || this.paused || !this.context || !this.buffers.has(name)) return null;
    if (this.bonusActive() && name !== 'ui' && !(group === 'feature' && this.bonusPhase === 'loading')) return null;
    gain = this.cueGain(name, gain);
    if (gain <= 0) return null;
    if (!loop) {
      const effects = [...this.voices].filter(v => v.group !== 'motor');
      if (effects.length >= 16) {
        const candidate = effects.reduce((a,b) => a.priority <= b.priority ? a : b);
        if (candidate.priority > priority) return null;
        this.release(candidate, true);
      }
    }
    const a = this.context, source = a.createBufferSource(), volume = a.createGain(), panner = a.createStereoPanner();
    source.buffer = this.buffers.get(name); source.loop = loop; source.playbackRate.value = rate;
    const region = loop ? this.loopRegion(name, source.buffer) : null;
    if (region) { source.loopStart = region.start; source.loopEnd = region.end; }
    volume.gain.value = gain; panner.pan.value = Math.max(-1, Math.min(1, pan));
    source.connect(volume).connect(panner).connect(this.buses?.[name === 'ui' ? 'ui' : group === 'feature' ? 'feature' : 'effects'] || this.master);
    const voice = {source, volume, panner, group, priority, name, start:a.currentTime + delay, done:false};
    const clean = () => {
      if (voice.done) return; voice.done = true;
      source.disconnect(); volume.disconnect(); panner.disconnect();
      this.voices.delete(voice); this.report();
    };
    voice.clean = clean; source.onended = clean; this.voices.add(voice);
    source.start(voice.start, region?.start || 0); this.report(); return voice;
  }
  release(voice, immediately = false) {
    if (immediately && voice && !voice.done) {
      try { voice.source.stop(); } catch {}
      voice.clean(); return;
    }
    if (!voice || voice.done || voice.releasing) return;
    voice.releasing = true;
    const now = this.context.currentTime;
    voice.volume.gain.cancelScheduledValues(now);
    voice.volume.gain.setTargetAtTime(0, now, .008);
    // stop() also cancels a source whose start is scheduled in the future.
    try { voice.source.stop(now + .035); } catch {}
  }
  startMusic() {
    if (this.music || !this.enabled || this.paused || this.bonusActive() || this.musicLevel <= 0 || !this.buffers.has('music')) return;
    const a = this.context, source = a.createBufferSource(), volume = a.createGain();
    source.buffer = this.buffers.get('music'); source.loop = true;
    const region = this.loopRegion('music', source.buffer);
    source.loopStart = region.start; source.loopEnd = region.end;
    const offset = this.loopOffset(region, this.musicOffset ?? region.start);
    volume.gain.setValueAtTime(0, a.currentTime);
    volume.gain.setTargetAtTime(this.musicLevel, a.currentTime, .3);
    source.connect(volume).connect(this.buses?.music || this.master);
    const music = this.music = {source, volume, started:a.currentTime, offset, region};
    source.onended = () => { source.disconnect(); volume.disconnect(); };
    source.start(a.currentTime, offset);
    this.report();
  }
  stopMusic(immediately = true) {
    if (!this.music) return;
    const music = this.music, now = this.context.currentTime;
    this.musicOffset = this.loopOffset(music.region, music.offset + now - music.started);
    music.volume.gain.cancelScheduledValues(now);
    music.volume.gain.setTargetAtTime(0, now, .012);
    music.source.stop(now + (immediately ? 0 : .06)); this.music = null; this.report();
  }
  duck(duration = .7) {
    if (!this.music || this.bonusActive()) return;
    const now = this.context.currentTime, gain = this.music.volume.gain;
    gain.cancelScheduledValues(now);
    gain.setTargetAtTime(this.musicLevel * .38, now, .025);
    gain.setTargetAtTime(this.musicLevel, now + duration, .35);
  }
  beginRound() {
    this.cancelTransient();
    for (const voice of [...this.voices]) if (voice.group !== 'motor') this.release(voice, true);
    if (this.music) {
      const gain = this.music.volume.gain, now = this.context.currentTime;
      gain.cancelScheduledValues(now); gain.setTargetAtTime(this.musicLevel, now, .12);
    }
  }
  startMotor() {
    if (this.bonusActive()) { this.stopMotor(); return; }
    this.motorWanted = true;
    if (!this.enabled || this.paused) return;
    if (this.cueGain('motor', .18) <= 0) { this.stopMotor(); return; }
    if (this.motorSample && !this.motorSample.done && !this.motorSample.releasing) return;
    if (this.buffers.has('motor')) {
      super.stopMotor();
      this.motorSample = this.play('motor', {gain:.18, loop:true, group:'motor'});
    } else if (!this.motor) {
      super.startMotor(); this.motorWanted = true;
    }
  }
  stopMotor() {
    this.motorWanted = false;
    if (this.motorSample) { this.release(this.motorSample, true); this.motorSample = null; }
    super.stopMotor();
  }
  speed(value, bolts = 0) {
    if (!this.motorSample) { super.speed(value, bolts); return; }
    const now = this.context.currentTime;
    this.motorSample.source.playbackRate.setTargetAtTime(.72 + Math.min(value, 30) * .015 + bolts * .03, now, .12);
    this.motorSample.volume.gain.setTargetAtTime((.09 + Math.min(value, 30) * .003) * this.cueGain('motor', .18) / .18, now, .12);
  }
  stopReel(index, bolt, level = 1) {
    if (!this.enabled || this.paused || this.bonusActive()) return;
    level = Math.max(1, Math.min(4, level));
    if (!this.buffers.has('reel-stop') || (bolt && !this.buffers.has('bolt-' + level))) {
      super.stopReel(index, bolt, level); return;
    }
    const pan = (index - 1.5) * .32;
    this.play('reel-stop', {gain:.65, pan, rate:1 + index * .018});
    // One shared crate take uses one calibrated level. Retain old compensation
    // only when the host really supplies four distinct inherited recordings.
    const sharedLoot = [1,2,3,4].every(n => this.paths['bolt-' + n] === this.paths['bolt-1']);
    if (bolt) { this.play('bolt-' + level, {gain:sharedLoot ? .5 : [0,.48,.8,.95,.44][level], pan}); this.duck(.7 + level * .1); }
  }
  collect(index, reduced) { this.play('collect', {gain:.26, pan:(index-1.5)*.2, delay:reduced ? 0 : .08, priority:1}); }
  featureEntry(count) {
    if (this.bonusPhase !== 'loading') return;
    // Feature identity has one owner: Mega never stacks the Normal sting. A
    // separate win accent belongs to reveal and conveys the confirmed result.
    for (const voice of [...this.voices]) if (voice.group === 'feature') this.release(voice, true);
    const mode = count === 4 ? 'mega' : 'bonus';
    const name = this.buffers.has(mode) ? mode : this.buffers.has('transition') ? 'transition' : null;
    if (name) this.play(name, {gain:count === 4 ? .68 : .78, group:'feature', priority:2});
  }
  result(wins, multiplier) {
    if (!this.enabled || this.paused || this.bonusActive() || multiplier <= 1) return;
    if (this.cueGain('win', wins===4?.82:wins===3?.68:.38) <= 0) return;
    if (this.bonusPhase === 'reveal' && this.revealResultPlayed) return;
    if (this.bonusPhase === 'reveal') this.revealResultPlayed = true;
    if (this.play('win', {gain:wins===4?.82:wins===3?.68:.38, delay:.06, group:'result', priority:3})) {
      this.duck(wins === 4 ? 2.8 : wins === 3 ? 2.4 : 1.2);
    }
    else super.tone(440, .5, 'triangle', .04);
  }
  ui() { this.play('ui', {gain:.08, priority:0}); }
  // The inherited synthesis path is only a loading/offline fallback. Guard it
  // as well as sampled cues so it cannot bypass the native-film mix policy.
  tone(...args) { if (this.enabled && !this.paused && !this.bonusActive()) super.tone(...args); }
  noise(...args) { if (this.enabled && !this.paused && !this.bonusActive()) super.noise(...args); }
  tick(index) { if (this.enabled && !this.paused && !this.bonusActive()) super.tick(index); }
  pause() {
    this.paused = true; this.stopMotor(); this.stopMusic(true);
    this.cancelTransient();
    for (const voice of this.voices) this.release(voice);
    // Suspend follows in the host; immediately stop queued cues so they cannot
    // reappear on resume before the short fade could finish.
    for (const voice of [...this.voices]) this.release(voice, true);
    this.report();
  }
  mute() {
    this.enabled = false; this.stopMotor(); this.stopMusic(true);
    for (const voice of [...this.voices]) this.release(voice, true);
    super.mute(); this.report();
  }
}
