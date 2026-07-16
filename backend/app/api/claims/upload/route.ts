import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "@/lib/supabase/auth";
import { supabaseAdmin } from "@/lib/supabase/client";
import { validateImage } from "@/lib/agents/validateImage";
import { stripExif } from "@/lib/agents/stripExif";
import { rateLimit } from "@/lib/rateLimit";
import { Errors } from "@/lib/errors";
import { logger } from "@/lib/logger";

const BUCKET = process.env["SUPABASE_STORAGE_BUCKET"] ?? "claim-images";
const MAX_BYTES = Number(process.env["MAX_UPLOAD_BYTES"] ?? 10_485_760);

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ─── 1. Authentication ──────────────────────────────────────────
  const auth = await requireAuth(request);
  if (!auth) return Errors.unauthorized();

  const userId = auth.user.id;

  // ─── 2. Rate limiting ───────────────────────────────────────────
  if (!rateLimit.upload(userId)) {
    logger.rateLimit(userId, "upload");
    return Errors.tooManyRequests();
  }

  // ─── 3. Content-Type check ──────────────────────────────────────
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return Errors.badRequest("Request must be multipart/form-data");
  }

  // ─── 4. Parse multipart form ───────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Errors.badRequest("Malformed multipart form data");
  }

  const file = formData.get("image");
  if (!file || !(file instanceof File)) {
    return Errors.badRequest("Missing required field: image");
  }

  // ─── 5. Size check (early rejection before buffering) ──────────
  if (file.size > MAX_BYTES) {
    return Errors.tooLarge();
  }

  if (file.size === 0) {
    return Errors.badRequest("File is empty");
  }

  // ─── 6. Buffer the file ─────────────────────────────────────────
  let rawBuffer: Buffer;
  try {
    rawBuffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return Errors.badRequest("Failed to read file data");
  }

  // ─── 7. Image validation (extension + MIME + magic bytes) ───────
  const validation = validateImage(rawBuffer, file.name, file.type);
  if (!validation.valid) {
    return Errors.unsupportedMedia(validation.error ?? "Invalid image file");
  }

  // ─── 8. Strip EXIF metadata ─────────────────────────────────────
  let cleanBuffer: Buffer;
  try {
    const stripped = await stripExif(rawBuffer);
    cleanBuffer = stripped.buffer;
  } catch {
    return Errors.badRequest("Image could not be processed. Ensure the file is a valid image.");
  }

  // ─── 9. Generate UUID filename (never use original name) ────────
  const extension = (() => {
    const mime = file.type.toLowerCase();
    if (mime === "image/jpeg") return "jpg";
    if (mime === "image/png") return "png";
    if (mime === "image/webp") return "webp";
    return "jpg";
  })();

  const filename = `${userId}/${uuidv4()}.${extension}`;

  // ─── 10. Upload to Supabase Storage ────────────────────────────
  const { error: storageError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(filename, cleanBuffer, {
      contentType: `image/${extension === "jpg" ? "jpeg" : extension}`,
      upsert: false,
    });

  if (storageError) {
    logger.error("upload.storage_failed", userId);
    return Errors.internal();
  }

  // ─── 11. Insert claim record ────────────────────────────────────
  const claimId = uuidv4();

  const { error: dbError } = await supabaseAdmin
    .from("claims")
    .insert({
      id: claimId,
      user_id: userId,
      image_path: filename,
    });

  if (dbError) {
    // Roll back the storage upload to avoid orphaned files
    await supabaseAdmin.storage.from(BUCKET).remove([filename]);
    logger.error("upload.db_insert_failed", userId);
    return Errors.internal();
  }

  logger.upload(userId, claimId, cleanBuffer.length);

  // ─── 12. Return clean response ──────────────────────────────────
  let imageUrl = "";
  const { data: urlData } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(filename, 3600);
  if (urlData) {
    imageUrl = urlData.signedUrl;
  }

  return NextResponse.json(
    { claim_id: claimId, image_path: filename, imageUrl },
    { status: 201 }
  );
}

// Reject all other HTTP methods
export async function GET(): Promise<NextResponse> {
  return Errors.badRequest("Method not allowed");
}
