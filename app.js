/**
 * Morse Code Haptics — main application logic.
 */
import { WebHaptics } from "https://cdn.jsdelivr.net/npm/web-haptics/dist/index.mjs";

const haptics = new WebHaptics();

// --- DOM refs ---
const textInput = document.getElementById("text-input");
const morseOutput = document.getElementById("morse-output");
const playBtn = document.getElementById("play-btn");
const stopBtn = document.getElementById("stop-btn");
const speedSlider = document.getElementById("speed-slider");
const speedLabel = document.getElementById("speed-label");
const playbackIndicator = document.getElementById("playback-indicator");
const signalLight = document.getElementById("signal-light");
const currentCharSpan = document.getElementById("current-char");

const tapBtn = document.getElementById("tap-btn");
const tapMorse = document.getElementById("tap-morse");
const decodedOutput = document.getElementById("decoded-output");
const clearTapBtn = document.getElementById("clear-tap-btn");

const referenceGrid = document.getElementById("reference-grid");

const tabs = document.querySelectorAll(".tab");
const tabContents = document.querySelectorAll(".tab-content");

// --- State ---
let isPlaying = false;
let playAbort = null;
let audioCtx = null;

// Tap decode state
let tapDown = 0;
let tapSymbols = "";
let tapLetters = [];
let tapCurrentMorse = [];
let letterTimeout = null;
let wordTimeout = null;

// --- Haptics helper ---
function vibrate(durationMs) {
  haptics.trigger(durationMs);
}

// --- Tab switching ---
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;
    tabs.forEach((t) => t.classList.remove("active"));
    tabContents.forEach((c) => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-" + target).classList.add("active");
  });
});

// --- Encode tab ---

function renderMorse(morseStr, highlightIndex) {
  if (!morseStr) {
    morseOutput.innerHTML =
      '<span class="placeholder-text">Morse code appears here</span>';
    return;
  }

  const tokens = morseStr.split(" ");
  let letterIdx = 0;
  const parts = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === "/") {
      parts.push('<span class="space"> / </span>');
      continue;
    }

    const isHighlighted = letterIdx === highlightIndex;
    const openHL = isHighlighted ? '<span class="highlight">' : "";
    const closeHL = isHighlighted ? "</span>" : "";

    const rendered = token
      .split("")
      .map((ch) => {
        if (ch === ".") return '<span class="dot">&middot;</span>';
        if (ch === "-") return '<span class="dash">&ndash;</span>';
        return ch;
      })
      .join("");

    parts.push(openHL + rendered + closeHL);
    letterIdx++;
  }

  morseOutput.innerHTML = parts.join(" ");
}

textInput.addEventListener("input", () => {
  const text = textInput.value.trim();
  const morse = Morse.encode(text);
  renderMorse(morse);
  playBtn.disabled = !text;
});

speedSlider.addEventListener("input", () => {
  speedLabel.textContent = speedSlider.value + " WPM";
});

// --- Audio ---

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(durationMs, signal) {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 600;
  gain.gain.value = 0.3;
  osc.connect(gain);
  gain.connect(ctx.destination);

  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.005);
  gain.gain.setValueAtTime(0.3, ctx.currentTime + durationMs / 1000 - 0.005);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + durationMs / 1000);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + durationMs / 1000);

  if (signal) signal.addEventListener("abort", () => osc.stop());
}

// --- Playback ---

function getUnitMs() {
  const wpm = parseInt(speedSlider.value, 10);
  return 1200 / wpm;
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener("abort", () => {
        clearTimeout(id);
        reject(new DOMException("Aborted", "AbortError"));
      });
    }
  });
}

async function playMorse() {
  const text = textInput.value.trim();
  if (!text) return;

  const morse = Morse.encode(text);
  const timeline = Morse.toTimeline(morse);
  const unit = getUnitMs();

  playAbort = new AbortController();
  const signal = playAbort.signal;

  isPlaying = true;
  playBtn.disabled = true;
  stopBtn.disabled = false;
  playbackIndicator.classList.add("active");

  // Figure out letter boundaries for highlighting
  const tokens = morse.split(" ");
  let letterIndices = [];
  let eventIdx = 0;
  let letterIdx = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === "/") {
      letterIndices.push({ eventIndex: eventIdx, letterIndex: -1 });
      eventIdx++;
      continue;
    }
    const numSymbols = token.length;
    for (let s = 0; s < numSymbols; s++) {
      letterIndices.push({ eventIndex: eventIdx, letterIndex: letterIdx });
      eventIdx++;
      if (s < numSymbols - 1) {
        letterIndices.push({ eventIndex: eventIdx, letterIndex: letterIdx });
        eventIdx++;
      }
    }
    if (i < tokens.length - 1) {
      letterIndices.push({ eventIndex: eventIdx, letterIndex: letterIdx });
      eventIdx++;
    }
    letterIdx++;
  }

  try {
    for (let i = 0; i < timeline.length; i++) {
      if (signal.aborted) break;

      const ev = timeline[i];
      const durationMs = ev.duration * unit;

      const li = letterIndices[i];
      if (li && li.letterIndex >= 0) {
        renderMorse(morse, li.letterIndex);
        const letters = text.toUpperCase().replace(/ /g, "");
        currentCharSpan.textContent = letters[li.letterIndex] || "";
      }

      if (ev.type === "on") {
        signalLight.classList.add("on");
        playTone(durationMs, signal);
        vibrate(durationMs);
        await sleep(durationMs, signal);
        signalLight.classList.remove("on");
      } else {
        signalLight.classList.remove("on");
        await sleep(durationMs, signal);
      }
    }
  } catch (e) {
    if (e.name !== "AbortError") throw e;
  }

  stopPlayback();
  renderMorse(morse);
}

