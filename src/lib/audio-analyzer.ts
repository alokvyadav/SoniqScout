// Real client-side audio analysis using Web Audio API.
// Produces metrics + visualization data without sending audio to a server.

export type AudioMetrics = {
  durationSec: number;
  sampleRate: number;
  channels: number;
  lufs: number;          // integrated loudness (K-weighted-ish, approximation)
  truePeakDb: number;    // sample-peak in dBFS (true-peak proxy)
  rmsDb: number;         // overall RMS in dBFS
  crestDb: number;       // peak - rms
  dynamicRangeDb: number;// DR proxy (loud vs quiet RMS windows)
  stereoWidthPct: number;// side/mid energy ratio in %
  stereoCorrelation: number; // -1..1, 1 = mono compat
  clippingPct: number;   // % samples within 0.5 dB of full scale
  vocalClarity: number;  // 0-10 (presence vs lowmid energy heuristic)
  separation: number;    // 0-10 (stereo width + transient density)
  peaks: number[];       // ~600 normalized peak values for waveform (0..1)
  spectrum: number[];    // 64 log-spaced FFT magnitudes (0..1)
  tonalBalance: number[];// 7 band energies (0..1) [sub,bass,lomid,mid,himid,high,air]
  introSec: number;      // first moment with sustained energy
  outroSec: number;      // last moment with sustained energy
};

const TONAL_BANDS: Array<[number, number]> = [
  [20, 60],      // sub
  [60, 250],     // bass
  [250, 500],    // lo-mid
  [500, 2000],   // mid
  [2000, 4000],  // hi-mid
  [4000, 8000],  // high
  [8000, 20000], // air
];

function dbFs(x: number) {
  return 20 * Math.log10(Math.max(x, 1e-12));
}

// In-place iterative radix-2 FFT
function fft(re: Float32Array, im: Float32Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const ang = -2 * Math.PI / len;
    const wRe = Math.cos(ang), wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cRe = 1, cIm = 0;
      for (let k = 0; k < half; k++) {
        const aRe = re[i + k], aIm = im[i + k];
        const bRe = re[i + k + half] * cRe - im[i + k + half] * cIm;
        const bIm = re[i + k + half] * cIm + im[i + k + half] * cRe;
        re[i + k] = aRe + bRe;
        im[i + k] = aIm + bIm;
        re[i + k + half] = aRe - bRe;
        im[i + k + half] = aIm - bIm;
        const nRe = cRe * wRe - cIm * wIm;
        cIm = cRe * wIm + cIm * wRe;
        cRe = nRe;
      }
    }
  }
}

