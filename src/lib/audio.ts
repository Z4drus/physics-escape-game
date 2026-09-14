/**
 * Son du jeu : effets courts (Kenney, CC0) et fond sonore de salle généré par
 * Web Audio, sans fichier. Tout est différé au premier geste utilisateur,
 * comme l'exige le navigateur, et le silence est mémorisé entre deux visites.
 */

export const SOUND_EFFECTS = {
  click: "/audio/click.ogg",
  open: "/audio/open.ogg",
  close: "/audio/close.ogg",
  seal: "/audio/seal.ogg",
  error: "/audio/error.ogg",
  unlock: "/audio/unlock.ogg",
  pickup: "/audio/pickup.ogg",
  power: "/audio/power.ogg",
  hologram: "/audio/hologram.ogg",
} as const;

export type SoundEffect = keyof typeof SOUND_EFFECTS;

const MUTE_KEY = "physics-escape:muted";
const AMBIENT_GAIN = 0.05;

let context: AudioContext | null = null;
let master: GainNode | null = null;
let ambientGain: GainNode | null = null;
let ambientSource: AudioBufferSourceNode | null = null;
const buffers = new Map<SoundEffect, Promise<AudioBuffer>>();

let muted = readMuted();
const listeners = new Set<() => void>();

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Crée le graphe audio à la première demande, jamais avant un geste. */
function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!context) {
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(context.destination);
  }
  if (context.state === "suspended") void context.resume();
  return context;
}

async function loadBuffer(name: SoundEffect): Promise<AudioBuffer> {
  const existing = buffers.get(name);
  if (existing) return existing;
  const audio = ensureContext();
  if (!audio) throw new Error("Audio indisponible");
  const promise = fetch(SOUND_EFFECTS[name])
    .then((response) => response.arrayBuffer())
    .then((data) => audio.decodeAudioData(data));
  buffers.set(name, promise);
  return promise;
}

/** Joue un effet ; les erreurs de chargement sont silencieuses. */
export function playSound(name: SoundEffect, volume = 0.5): void {
  const audio = ensureContext();
  if (!audio || !master) return;
  loadBuffer(name)
    .then((buffer) => {
      const source = audio.createBufferSource();
      source.buffer = buffer;
      const gain = audio.createGain();
      gain.gain.value = volume;
      source.connect(gain).connect(master as GainNode);
      source.start();
    })
    .catch(() => undefined);
}

/**
 * Fond sonore de salle : bruit brun filtré très bas, qui respire lentement.
 * Il donne l'épaisseur d'un grand volume vide sans attirer l'attention.
 */
export function startAmbient(): void {
  const audio = ensureContext();
  if (!audio || !master || ambientSource) return;

  const seconds = 6;
  const buffer = audio.createBuffer(
    1,
    audio.sampleRate * seconds,
    audio.sampleRate,
  );
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let index = 0; index < data.length; index += 1) {
    const white = Math.random() * 2 - 1;
    // Intégration fuyante : du bruit blanc au bruit brun.
    last = (last + 0.02 * white) / 1.02;
    data[index] = last * 3.5;
  }

  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 220;

  const lfo = audio.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = audio.createGain();
  lfoGain.gain.value = 60;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start();

  ambientGain = audio.createGain();
  ambientGain.gain.value = 0;
  ambientGain.gain.linearRampToValueAtTime(
    AMBIENT_GAIN,
    audio.currentTime + 2.5,
  );

  source.connect(filter).connect(ambientGain).connect(master);
  source.start();
  ambientSource = source;
}

/** Baisse ou rétablit le fond sonore (pause, fenêtres). */
export function duckAmbient(ducked: boolean): void {
  if (!context || !ambientGain) return;
  ambientGain.gain.linearRampToValueAtTime(
    ducked ? AMBIENT_GAIN * 0.35 : AMBIENT_GAIN,
    context.currentTime + 0.6,
  );
}

export function stopAmbient(): void {
  if (!context || !ambientSource || !ambientGain) return;
  ambientGain.gain.linearRampToValueAtTime(0, context.currentTime + 1);
  const source = ambientSource;
  ambientSource = null;
  setTimeout(() => source.stop(), 1100);
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  if (master && context) {
    master.gain.linearRampToValueAtTime(
      next ? 0 : 1,
      context.currentTime + 0.15,
    );
  }
  try {
    window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  } catch {
    // Stockage indisponible : le réglage vaut pour la session.
  }
  for (const listener of listeners) listener();
}

export function subscribeMuted(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Côté serveur, le son n'est jamais coupé : il n'existe pas. */
export function getMutedServerSnapshot(): boolean {
  return false;
}
