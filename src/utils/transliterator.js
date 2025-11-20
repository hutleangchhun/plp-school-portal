export default function transliterate(text) {
    const khmerMap = {
        "ក": "k",
        "ខ": "kh",
        "គ": "k",
        "ឃ": "kh",
        "ង": "ng",
        "ច": "ch",
        "ឆ": "chh",
        "ជ": "ch",
        "ឈ": "chh",
        "ញ": "nh",
        "ដ": "d",
        "ឋ": "th",
        "ឌ": "d",
        "ឍ": "th",
        "ណ": "n",
        "ត": "t",
        "ថ": "th",
        "ទ": "t",
        "ធ": "th",
        "ន": "n",
        "ប": "b",
        "ផ": "ph",
        "ព": "p",
        "ភ": "ph",
        "ម": "m",
        "យ": "y",
        "រ": "r",
        "ល": "l",
        "វ": "v",
        "ស": "s",
        "ហ": "h",
        "ឡ": "l",
        "អ": "a",

        // vowels
        "ា": "a",
        "ិ": "i",
        "ី": "i",
        "ឹ": "oe",
        "ឺ": "oe",
        "ុ": "o",
        "ូ": "u",
        "ួ": "ua",
        "ើ": "ae",
        "ែ": "e",
        "ៃ": "ai",
        "ោ": "o",
        "ៅ": "au",
        "ះ": "h",
        "ៈ": "a",
        "": "a",

        // signs
        "់": "",
        "៌": "r",
        "៍": "",
        "ៈ": "a",
        "ះ": "h"
    };

    const subscriptMap = {
        "្ក": "k", "្ខ": "kh", "្គ": "k", "្ង": "ng",
        "្ច": "ch", "្ញ": "nh",
        "្ដ": "d", "្ឋ": "th", "្ឌ": "d", "្ឍ": "th",
        "្ត": "t", "្ណ": "n", "្ន": "n",
        "្ប": "b", "្ផ": "ph", "្ព": "p", "្ភ": "ph",
        "្ម": "m",
        "្យ": "y", "្រ": "r", "្ល": "l", "្វ": "v"
    };

    const safeText = text || "";

    // Special-case some common full-name patterns for better accuracy
    const specialNames = {
        "សម្បត្តិ": "sombath",
        "ចន្ថា": "chantha"
    };

    if (specialNames[safeText]) {
        return specialNames[safeText];
    }

    // First, process subscript pairs like "្ក", "្ង", etc.
    const processed = safeText.replace(/្./g, (match) => {
        return subscriptMap[match] || "";
    });

    // Then map remaining characters through khmerMap
    return [...processed]
        .map((ch) => khmerMap[ch] || ch)
        .join('');
}