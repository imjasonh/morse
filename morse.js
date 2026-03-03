/**
 * Morse code encoding/decoding module.
 */
const Morse = (() => {
  const CHAR_TO_MORSE = {
    A: ".-",    B: "-...",  C: "-.-.",  D: "-..",
    E: ".",     F: "..-.",  G: "--.",   H: "....",
    I: "..",    J: ".---",  K: "-.-",   L: ".-..",
    M: "--",    N: "-.",    O: "---",   P: ".--.",
    Q: "--.-",  R: ".-.",   S: "...",   T: "-",
    U: "..-",   V: "...-",  W: ".--",   X: "-..-",
    Y: "-.--",  Z: "--..",

    "0": "-----", "1": ".----", "2": "..---",
    "3": "...--", "4": "....-", "5": ".....",
    "6": "-....", "7": "--...", "8": "---..",
    "9": "----.",

    ".": ".-.-.-", ",": "--..--", "?": "..--..",
    "'": ".----.", "!": "-.-.--", "/": "-..-.",
    "(": "-.--.",  ")": "-.--.-", "&": ".-...",
    ":": "---...", ";": "-.-.-.", "=": "-...-",
    "+": ".-.-.",  "-": "-....-", "_": "..--.-",
    '"': ".-..-.", "$": "...-..-", "@": ".--.-.",
  };

  const MORSE_TO_CHAR = {};
  for (const [char, code] of Object.entries(CHAR_TO_MORSE)) {
    MORSE_TO_CHAR[code] = char;
  }

  /**
   * Encode a text string into Morse code.
   * Words separated by " / ", letters by " ".
   */
  function encode(text) {
    return text
      .toUpperCase()
      .split("")
      .map((ch) => {
        if (ch === " ") return "/";
        return CHAR_TO_MORSE[ch] || "";
      })
      .filter((s) => s !== "")
      .join(" ");
  }

  /**
   * Decode a Morse code string into text.
   * Expects letters separated by spaces, words by " / ".
   */
  function decode(morse) {
    return morse
      .trim()
      .split(" / ")
      .map((word) =>
        word
          .split(" ")
          .map((code) => MORSE_TO_CHAR[code] || "")
          .join("")
      )
      .join(" ");
  }

  /**
   * Convert Morse string into a sequence of timing events.
   * Returns array of { type: "on"|"off", duration: number }
   * where duration is in multiples of a unit.
   *
   * Standard timing:
   *   dot = 1 unit, dash = 3 units
   *   gap between parts of same letter = 1 unit
   *   gap between letters = 3 units
   *   gap between words = 7 units
   */
  function toTimeline(morse) {
    const events = [];
    const tokens = morse.split(" ");

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token === "/") {
        // Word gap: total 7 units. We already added 3 after previous letter,
        // so add 4 more.
        events.push({ type: "off", duration: 4 });
        continue;
      }

      // Each letter
      for (let j = 0; j < token.length; j++) {
        const symbol = token[j];
        if (symbol === ".") {
          events.push({ type: "on", duration: 1 });
        } else if (symbol === "-") {
          events.push({ type: "on", duration: 3 });
        }
        // Intra-character gap
        if (j < token.length - 1) {
          events.push({ type: "off", duration: 1 });
        }
      }

      // Inter-character gap (3 units)
      if (i < tokens.length - 1 && tokens[i + 1] !== "/") {
        events.push({ type: "off", duration: 3 });
      } else if (i < tokens.length - 1 && tokens[i + 1] === "/") {
        events.push({ type: "off", duration: 3 });
      }
    }

    return events;
  }

  /**
   * Get the character map for reference display.
   */
  function getCharMap() {
    return { ...CHAR_TO_MORSE };
  }

  /**
   * Decode a single Morse code token (one letter).
   */
  function decodeLetter(code) {
    return MORSE_TO_CHAR[code] || "?";
  }

  return { encode, decode, toTimeline, getCharMap, decodeLetter };
})();

if (typeof module !== "undefined") {
  module.exports = Morse;
}
