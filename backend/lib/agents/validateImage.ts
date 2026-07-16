/**
 * Image validation — three-layer check:
 *   1. File extension whitelist
 *   2. MIME type whitelist
 *   3. Magic byte (file signature) verification
 *
 * All three must pass. Rejecting on any single layer alone is insufficient
 * because attackers can trivially rename files or forge Content-Type headers.
 */

const MAX_BYTES = Number(process.env["MAX_UPLOAD_BYTES"] ?? 10_485_760); // 10 MB

// Allowed file extensions (lowercase, no dot)
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

// Allowed MIME types
const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/**
 * Known magic byte signatures.
 * Each entry: [byte offset, expected bytes as hex strings].
 * We only verify the first few bytes — enough to identify the container format.
 */
const MAGIC_SIGNATURES: Array<{
  mime: string;
  offset: number;
  bytes: number[];
}> = [
  // JPEG: FF D8 FF
  { mime: "image/jpeg", offset: 0, bytes: [0xff, 0xd8, 0xff] },
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  { mime: "image/png", offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // WebP: RIFF????WEBP — check bytes 0-3 (RIFF) and 8-11 (WEBP)
  { mime: "image/webp", offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates file extension from the original filename.
 * We normalise to lowercase and strip query strings / path segments defensively.
 */
function validateExtension(filename: string): ValidationResult {
  // Strip path components (path traversal defense)
  const base = filename.split(/[\\/]/).pop() ?? "";
  const parts = base.split(".");
  if (parts.length < 2) {
    return { valid: false, error: "File has no extension" };
  }
  const ext = (parts[parts.length - 1] ?? "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `File type .${ext} is not allowed. Accepted: jpg, jpeg, png, webp`,
    };
  }
  return { valid: true };
}

/** Validates the declared MIME type from the form field. */
function validateMime(mime: string): ValidationResult {
  const normalised = mime.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!ALLOWED_MIMES.has(normalised)) {
    return { valid: false, error: `MIME type ${normalised} is not permitted` };
  }
  return { valid: true };
}

/**
 * Verifies magic bytes against known image signatures.
 * For WebP we also check the "WEBP" fourcc at offset 8.
 */
function validateMagicBytes(buffer: Buffer, declaredMime: string): ValidationResult {
  const normMime = declaredMime.split(";")[0]?.trim().toLowerCase() ?? "";

  for (const sig of MAGIC_SIGNATURES) {
    if (sig.mime !== normMime) continue;

    // Check primary signature bytes
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buffer[sig.offset + i] !== sig.bytes[i]) {
        return {
          valid: false,
          error: "File content does not match declared type",
        };
      }
    }

    // Extra check for WebP: bytes 8–11 must be "WEBP"
    if (normMime === "image/webp") {
      const webpMarker = [0x57, 0x45, 0x42, 0x50]; // "WEBP"
      for (let i = 0; i < webpMarker.length; i++) {
        if (buffer[8 + i] !== webpMarker[i]) {
          return {
            valid: false,
            error: "File content does not match declared type",
          };
        }
      }
    }

    return { valid: true };
  }

  return { valid: false, error: "Unrecognised file signature" };
}

/** Validates file size. */
function validateSize(bytes: number): ValidationResult {
  if (bytes > MAX_BYTES) {
    return { valid: false, error: `File too large. Maximum is ${MAX_BYTES / 1_048_576} MB` };
  }
  if (bytes === 0) {
    return { valid: false, error: "File is empty" };
  }
  return { valid: true };
}

/**
 * Full image validation pipeline.
 * All four checks must pass before the file is accepted.
 */
export function validateImage(
  buffer: Buffer,
  filename: string,
  mimeType: string
): ValidationResult {
  const sizeCheck = validateSize(buffer.length);
  if (!sizeCheck.valid) return sizeCheck;

  const extCheck = validateExtension(filename);
  if (!extCheck.valid) return extCheck;

  const mimeCheck = validateMime(mimeType);
  if (!mimeCheck.valid) return mimeCheck;

  const magicCheck = validateMagicBytes(buffer, mimeType);
  if (!magicCheck.valid) return magicCheck;

  return { valid: true };
}
