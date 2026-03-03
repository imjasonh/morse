# Morse Code Haptics

A web app that converts text to Morse code and plays it back as sound and haptic vibrations. You can also tap in Morse code to decode it back to text.

## Features

- **Text to Morse** — Type any message and see it rendered in Morse code. Hit Play to hear it as audio tones and feel it as haptic vibrations on supported devices.
- **Tap to Decode** — Tap or hold a button (or press the space bar) to input dots and dashes. The app automatically detects letter and word boundaries and decodes your input in real time.
- **Reference Chart** — Browse all letters, numbers, and symbols with their Morse code equivalents. Tap any card to hear/feel it.
- **Adjustable Speed** — Control playback speed from 1 to 10 WPM.
- **Visual Feedback** — A signal light and character highlight show exactly where you are during playback.

## Usage

Open `index.html` in a browser. No build step or server required.

For haptic feedback, use a mobile device or any browser that supports the [Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API).

## Files

| File | Purpose |
|------|---------|
| `index.html` | App shell and markup |
| `style.css` | Dark-themed responsive styles |
| `morse.js` | Morse code encode/decode/timing logic |
| `app.js` | UI interactions, audio, haptics, tap input |
