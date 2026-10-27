// Optional ambient sound, synthesised with the Web Audio API (no audio files).
// Off by default; the browser only allows it after a click, which is the button.

export function createAmbient() {
  let ctx;
  let master;
  let on = false;
  let bellTimer;
  let noise;
  let scratchGate;

  function build() {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // a low, slowly breathing drone
    const drone = ctx.createBiquadFilter();
    drone.type = 'lowpass';
    drone.frequency.value = 260;
    drone.connect(master);
    for (const [freq, gain] of [[55, 0.3], [110, 0.3], [164.8, 0.12], [220.4, 0.06]]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.value = freq;
      g.gain.value = gain;
      osc.connect(g).connect(drone);
      osc.start();
    }
    const breathe = ctx.createOscillator();
    const breatheDepth = ctx.createGain();
    breathe.frequency.value = 0.07;
    breatheDepth.gain.value = 70;
    breathe.connect(breatheDepth).connect(drone.frequency);
    breathe.start();

    // a thin wind through the shutters
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const wind = ctx.createBufferSource();
    wind.buffer = noise;
    wind.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 520;
    band.Q.value = 0.7;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.05;
    const gust = ctx.createOscillator();
    const gustDepth = ctx.createGain();
    gust.frequency.value = 0.05;
    gustDepth.gain.value = 0.04;
    gust.connect(gustDepth).connect(windGain.gain);
    gust.start();
    wind.connect(band).connect(windGain).connect(master);
    wind.start();
  }

  // a faint, far-off bell now and then
  function bell() {
    if (!on) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = [392, 523.25, 587.33][Math.floor(Math.random() * 3)];
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.06, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 4);
    osc.connect(g).connect(master);
    osc.start(now);
    osc.stop(now + 4.2);
    bellTimer = setTimeout(bell, 10000 + Math.random() * 15000);
  }

  // a faint quill scratching, in bursts, for each { at, dur } segment (seconds from now)
  function scratch(segments) {
    if (!on) return;
    stopScratch();
    const start = ctx.currentTime;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 2800;
    band.Q.value = 1.2;
    scratchGate = ctx.createGain();
    band.connect(scratchGate).connect(master);
    for (const { at, dur } of segments) {
      for (let t = 0; t < dur; t += 0.07 + Math.random() * 0.09) {
        const s = start + at + t;
        const src = ctx.createBufferSource();
        const env = ctx.createGain();
        src.buffer = noise;
        env.gain.setValueAtTime(0.0001, s);
        env.gain.exponentialRampToValueAtTime(0.1 * (0.5 + Math.random()), s + 0.012);
        env.gain.exponentialRampToValueAtTime(0.0001, s + 0.06);
        src.connect(env).connect(band);
        src.start(s, Math.random() * 1.5, 0.07);
      }
    }
  }

  function stopScratch() {
    if (scratchGate) {
      scratchGate.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
      scratchGate = null;
    }
  }

  return {
    scratch,
    stopScratch,
    // resolves to true when sound is now on, false when muted
    async toggle() {
      if (!ctx) build();
      if (!on) {
        await ctx.resume();
        master.gain.setTargetAtTime(0.4, ctx.currentTime, 0.8);
        on = true;
        bellTimer = setTimeout(bell, 3500);
      } else {
        on = false;
        clearTimeout(bellTimer);
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
        setTimeout(() => {
          if (!on) ctx.suspend();
        }, 1200);
      }
      return on;
    },
  };
}
