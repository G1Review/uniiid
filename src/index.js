/**
 * @license MIT
 * @author Casper <casper@g1.team>
 * @description
 * This library provides generation and parsing of identifiers composed of digits and limited set of latin letters.
 * Goal is ensure easy and reliable voice transmission across different Latin and Cyrillic alphabet language groups.
 * Identifiers is case insensitive and can include hyphens for better readability
 */

/** @private @constant {string[]} */
const LETTERS = ["A", "D", "F", "K", "L", "M", "N", "R", "T", "W", "X", "Y", "Z"];

/** @private @constant {string[]} */
const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** @private @constant {number} Minimum bits required for crypto security */
const CRYPTO_SAFE_BITS = 128;

/** @private @constant {number} Number of digits for timestamp prefix */
const TIMESTAMP_PREFIX_LENGTH = 10;

/** @private @constant {string} Prefix letter for timestamp */
const TIMESTAMP_PREFIX_PAD_LETTER = "A";

class ID {
  #parts;
  #crypto;
  #timestampPrefixDateOfStartInMinutes;
  #uniques;
  #bits;
  #realSymbols;

  /**
   * @param {("X"|"9"|"-")[]} parts Array of mask tokens
   * @param {boolean} crypto Whether to use crypto-secure randomness
   * @param {number} uniques Total number of unique IDs possible
   * @param {number} bits Bits of entropy (= log₂(uniques))
   */
  constructor(parts, crypto, timestampPrefixDateOfStart, uniques, bits) {
    this.#parts = parts;
    this.#crypto = crypto;
    this.#timestampPrefixDateOfStartInMinutes = timestampPrefixDateOfStart
      ? Math.floor(timestampPrefixDateOfStart.getTime() / 60000)
      : undefined;
    this.#uniques = uniques;
    this.#bits = bits;
    // Count only the slots that actually consume randomness
    this.#realSymbols = parts.filter((p) => p === "X" || p === "9").length;
  }