export async function analyzeAudioFile(
  file: File,
  onProgress?: (stage: string) => void,
): Promise<AudioMetrics> {
  onProgress?.("Decoding audio...");
  const buf = await file.arrayBuffer();
  // Some browsers gate AudioContext until user gesture; upload click satisfies that.
  const AC = (window.AudioContext || (window as any).webkitAudioContext);
  const ctx = new AC();
  const audio = await ctx.decodeAudioData(buf.slice(0));
  await ctx.close();

  const sr = audio.sampleRate;
  const ch = audio.numberOfChannels;
  const len = audio.length;
  const duration = audio.duration;

  const L = audio.getChannelData(0);
  const R = ch > 1 ? audio.getChannelData(1) : L;

  onProgress?.("Computing waveform & loudness...");

  // ---- Waveform peaks (max-abs per bucket of mid signal) ----
  const PEAK_BUCKETS = 600;
  const peaks = new Array<number>(PEAK_BUCKETS).fill(0);
  const samplesPerBucket = Math.max(1, Math.floor(len / PEAK_BUCKETS));
  let truePeak = 0;
  let sqSum = 0;
  let clipped = 0;
  let midSqSum = 0;
  let sideSqSum = 0;
  let dotLR = 0, sumL2 = 0, sumR2 = 0;

  for (let b = 0; b < PEAK_BUCKETS; b++) {
    const start = b * samplesPerBucket;
    const end = Math.min(len, start + samplesPerBucket);
    let maxAbs = 0;
    for (let i = start; i < end; i++) {
      const l = L[i], r = R[i];
      const m = (l + r) * 0.5;
      const s = (l - r) * 0.5;
      const a = Math.abs(m);
      if (a > maxAbs) maxAbs = a;
      const aL = Math.abs(l), aR = Math.abs(r);
      const tp = aL > aR ? aL : aR;
      if (tp > truePeak) truePeak = tp;
      if (tp > 0.9441) clipped++; // within ~0.5 dBFS
      sqSum += (l * l + r * r) * 0.5;
      midSqSum += m * m;
      sideSqSum += s * s;
      dotLR += l * r;
      sumL2 += l * l;
      sumR2 += r * r;
    }
    peaks[b] = maxAbs;
  }
  // Normalize peaks to 0..1
  const peakMax = Math.max(...peaks, 1e-6);
  for (let i = 0; i < peaks.length; i++) peaks[i] = peaks[i] / peakMax;

  const rms = Math.sqrt(sqSum / len);
  const rmsDb = dbFs(rms);
  const truePeakDb = dbFs(truePeak);
  const crestDb = truePeakDb - rmsDb;
  const clippingPct = (clipped / len) * 100;

  // Stereo
  const midRms = Math.sqrt(midSqSum / len);
  const sideRms = Math.sqrt(sideSqSum / len);
  const stereoWidthPct = midRms > 1e-6 ? Math.min(100, (sideRms / midRms) * 100) : 0;
  const correlation = ch > 1
    ? (dotLR / Math.max(1e-12, Math.sqrt(sumL2 * sumR2)))
    : 1;

  // ---- Loudness (LUFS-ish): K-weighted approximation via offline render ----
  onProgress?.("K-weighting & LUFS...");
  let lufs = rmsDb - 0.691; // fallback
  let dynamicRangeDb = 0;
  try {
    const off = new OfflineAudioContext(1, len, sr);
    const src = off.createBufferSource();
    src.buffer = audio;
    const hp = off.createBiquadFilter();
    hp.type = "highpass"; hp.frequency.value = 38; hp.Q.value = 0.5;
    const hs = off.createBiquadFilter();
    hs.type = "highshelf"; hs.frequency.value = 1500; hs.gain.value = 4;
    src.connect(hp); hp.connect(hs); hs.connect(off.destination);
    src.start(0);
    const kBuf = await off.startRendering();
    const k = kBuf.getChannelData(0);
    // 400ms block mean square, 100ms hop, ungated mean
    const block = Math.floor(sr * 0.4);
    const hop = Math.floor(sr * 0.1);
    const blocks: number[] = [];
    for (let i = 0; i + block <= k.length; i += hop) {
      let s = 0;
      for (let j = 0; j < block; j++) { const v = k[i + j]; s += v * v; }
      blocks.push(s / block);
    }
    if (blocks.length) {
      const meanMs = blocks.reduce((a, b) => a + b, 0) / blocks.length;
      lufs = -0.691 + 10 * Math.log10(Math.max(meanMs, 1e-12));
      const sorted = [...blocks].sort((a, b) => a - b);
      const lo = sorted[Math.floor(sorted.length * 0.1)];
      const hi = sorted[Math.floor(sorted.length * 0.9)];
      dynamicRangeDb = 10 * Math.log10(Math.max(hi, 1e-12) / Math.max(lo, 1e-12));
    }
  } catch {
    // keep fallbacks
  }

  // ---- Spectrum via FFT averaged across hops ----
  onProgress?.("Frequency analysis...");
  const FFT = 4096;
  const HOPS = Math.min(64, Math.max(8, Math.floor(duration * 2)));
  const mono = new Float32Array(len);
  for (let i = 0; i < len; i++) mono[i] = (L[i] + R[i]) * 0.5;
  const win = new Float32Array(FFT);
  for (let i = 0; i < FFT; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT - 1));

  const magAvg = new Float32Array(FFT / 2);
  const startSkip = Math.floor(len * 0.05);
  const usable = Math.max(FFT, len - startSkip - FFT);
  for (let h = 0; h < HOPS; h++) {
    const off2 = startSkip + Math.floor((usable - FFT) * (h / Math.max(1, HOPS - 1)));
    const re = new Float32Array(FFT);
    const im = new Float32Array(FFT);
    for (let i = 0; i < FFT; i++) re[i] = mono[off2 + i] * win[i];
    fft(re, im);
    for (let i = 0; i < FFT / 2; i++) {
      magAvg[i] += Math.sqrt(re[i] * re[i] + im[i] * im[i]);
    }
  }
  for (let i = 0; i < magAvg.length; i++) magAvg[i] /= HOPS;

  // 64 log-spaced spectrum bands for display
  const SPEC_BARS = 64;
  const minF = 30, maxF = Math.min(sr / 2, 20000);
  const spectrum: number[] = [];
  for (let b = 0; b < SPEC_BARS; b++) {
    const f1 = minF * Math.pow(maxF / minF, b / SPEC_BARS);
    const f2 = minF * Math.pow(maxF / minF, (b + 1) / SPEC_BARS);
    const i1 = Math.max(1, Math.floor((f1 / sr) * FFT));
    const i2 = Math.max(i1 + 1, Math.floor((f2 / sr) * FFT));
    let s = 0;
    for (let i = i1; i < i2 && i < magAvg.length; i++) s += magAvg[i];
    spectrum.push(s / Math.max(1, i2 - i1));
  }
  const specMax = Math.max(...spectrum, 1e-6);
  for (let i = 0; i < spectrum.length; i++) spectrum[i] = spectrum[i] / specMax;

  // 7-band tonal balance
  const tonal: number[] = TONAL_BANDS.map(([lo, hi]) => {
    const i1 = Math.max(1, Math.floor((lo / sr) * FFT));
    const i2 = Math.max(i1 + 1, Math.floor((Math.min(hi, sr / 2) / sr) * FFT));
    let s = 0;
    for (let i = i1; i < i2 && i < magAvg.length; i++) s += magAvg[i] * magAvg[i];
    return Math.sqrt(s / Math.max(1, i2 - i1));
  });
  const tMax = Math.max(...tonal, 1e-6);
  const tonalBalance = tonal.map(v => v / tMax);

  // Vocal clarity proxy: presence band (2k-5k) energy over lowmid (200-500) mud
  const presence = tonal[4]; // 2-4k
  const mud = tonal[2];      // 250-500
  const vocalClarity = Math.max(0, Math.min(10,
    5 + 2.5 * Math.log10((presence + 1e-6) / (mud + 1e-6))
  ));

  // Separation proxy: stereo width × crest factor (transient/dynamic preservation)
  const widthScore = Math.min(1, stereoWidthPct / 50);
  const dynScore = Math.min(1, Math.max(0, (crestDb - 8) / 10));
  const separation = Math.max(0, Math.min(10, (widthScore * 0.6 + dynScore * 0.4) * 10 + 2));

  // Intro / outro markers via short-term RMS threshold (-30 dBFS)
  const winSize = Math.floor(sr * 0.5);
  let introSec = 0, outroSec = duration;
  const thresh = Math.pow(10, -30 / 20);
  for (let i = 0; i + winSize < len; i += winSize) {
    let s = 0;
    for (let j = 0; j < winSize; j++) { const v = mono[i + j]; s += v * v; }
    if (Math.sqrt(s / winSize) > thresh) { introSec = i / sr; break; }
  }
  for (let i = len - winSize; i > 0; i -= winSize) {
    let s = 0;
    for (let j = 0; j < winSize; j++) { const v = mono[i + j]; s += v * v; }
    if (Math.sqrt(s / winSize) > thresh) { outroSec = (i + winSize) / sr; break; }
  }

  return {
    durationSec: duration,
    sampleRate: sr,
    channels: ch,
    lufs: +lufs.toFixed(1),
    truePeakDb: +truePeakDb.toFixed(2),
    rmsDb: +rmsDb.toFixed(1),
    crestDb: +crestDb.toFixed(1),
    dynamicRangeDb: +dynamicRangeDb.toFixed(1),
    stereoWidthPct: Math.round(stereoWidthPct),
    stereoCorrelation: +correlation.toFixed(2),
    clippingPct: +clippingPct.toFixed(3),
    vocalClarity: +vocalClarity.toFixed(1),
    separation: +separation.toFixed(1),
    peaks,
    spectrum,
    tonalBalance,
    introSec: +introSec.toFixed(1),
    outroSec: +outroSec.toFixed(1),
  };
}
