/**
 * Perceptual hashing module.
 *
 * Implements dHash (difference hash) — a fast, robust algorithm for detecting
 * visually similar images regardless of minor edits, crops, or re-encodings.
 *
 * Exported API (signatures are fixed — backend depends on them):
 *   computeImageHash(buffer)  → 64-character binary string
 *   hammingDistance(a, b)     → number of differing bits
 *
 * Never modify these function signatures.
 */

import sharp from "sharp";
import { PHASH_BITS } from "./types";

const HASH_SIZE = 8; // 8×8 grid = 64 bits

/**
 * Computes a perceptual dHash of an image buffer.
 *
 * Algorithm:
 *   1. Resize to (HASH_SIZE+1) × HASH_SIZE greyscale pixels
 *   2. For each row, compare each pixel to its right neighbour
 *      left > right → "1", else → "0"
 *   3. Concatenate all bits into a 64-character binary string
 *
 * @param buffer  - Raw image buffer (any format sharp supports)
 * @returns       64-character binary string, e.g. "1001101..."
 *
 * @throws Never — returns a zero-hash on any processing error.
 */
export async function computeImageHash(buffer: Buffer): Promise<string> {
  try {
    const W = HASH_SIZE + 1; // 9 columns
    const H = HASH_SIZE;     // 8 rows

    const { data } = await sharp(buffer)
      .resize(W, H, { fit: "fill" })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let bits = "";

    for (let row = 0; row < H; row++) {
      for (let col = 0; col < HASH_SIZE; col++) {
        const left = data[row * W + col] ?? 0;
        const right = data[row * W + col + 1] ?? 0;
        bits += left > right ? "1" : "0";
      }
    }

    // Pad to ensure exactly 64 bits (defensive — should always be 64)
    return bits.padEnd(PHASH_BITS, "0").slice(0, PHASH_BITS);
  } catch {
    // Zero hash on error — will not match real images in duplicate checks
    return "0".repeat(PHASH_BITS);
  }
}

/**
 * Computes the Hamming distance between two 64-bit binary hash strings.
 *
 * Counts the number of bit positions where the hashes differ.
 * Lower = more similar. Threshold < 5 indicates likely duplicate.
 *
 * @param a  - First hash (64-char binary string)
 * @param b  - Second hash (64-char binary string)
 * @returns  Number of differing bits, or Infinity if lengths differ.
 *
 * @throws Never.
 */
export function hammingDistance(a: string, b: string): number {
  if (!a || !b) return Infinity;
  if (a.length !== b.length) return Infinity;

  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) dist++;
  }
  return dist;
}

/**
 * Converts a 64-bit binary hash string to a 16-character hex string.
 * Useful for compact DB storage.
 */
export function binaryHashToHex(binaryHash: string): string {
  let hex = "";
  for (let i = 0; i < binaryHash.length; i += 4) {
    const nibble = binaryHash.slice(i, i + 4).padStart(4, "0");
    hex += parseInt(nibble, 2).toString(16);
  }
  return hex.padStart(16, "0");
}

/**
 * Converts a 16-char hex hash back to a 64-bit binary string.
 * For comparing hashes stored in different formats.
 */
export function hexHashToBinary(hexHash: string): string {
  let bits = "";
  for (const char of hexHash) {
    bits += parseInt(char, 16).toString(2).padStart(4, "0");
  }
  return bits.slice(0, PHASH_BITS);
}
