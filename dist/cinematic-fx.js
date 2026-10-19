'use strict';

class CinematicAudio {
  constructor() { this.context = null; this.motor = null; this.transients = new Set(); }
  unlock() {
    if (!this.context) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return false;
      const a = this.context = new Audio();
      this.master = a.createDynamicsCompressor();
      this.master.threshold.value = -16; this.master.knee.value = 16;
      this.master.ratio.value = 5; this.master.attack.value = .003; this.master.release.value = .24;
      this.output = a.createGain(); this.output.gain.value = .8;
      this.master.connect(this.output).connect(a.destination);
      this.reverb = a.createConvolver();
      const impulse = a.createBuffer(2, Math.ceil(a.sampleRate * 1.8), a.sampleRate);
      let seed = 7193;
      const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2147483648 - 1; };
      for (let channel = 0; channel < 2; channel++) {
        const data = impulse.getChannelData(channel);
        for (let i = 0; i < data.length; i++) data[i] = i < a.sampleRate * .024 ? 0 : random() * Math.pow(1 - i / data.length, 3.8) * .5;
      }
      this.reverb.buffer = impulse; this.reverb.connect(this.master);
      this.noiseBuffer = a.createBuffer(1, Math.ceil(a.sampleRate * 1.5), a.sampleRate);
      const noise = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < noise.length; i++) noise[i] = random();
    }
    this.context.resume().catch(() => {});
    this.output.gain.setTargetAtTime(.8, this.context.currentTime, .025);
    return true;
  }
  mute() { this.stopMotor(); this.cancelTransient(); if (this.context) this.output.gain.setTargetAtTime(0, this.context.currentTime, .02); }
  track(node, clean) {
    // Original synthesized ticks/fallbacks need the same round ownership as samples.
    if (this.transients.size >= 48) this.transients.values().next().value.cancel();
    const voice = {done:false, cancel:() => { try { node.stop(); } catch {} finish(); }};
    const finish = () => { if (voice.done) return; voice.done = true; node.disconnect(); clean(); this.transients.delete(voice); };
    node.onended = finish; this.transients.add(voice);
  }
  cancelTransient() { for (const voice of [...this.transients]) voice.cancel(); }
  voice(node, pan = 0, wet = .16) {
    const panner = this.context.createStereoPanner(), send = this.context.createGain();
    panner.pan.value = pan; send.gain.value = wet;
    node.connect(panner); panner.connect(this.buses?.effects || this.master); panner.connect(send); send.connect(this.reverb);
    return () => { node.disconnect(); panner.disconnect(); send.disconnect(); };
  }
  tone(f, duration = .1, type = 'sine', volume = .05, end, pan = 0, delay = 0, wet = .16) {
    if (!this.context) return;
    const a = this.context, o = a.createOscillator(), g = a.createGain(), now = a.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(f, now);
    if (end) o.frequency.exponentialRampToValueAtTime(end, now + duration);
    g.gain.setValueAtTime(.0001, now); g.gain.exponentialRampToValueAtTime(volume, now + .006);
    g.gain.exponentialRampToValueAtTime(.0001, now + duration);
    o.connect(g); const clean = this.voice(g, pan, wet);
    this.track(o, clean); o.start(now); o.stop(now + duration + .02);
  }
  noise(index, volume, duration, frequency, type = 'bandpass', end = frequency, delay = 0, wet = .18) {
    if (!this.context) return;
    const a = this.context, source = a.createBufferSource(), filter = a.createBiquadFilter(), g = a.createGain(), now = a.currentTime + delay;
    source.buffer = this.noiseBuffer; filter.type = type; filter.Q.value = .7;
    filter.frequency.setValueAtTime(frequency, now); filter.frequency.exponentialRampToValueAtTime(end, now + duration);
    g.gain.setValueAtTime(.0001, now); g.gain.exponentialRampToValueAtTime(volume, now + .004);
    g.gain.exponentialRampToValueAtTime(.0001, now + duration);
    source.connect(filter).connect(g); const clean = this.voice(g, (index - 1.5) * .38, wet);
    this.track(source, () => { filter.disconnect(); clean(); }); source.start(now); source.stop(now + duration + .02);
  }
  stopReel(index, bolt, level = 1) {
    const pan = (index - 1.5) * .38, pitch = [1, 1.122, 1.26, 1.498][index];
    // Three layers: bearing slam, pitched metal, and a low cinematic body.
    this.noise(index, .20, .10, 1050, 'bandpass', 460, 0, .3);
    this.tone(118 - index * 6, .44, 'sine', .13, 36, pan, 0, .1);
    this.tone(340 * pitch, .55, 'triangle', .022, 320 * pitch, pan, .008, .4);
    this.tone(930 * pitch, .26, 'sine', .017, 810 * pitch, pan, .008, .4);
    if (!bolt) return;
    level=Math.max(1,Math.min(4,level));
    // Each revealed bolt adds electrical voices and a longer, deeper thunder tail.
    this.noise(index, .19, .20, 4700, 'highpass', 900, 0, .4);
    this.noise(index, .30+level*.025, .8+level*.1, 340+level*30, 'lowpass', 55, .035, .4);
    this.noise(index, .075, .48, 2300, 'bandpass', 500, .015, .35);
    this.tone(78, .85, 'sine', .12, 28, pan, .03, .18);
    this.tone(659.25 * pitch, .75, 'sine', .025, undefined, pan, .015, .45);
    const notes=[659.25,830.61,987.77,1318.51];
    for(let k=1;k<level;k++){
      this.tone(notes[k],.5+level*.16,'sine',.018,undefined,(k-1.5)*.32,.055+k*.035,.45);
      this.noise(index,.035,.18+k*.05,3800+k*500,'bandpass',1000,.07+k*.04,.3);
    }
    if(level===4){
      [164.81,246.94,329.63,493.88].forEach((f,k)=>this.tone(f,1.35,'triangle',.012,undefined,(k-1.5)*.3,.06+k*.035,.5));
    }
  }
  tick(index) { this.noise(index, .027, .02, 1800 + index * 180, 'bandpass', 1300, 0, .06); }
  startMotor() {
    this.stopMotor(); if (!this.context) return;
    const a = this.context;
    this.motor = a.createOscillator(); this.motorGain = a.createGain(); this.motorFilter = a.createBiquadFilter();
    this.motor.type = 'sawtooth'; this.motor.frequency.value = 48;
    this.motorFilter.type = 'lowpass'; this.motorFilter.frequency.value = 230;
    this.motorGain.gain.value = .006;
    this.motor.connect(this.motorFilter).connect(this.motorGain).connect(this.master); this.motor.start();
  }
  speed(value, bolts = 0) {
    if (!this.motor) return;
    const now = this.context.currentTime;
    this.motor.frequency.setTargetAtTime(42 + value * 2.2 + bolts * 16, now, .12);
    this.motorGain.gain.setTargetAtTime(.003 + Math.min(value, 25) * .00032 + bolts * .0015, now, .12);
    this.motorFilter.frequency.setTargetAtTime(230 + bolts * 100, now, .12);
  }
  stopMotor() {
    if (!this.motor) return;
    this.motor.stop(); this.motor.disconnect(); this.motorGain.disconnect(); this.motorFilter.disconnect(); this.motor = null;
  }
}