function stopPlayback() {
  if (playAbort) playAbort.abort();
  isPlaying = false;
  playBtn.disabled = !textInput.value.trim();
  stopBtn.disabled = true;
  playbackIndicator.classList.remove("active");
  signalLight.classList.remove("on");
  currentCharSpan.textContent = "";
  haptics.cancel();
}

playBtn.addEventListener("click", () => {
  if (!isPlaying) playMorse();
});

stopBtn.addEventListener("click", stopPlayback);

// --- Decode tab (tap input) ---

const DOT_THRESHOLD = 200;

function renderTapMorse() {
  if (tapCurrentMorse.length === 0 && !tapSymbols) {
    tapMorse.innerHTML =
      '<span class="placeholder-text">Your Morse input appears here</span>';
    return;
  }

  const parts = tapCurrentMorse.map((code) =>
    code === "/"
      ? '<span class="space"> / </span>'
      : code
          .split("")
          .map((ch) => {
            if (ch === ".") return '<span class="dot">&middot;</span>';
            if (ch === "-") return '<span class="dash">&ndash;</span>';
            return ch;
          })
          .join("")
  );

  if (tapSymbols) {
    const current = tapSymbols
      .split("")
      .map((ch) => {
        if (ch === ".") return '<span class="dot">&middot;</span>';
        if (ch === "-") return '<span class="dash">&ndash;</span>';
        return ch;
      })
      .join("");
    parts.push(current);
  }

  tapMorse.innerHTML = parts.join(" ");
}

function renderDecoded() {
  const text = tapLetters.join("");
  if (!text) {
    decodedOutput.innerHTML =
      '<span class="placeholder-text">Decoded text appears here</span>';
    return;
  }
  decodedOutput.textContent = text;
}

function finishLetter() {
  if (!tapSymbols) return;
  const decoded = Morse.decodeLetter(tapSymbols);
  tapLetters.push(decoded);
  tapCurrentMorse.push(tapSymbols);
  tapSymbols = "";
  renderTapMorse();
  renderDecoded();
}

function addWordGap() {
  tapLetters.push(" ");
  tapCurrentMorse.push("/");
  renderTapMorse();
  renderDecoded();
}

function onTapStart(e) {
  e.preventDefault();
  tapDown = Date.now();
  tapBtn.classList.add("pressed");

  clearTimeout(letterTimeout);
  clearTimeout(wordTimeout);

  vibrate(10);
}

function onTapEnd(e) {
  e.preventDefault();
  if (!tapDown) return;
  tapBtn.classList.remove("pressed");

  const duration = Date.now() - tapDown;
  tapDown = 0;

  if (duration < DOT_THRESHOLD) {
    tapSymbols += ".";
    vibrate(30);
  } else {
    tapSymbols += "-";
    vibrate(80);
  }

  renderTapMorse();

  letterTimeout = setTimeout(() => {
    finishLetter();
    wordTimeout = setTimeout(addWordGap, 800);
  }, 600);
}

// Support both touch and mouse
tapBtn.addEventListener("mousedown", onTapStart);
tapBtn.addEventListener("mouseup", onTapEnd);
tapBtn.addEventListener("mouseleave", () => {
  if (tapDown) onTapEnd(new Event("mouseleave"));
});
tapBtn.addEventListener("touchstart", onTapStart, { passive: false });
tapBtn.addEventListener("touchend", onTapEnd, { passive: false });

// Keyboard: space bar for tapping
document.addEventListener("keydown", (e) => {
  if (
    e.code === "Space" &&
    document.getElementById("tab-decode").classList.contains("active") &&
    document.activeElement !== textInput
  ) {
    e.preventDefault();
    if (!tapDown) onTapStart(e);
  }
});

document.addEventListener("keyup", (e) => {
  if (
    e.code === "Space" &&
    document.getElementById("tab-decode").classList.contains("active") &&
    document.activeElement !== textInput
  ) {
    e.preventDefault();
    if (tapDown) onTapEnd(e);
  }
});

clearTapBtn.addEventListener("click", () => {
  tapSymbols = "";
  tapLetters = [];
  tapCurrentMorse = [];
  clearTimeout(letterTimeout);
  clearTimeout(wordTimeout);
  renderTapMorse();
  renderDecoded();
});

// --- Reference tab ---

function buildReference() {
  const charMap = Morse.getCharMap();
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const numbers = "0123456789".split("");
  const symbols = Object.keys(charMap).filter(
    (k) => !letters.includes(k) && !numbers.includes(k)
  );

  const all = [...letters, ...numbers, ...symbols];

  all.forEach((char) => {
    const morse = charMap[char];
    if (!morse) return;

    const card = document.createElement("div");
    card.className = "ref-card";

    const rendered = morse
      .split("")
      .map((ch) => {
        if (ch === ".") return '<span class="dot">&middot;</span>';
        if (ch === "-") return '<span class="dash">&ndash;</span>';
        return ch;
      })
      .join("");

    card.innerHTML = `
      <div class="ref-char">${char}</div>
      <div class="ref-morse">${rendered}</div>
    `;

    card.addEventListener("click", () => {
      playReferenceChar(char, morse);
    });

    referenceGrid.appendChild(card);
  });
}

async function playReferenceChar(char, morse) {
  if (isPlaying) return;
  const timeline = Morse.toTimeline(morse);
  const unit = getUnitMs();

  isPlaying = true;
  try {
    for (const ev of timeline) {
      const durationMs = ev.duration * unit;
      if (ev.type === "on") {
        playTone(durationMs);
        vibrate(durationMs);
        await sleep(durationMs);
      } else {
        await sleep(durationMs);
      }
    }
  } finally {
    isPlaying = false;
  }
}

buildReference();

// --- Init ---
speedLabel.textContent = speedSlider.value + " WPM";
