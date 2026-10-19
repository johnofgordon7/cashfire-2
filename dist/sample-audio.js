'use strict';

// ElevenLabs assets are local, versioned and decoded once. No account or API key
// is needed by players. Gameplay never waits for audio loading or playback.
class LiveWireAudio extends CinematicAudio {
  static files = ['music','motor','reel-stop','bolt-1','bolt-2','bolt-3','bolt-4','collect','win','bonus','mega','ui'];
  constructor() {
    super();
    this.buffers = new Map(); this.voices = new Set(); this.enabled = false;
    this.paused = false; this.loading = null; this.attempted = false;
    this.music = null; this.musicOffset = 0; this.motorSample = null;
    this.motorWanted = false; this.musicLevel = .34;
    this.buses = null;
  }
  report() {
    if (typeof document === 'undefined') return;
    document.body.setAttribute('data-audio-loaded', this.buffers.size);
    document.body.setAttribute('data-audio-voices', this.voices.size);
    document.body.setAttribute('data-audio-music', this.music ? 'playing' : 'stopped');
    document.body.setAttribute('data-audio-enabled', this.enabled && !this.paused ? 'true' : 'false');
  }
  unlock() {
    if (!super.unlock()) return false;
    if (!this.buses) {
      this.buses = Object.fromEntries(['music', 'effects', 'ui'].map(name => {
        const bus = this.context.createGain(); bus.gain.value = 1;
        bus.connect(this.master); return [name, bus];
      }));
    }
    this.enabled = true; this.paused = false;
    if (!this.attempted) this.load();
    this.startMusic(); this.report(); return true;
  }
  load() {
    if (this.loading) return this.loading;
    this.attempted = true;
    const missing = LiveWireAudio.files.filter(name => !this.buffers.has(name));
    const decode = async name => {
      const response = await fetch('assets/audio/1.0.0/' + name + '.mp3');
      if (!response.ok) throw Error('Audio unavailable');
      const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
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
      this.attempted = this.buffers.size === LiveWireAudio.files.length;
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
    if (!loop) {
      const effects = [...this.voices].filter(v => v.group === 'effect');
      if (effects.length >= 16) {
        const candidate = effects.reduce((a,b) => a.priority <= b.priority ? a : b);
        if (candidate.priority > priority) return null;
        this.release(candidate, true);
      }
    }
    const a = this.context, source = a.createBufferSource(), volume = a.createGain(), panner = a.createStereoPanner();
    source.buffer = this.buffers.get(name); source.loop = loop; source.playbackRate.value = rate;
    volume.gain.value = gain; panner.pan.value = Math.max(-1, Math.min(1, pan));
    source.connect(volume).connect(panner).connect(this.buses?.[name === 'ui' ? 'ui' : 'effects'] || this.master);
    const voice = {source, volume, panner, group, priority, name, start:a.currentTime + delay, done:false};
    const clean = () => {
      if (voice.done) return; voice.done = true;
      source.disconnect(); volume.disconnect(); panner.disconnect();
      this.voices.delete(voice); this.report();
    };
    voice.clean = clean; source.onended = clean; this.voices.add(voice);
    source.start(voice.start); this.report(); return voice;
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
    if (this.music || !this.enabled || this.paused || !this.buffers.has('music')) return;
    const a = this.context, source = a.createBufferSource(), volume = a.createGain();
    source.buffer = this.buffers.get('music'); source.loop = true;
    volume.gain.setValueAtTime(0, a.currentTime);
    volume.gain.setTargetAtTime(this.musicLevel, a.currentTime, .3);
    source.connect(volume).connect(this.buses?.music || this.master);
    const music = this.music = {source, volume, started:a.currentTime};
    source.onended = () => { source.disconnect(); volume.disconnect(); };
    source.start(a.currentTime, this.musicOffset % source.buffer.duration);
    this.report();
  }
  stopMusic(immediately = false) {
    if (!this.music) return;
    const music = this.music, now = this.context.currentTime;
    this.musicOffset = (this.musicOffset + now - music.started) % music.source.buffer.duration;
    music.volume.gain.cancelScheduledValues(now);
    music.volume.gain.setTargetAtTime(0, now, .012);
    music.source.stop(now + (immediately ? 0 : .06)); this.music = null; this.report();
  }
  duck(duration = .7) {
    if (!this.music) return;
    const now = this.context.currentTime, gain = this.music.volume.gain;
    gain.cancelScheduledValues(now);
    gain.setTargetAtTime(this.musicLevel * .38, now, .025);
    gain.setTargetAtTime(this.musicLevel, now + duration, .35);
  }
  beginRound() {
    this.cancelTransient();
    for (const voice of this.voices) if (voice.group === 'effect') this.release(voice);
    if (this.music) {
      const gain = this.music.volume.gain, now = this.context.currentTime;
      gain.cancelScheduledValues(now); gain.setTargetAtTime(this.musicLevel, now, .12);
    }
  }
  startMotor() {
    this.stopMotor(); this.motorWanted = true;
    if (!this.enabled || this.paused) return;
    this.motorSample = this.play('motor', {gain:.18, loop:true, group:'motor'});
    if (!this.motorSample) super.startMotor();
  }
  stopMotor() {
    this.motorWanted = false;
    if (this.motorSample) { this.release(this.motorSample); this.motorSample = null; }
    super.stopMotor();
  }
  speed(value, bolts = 0) {
    if (!this.motorSample) { super.speed(value, bolts); return; }
    const now = this.context.currentTime;
    this.motorSample.source.playbackRate.setTargetAtTime(.72 + Math.min(value, 30) * .015 + bolts * .03, now, .12);
    this.motorSample.volume.gain.setTargetAtTime(.09 + Math.min(value, 30) * .003, now, .12);
  }
  stopReel(index, bolt, level = 1) {
    if (!this.enabled || this.paused) return;
    level = Math.max(1, Math.min(4, level));
    if (!this.buffers.has('reel-stop') || (bolt && !this.buffers.has('bolt-' + level))) {
      super.stopReel(index, bolt, level); return;
    }
    const pan = (index - 1.5) * .32;
    this.play('reel-stop', {gain:.65, pan, rate:1 + index * .018});
    // The takes have different crest factors: compensate measured levels so
    // each richer tier grows in body without an excessive fourth-tier peak.
    if (bolt) { this.play('bolt-' + level, {gain:[0,.48,.8,.95,.44][level], pan}); this.duck(.7 + level * .1); }
  }
  collect(index, reduced) { this.play('collect', {gain:.26, pan:(index-1.5)*.2, delay:reduced ? 0 : .08, priority:1}); }
  result(wins, multiplier) {
    if (!this.enabled || this.paused || multiplier <= 1) return;
    const name = wins === 4 ? 'mega' : wins === 3 ? 'bonus' : 'win';
    if (this.play(name, {gain:wins===4?.68:wins===3?1:.38, delay:.06, priority:3})) {
      if (wins === 4) this.play('bonus', {gain:.48, delay:.18, rate:.9, priority:3});
      this.duck(wins === 4 ? 2.8 : wins === 3 ? 2.4 : 1.2);
    }
    else super.tone(440, .5, 'triangle', .04);
  }
  ui() { this.play('ui', {gain:.08, priority:0}); }
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
    this.enabled = false; this.stopMotor(); this.stopMusic();
    for (const voice of this.voices) this.release(voice);
    super.mute(); this.report();
  }
}