  #currentTimestamp() {
    const minutesFromStart = Math.floor(Date.now() / 60000) - this.#timestampPrefixDateOfStartInMinutes;
    return String(minutesFromStart).padStart(TIMESTAMP_PREFIX_LENGTH, TIMESTAMP_PREFIX_PAD_LETTER);
  }

  /**
   * The original mask string (e.g. `"XX-99-X9"`)
   * @type {string}
   */
  get mask() {
    return this.#parts.join("");
  }

  /**
   * Whether crypto-secure randomness is enabled
   * @type {boolean}
   */
  get crypto() {
    return this.#crypto;
  }

  /**
   * Total number of possible unique IDs under this mask
   * @type {number}
   */
  get uniques() {
    return this.#uniques;
  }

  /**
   * Bits of entropy in the ID space (≈ log₂(uniques))
   * @type {number}
   */
  get bits() {
    return this.#bits;
  }

  /**
   * @private
   * Generate a Uint8Array of random bytes.
   * Uses Web Crypto API if `crypto` is true, otherwise Math.random().
   * @param {number} len
   * @returns {Uint8Array}
   * @throws {Error} if crypto is requested but unavailable
   */
  #getRandomBytes(len) {
    if (len <= 0) return new Uint8Array(0);

    if (this.#crypto) {
      const cryptoObj = globalThis.crypto || globalThis.Crypto;
      if (!cryptoObj || typeof cryptoObj.getRandomValues !== "function") {
        throw new Error("Crypto.getRandomValues is not available");
      }
      return cryptoObj.getRandomValues(new Uint8Array(len));
    }

    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
  }

  /**
   * Generate a random identifier matching the mask.
   * @returns {string}
   */
  random() {
    let result = "";
    const seed = this.#getRandomBytes(this.#realSymbols);
    let idx = 0;

    for (const part of this.#parts) {
      if (part === "X") {
        result += LETTERS[seed[idx++] % LETTERS.length];
      } else if (part === "9") {
        result += DIGITS[seed[idx++] % DIGITS.length];
      } else {
        // e.g. hyphens
        result += part;
      }
    }

    if (this.#timestampPrefixDateOfStartInMinutes) {
      return `${this.#currentTimestamp()}-${result}`;
    }

    return result;
  }

  #sliceTimestampPrefix(id) {
    const prefix = id.slice(0, TIMESTAMP_PREFIX_LENGTH);
    const rest = id.slice(TIMESTAMP_PREFIX_LENGTH);
    return [prefix, rest];
  }

  #extractTimestampFromPrefix(prefix) {
    if (prefix.length !== TIMESTAMP_PREFIX_LENGTH) return null;
    if (LETTERS.includes(prefix[0]) && prefix[0] !== TIMESTAMP_PREFIX_PAD_LETTER) return null;
    const noPadPrefix = prefix.replaceAll(TIMESTAMP_PREFIX_PAD_LETTER, "");
    const timestamp = parseInt(noPadPrefix, 10);
    if (isNaN(timestamp) || timestamp < 0) return null;
    if (prefix !== String(timestamp).padStart(TIMESTAMP_PREFIX_LENGTH, TIMESTAMP_PREFIX_PAD_LETTER)) return null;
    return timestamp;
  }

  parseTimestamp(id) {
    if (!this.#timestampPrefixDateOfStartInMinutes) return null;
    const [prefix] = this.#sliceTimestampPrefix(String(id).toUpperCase().trim());
    const timestamp = this.#extractTimestampFromPrefix(prefix);
    if (timestamp === null) return null;
    return new Date((timestamp + this.#timestampPrefixDateOfStartInMinutes) * 60000);
  }

  /**
   * Parse and normalize an ID string.
   * Returns the canonical (uppercase + hyphens) form if it matches the mask, or `null`.
   * @param {string} id
   * @returns {string|null}
   */
  parse(id) {
    const incomingString = String(id).toUpperCase().trim();

    let preparedId;
    let maybePrefix;

    if (this.#timestampPrefixDateOfStartInMinutes) {
      const [prefix, rest] = this.#sliceTimestampPrefix(incomingString);

      // Check prefix
      if (!this.#extractTimestampFromPrefix(prefix)) return null;

      preparedId = rest;
      maybePrefix = prefix;
    } else {
      preparedId = incomingString;
    }

    const symbols = preparedId.split("").filter((c) => LETTERS.includes(c) || DIGITS.includes(c));

    if (symbols.length !== this.#realSymbols) return null;

    let out = "";
    let idx = 0;

    for (const part of this.#parts) {
      if (part === "X") {
        const c = symbols[idx++];
        if (!LETTERS.includes(c)) return null;
        out += c;
      } else if (part === "9") {
        const c = symbols[idx++];
        if (!DIGITS.includes(c)) return null;
        out += c;
      } else {
        out += part;
      }
    }

    if (idx !== symbols.length) return null;

    if (maybePrefix) {
      return `${maybePrefix}-${out}`;
    }

    return out;
  }
}

/**
 * Create an ID generator/parser from a mask like `"XX-99-X9"`.
 *
 * @param {string} mask May include hyphens for readability like "99-XX"
 * @param {boolean} [crypto=false] Whether to use Crypto API for randomness
 * @param {Date} timestampPrefixDateOfStart When provided IDS prefixed with 8 symbols timestamp in minutes from date of start.
 * @returns {ID}
 */
export function createID(mask, crypto = false, timestampPrefixDateOfStart = undefined) {
  if (typeof mask !== "string") {
    throw new TypeError("Mask must be a string");
  }
  mask = mask.toUpperCase().trim();
  if (mask === "") {
    throw new TypeError("Mask must be non-empty");
  }
  if (typeof crypto !== "boolean") {
    throw new TypeError("Crypto must be boolean");
  }

  // Split into tokens and validate
  const parts = Array.from(mask);
  parts.forEach((ch, i) => {
    if (ch !== "X" && ch !== "9" && ch !== "-") {
      throw new TypeError(`Invalid mask character "${ch}" at position ${i}`);
    }
  });

  // Count total combinations
  const uniques = parts.reduce((acc, ch) => {
    if (ch === "X") return acc * LETTERS.length;
    if (ch === "9") return acc * DIGITS.length;
    return acc;
  }, 1);

  // Bits of entropy (0 if no variable slots)
  const bits = uniques > 1 ? Math.ceil(Math.log2(uniques)) : 0;

  if (crypto && bits < CRYPTO_SAFE_BITS) {
    throw new Error(`Mask "${mask}" is not crypto-safe: only ${bits} bits (need ≥ ${CRYPTO_SAFE_BITS})`);
  }

  if (timestampPrefixDateOfStart && timestampPrefixDateOfStart.getTime() > Date.now() - 60000 /* 1 minute in past */) {
    throw new Error("Date of start must be in the past");
  }

  return new ID(parts, crypto, timestampPrefixDateOfStart, uniques, bits);
}
