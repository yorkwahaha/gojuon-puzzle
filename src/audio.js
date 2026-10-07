let ctx;
let muted = false;
let bgmMuted = false;
let voiceSource;
let voiceToken = 0;
let bgm;
let bgmKind = null;
let ambientGain = null;
let ambientTimer = 0;
const AUDIO_ALIAS = { di: 'ji', du: 'zu' };
const AMBIENT_NOTES = [110, 130.81, 146.83, 164.81, 196, 164.81, 146.83, 130.81];
const kanaBuffers = new Map();

function audioContext() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function setMuted(value) {
  muted = value;
  if (muted && voiceSource) {
    voiceToken += 1;
    try {
      voiceSource.stop();
    } catch {
      // already stopped
    }
    voiceSource = null;
  }
}

export function unlockAudio() {
  try {
    audioContext();
  } catch {
    // ignore
  }
}

function envGain(node, t, vol, dur) {
  node.gain.setValueAtTime(0.0001, t);
  node.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  node.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

export function playPickup() {
  if (muted) return;
  const ac = audioContext();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const filter = ac.createBiquadFilter();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(140, t + 0.08);
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  envGain(gain, t, 0.05, 0.1);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.12);
}

export function playSnap() {
  if (muted) return;
  const ac = audioContext();
  const t = ac.currentTime;
  [620, 980].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    envGain(gain, t + i * 0.03, 0.07, 0.12);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t + i * 0.03);
    osc.stop(t + 0.18);
  });
}

export function playComplete() {
  if (muted) return;
  const ac = audioContext();
  const t = ac.currentTime;
  const notes = [392, 494, 587, 784];
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    envGain(gain, t + i * 0.11, 0.08, 0.28);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t + i * 0.11);
    osc.stop(t + i * 0.11 + 0.32);
  });
}

export function isBgmMuted() {
  return bgmMuted;
}

function stopAmbient() {
  if (ambientTimer) {
    window.clearInterval(ambientTimer);
    ambientTimer = 0;
  }
  if (!ambientGain) return;
  try {
    ambientGain.disconnect();
  } catch {
    // already disconnected
  }
  ambientGain = null;
}

function startAmbient() {
  stopAmbient();
  const ac = audioContext();
  const master = ac.createGain();
  master.gain.value = 0.05;
  master.connect(ac.destination);
  ambientGain = master;
  let step = 0;
  const pluck = () => {
    if (!ambientGain) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const filter = ac.createBiquadFilter();
    osc.type = 'triangle';
    osc.frequency.value = AMBIENT_NOTES[step % AMBIENT_NOTES.length];
    step += 1;
    filter.type = 'lowpass';
    filter.frequency.value = 720;
    const t = ac.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.4, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 1.6);
  };
  pluck();
  ambientTimer = window.setInterval(pluck, 1200);
}

export function setBgmMuted(value) {
  bgmMuted = value;
  if (bgm) {
    if (bgmMuted) bgm.pause();
    else bgm.play().catch(() => {});
  }
  if (bgmKind !== 'ambient') return;
  if (bgmMuted) stopAmbient();
  else if (!ambientGain) startAmbient();
}

export function stopBgm() {
  bgmKind = null;
  stopAmbient();
  if (!bgm) return;
  const current = bgm;
  bgm = null;
  current.pause();
  current.removeAttribute('src');
  current.load();
}

export function resumeBgm() {
  if (bgmMuted) return;
  if (bgm) {
    bgm.play().catch(() => {});
    return;
  }
  if (bgmKind === 'ambient' && !ambientGain) startAmbient();
}

export function playBgm(name) {
  stopBgm();
  if (!name) {
    bgmKind = 'ambient';
    if (!bgmMuted) startAmbient();
    return;
  }
  bgmKind = 'file';
  const url = `${import.meta.env.BASE_URL}bgm/${encodeURIComponent(name)}.mp3`;
  try {
    const current = new Audio(url);
    bgm = current;
    current.loop = true;
    current.volume = 0.38;
    current.addEventListener('error', () => {
      if (bgm !== current) return;
      bgm = null;
      bgmKind = 'ambient';
      if (!bgmMuted) startAmbient();
    });
    if (!bgmMuted) current.play().catch(() => {});
  } catch {
    bgm = null;
    bgmKind = 'ambient';
    if (!bgmMuted) startAmbient();
  }
}

function kanaUrl(key) {
  const file = AUDIO_ALIAS[key] || key;
  return `${import.meta.env.BASE_URL}kana/${file}.mp3`;
}

function loadKana(key) {
  const url = kanaUrl(key);
  if (!kanaBuffers.has(url)) {
    kanaBuffers.set(
      url,
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error('missing kana');
          return res.arrayBuffer();
        })
        .then((data) => audioContext().decodeAudioData(data.slice(0)))
        .catch((err) => {
          kanaBuffers.delete(url);
          throw err;
        })
    );
  }
  return kanaBuffers.get(url);
}

export function primeKana(key) {
  if (!key) return;
  unlockAudio();
  loadKana(key).catch(() => {});
}

export function speakKana(key) {
  if (muted || !key) return;
  const ac = audioContext();
  const token = ++voiceToken;
  if (voiceSource) {
    try {
      voiceSource.stop();
    } catch {
      // already stopped
    }
    voiceSource = null;
  }
  const start = (buffer) => {
    if (token !== voiceToken) return;
    const src = ac.createBufferSource();
    const gain = ac.createGain();
    src.buffer = buffer;
    gain.gain.value = 0.95;
    src.connect(gain);
    gain.connect(ac.destination);
    src.start();
    voiceSource = src;
    src.onended = () => {
      if (voiceSource === src) voiceSource = null;
    };
  };
  const play = (buffer) => {
    if (ac.state === 'running') {
      start(buffer);
      return;
    }
    ac.resume().then(() => {
      if (token !== voiceToken) return;
      start(buffer);
    }).catch(() => {});
  };
  loadKana(key).then(play).catch(() => {});
}
