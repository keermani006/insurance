import sharp from "sharp";

export interface StripResult {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
}

/**
 * Re-encodes the image using sharp, stripping ALL EXIF, IPTC, XMP,
 * and ICC metadata. The output is a clean image with no embedded data.
 *
 * Re-encoding via sharp also defeats polyglot payloads that embed
 * malicious content in metadata sections.
 *
 * @throws Error if the buffer is not a valid supported image.
 */
export async function stripExif(inputBuffer: Buffer): Promise<StripResult> {
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();

  const format = metadata.format ?? "jpeg";
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  let outputBuffer: Buffer;

  switch (format) {
    case "jpeg":
    case "jpg":
      outputBuffer = await image
        .rotate() // auto-rotate from EXIF orientation, then strip EXIF
        .jpeg({ quality: 90 })
        .toBuffer();
      break;

    case "png":
      outputBuffer = await image
        .png({ compressionLevel: 9 })
        .toBuffer();
      break;

    case "webp":
      outputBuffer = await image
        .webp({ quality: 90 })
        .toBuffer();
      break;

    default:
      // Fallback: re-encode as JPEG — this also strips metadata
      outputBuffer = await image.jpeg({ quality: 90 }).toBuffer();
  }

  return { buffer: outputBuffer, width, height, format };
}
