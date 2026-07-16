/**
 * Damage Classifier — YOLO ONNX inference with pixel-stat fallback.
 *
 * Primary path: YOLOv8s pretrained vehicle damage detection models via onnxruntime-node.
 * Fallback:     Deterministic pixel-stat heuristic (always available, no model needed).
 *
 * Supported HuggingFace models (in priority order, see scripts/export_model.py):
 *   1. abdullahg7/cardd-yolov8s           — CarDD dataset, damage-type classes
 *      Classes: scratch, dent, glass_shatter, tail_lamp_broken, tire_flat
 *   2. nezahatkorkmaz/car-damage-level-detection-yolov8 — severity-level classes
 *      Classes: minor, moderate, severe (maps to DamageType=unknown + explicit Severity)
 *
 * Pipeline:
 *   Image Buffer
 *     → [YOLO ONNX inference if model present]
 *       → Extract detections → NMS → Map class → DamageType + Severity
 *     → [On any failure] pixel-stat fallback
 *     → DamageDetection | AssessmentResult
 *
 * NEVER crashes the backend. Every failure path returns UNCLEAR_DETECTION.
 */

import path from "path";
import fs from "fs";
import sharp from "sharp";
import type { DamageDetection, DamageType, Severity, YOLODetection, BoundingBox, AssessmentResult } from "./types";
import { UNCLEAR_DETECTION, UNCLEAR_ASSESSMENT } from "./types";
import { generateExplanation } from "./explanation";



// ─── Configuration ────────────────────────────────────────────────

const MODEL_PATH =
  process.env["YOLO_MODEL_PATH"] ??
  path.join(process.cwd(), "models", "yolov8s-damage.onnx");

const YOLO_INPUT_SIZE = 640;
const CONF_THRESHOLD = 0.25;  // Minimum confidence to keep a detection
const IOU_THRESHOLD = 0.45;   // NMS IoU overlap threshold

/**
 * YOLO class name → DamageType mapping.
 *
 * Covers:
 *  - abdullahg7/cardd-yolov8s: scratch, dent, glass_shatter, tail_lamp_broken, tire_flat
 *  - nezahatkorkmaz model: minor, moderate, severe (handled separately in CLASS_IS_SEVERITY)
 *  - Generic single-class models: damage
 *  - Additional variants from similar HF repos
 */
const CLASS_TO_DAMAGE_TYPE: Record<string, DamageType> = {
  // ── abdullahg7/cardd-yolov8s (CarDD dataset) ─────────────────────
  scratch:                "scratches",
  scratches:              "scratches",
  dent:                   "dents",
  dents:                  "dents",
  glass_shatter:          "broken_glass",
  broken_glass:           "broken_glass",
  tail_lamp_broken:       "broken_glass",
  tail_lamp:              "broken_glass",
  tire_flat:              "structural",
  flat_tire:              "structural",

  // ── Generic single / multi-class models ──────────────────────────
  damage:                 "dents",     // single-class fallback
  body_damage:            "dents",
  body_scratch:           "scratches",
  bumper_dent:            "dents",
  door_dent:              "dents",
  hood_dent:              "dents",
  fender_dent:            "dents",
  rust:                   "scratches",
  corrosion:              "scratches",
  crack:                  "structural",
  cracked:                "structural",
  crushed:                "structural",
  structural:             "structural",
  flood:                  "flood",
  water_damage:           "flood",
  fire:                   "fire",
  burn:                   "fire",
  burnt:                  "fire",
  total_loss:             "total_loss",
  totaled:                "total_loss",
  write_off:              "total_loss",
};

/**
 * Classes that represent SEVERITY rather than damage type.
 * Used by the nezahatkorkmaz/car-damage-level-detection-yolov8 model
 * whose class names are the severity labels themselves.
 *
 * When a class name matches this map, we treat damage_type as "unknown"
 * and use the mapped value as the severity.
 */
const CLASS_IS_SEVERITY: Record<string, Severity> = {
  minor:         "minor",
  moderate:      "moderate",
  severe:        "severe",
  minor_damage:  "minor",
  moderate_damage: "moderate",
  severe_damage: "severe",
  light:         "minor",
  medium:        "moderate",
  heavy:         "severe",
  low:           "minor",
  high:          "severe",
};

// ─── ONNX session singleton ───────────────────────────────────────

let session: import("onnxruntime-node").InferenceSession | null = null;
let yoloClassNames: string[] = ["damage"]; // default; overridden by model metadata if available
let sessionLoadAttempted = false;

/**
 * Lazily loads the ONNX inference session on first call.
 * Returns null if the model file is missing or onnxruntime-node is unavailable.
 */
async function getSession(): Promise<import("onnxruntime-node").InferenceSession | null> {
  if (sessionLoadAttempted) return session;
  sessionLoadAttempted = true;

  try {
    // Dynamic import — gracefully handles missing onnxruntime-node package
    const ort = await import("onnxruntime-node");

    if (!fs.existsSync(MODEL_PATH)) {
      console.log("[AI] Model file not found at:", MODEL_PATH, "— using pixel-stat fallback");
      return null;
    }

    console.log("[AI] Loading ONNX model from:", MODEL_PATH);
    session = await ort.InferenceSession.create(MODEL_PATH, {
      executionProviders: ["cpu"],
      graphOptimizationLevel: "all",
    });
    console.log("[AI] ONNX model loaded. Input:", session.inputNames, "Output:", session.outputNames);

    // Allow class names to be configured via environment variable.
    // Format: YOLO_CLASS_NAMES=damage,scratch,dent,glass_shatter
    const envClassNames = process.env["YOLO_CLASS_NAMES"];
    if (envClassNames) {
      const parsed = envClassNames.split(",").map((s) => s.trim()).filter(Boolean);
      if (parsed.length > 0) yoloClassNames = parsed;
    }

    return session;
  } catch (err) {
    // onnxruntime-node not installed, or model corrupt — use fallback
    console.warn("[AI] Failed to load ONNX model:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

/**
 * Parses YOLO class names from the Ultralytics metadata format.
 * Input:  "{0: 'scratch', 1: 'dent', 2: 'glass_shatter'}"
 * Output: ["scratch", "dent", "glass_shatter"]
 */
function parseYOLOClassNames(raw: string): string[] {
  // Use Array.from to avoid downlevelIteration requirement
  const matches = Array.from(raw.matchAll(/\d+:\s*['"]([^'"]+)['"]/g));
  if (matches.length === 0) return [];
  const result: string[] = [];
  for (const match of matches) {
    if (match[1]) result.push(match[1]);
  }
  return result;
}

// ─── Image preprocessing ─────────────────────────────────────────

interface PreprocessResult {
  tensor: import("onnxruntime-node").Tensor;
  origWidth: number;
  origHeight: number;
  scale: number;
  padX: number;
  padY: number;
}

/**
 * Letterbox-resizes the image to 640×640 and converts to a normalized
 * Float32 CHW tensor [1, 3, 640, 640] for YOLOv8 inference.
 *
 * Letterboxing (preserving aspect ratio) matches the preprocessing used
 * during model training, giving better detections than simple stretch-resize.
 */
async function preprocessForYOLO(buffer: Buffer): Promise<PreprocessResult> {
  const metadata = await sharp(buffer).metadata();
  const origWidth = metadata.width ?? 640;
  const origHeight = metadata.height ?? 640;

  // Compute letterbox scale and padding
  const scale = Math.min(YOLO_INPUT_SIZE / origWidth, YOLO_INPUT_SIZE / origHeight);
  const newW = Math.round(origWidth * scale);
  const newH = Math.round(origHeight * scale);
  const padX = Math.floor((YOLO_INPUT_SIZE - newW) / 2);
  const padY = Math.floor((YOLO_INPUT_SIZE - newH) / 2);

  // Resize and embed in 640×640 canvas with grey (114, 114, 114) padding
  const { data } = await sharp(buffer)
    .resize(newW, newH)
    .extend({
      top: padY,
      bottom: YOLO_INPUT_SIZE - newH - padY,
      left: padX,
      right: YOLO_INPUT_SIZE - newW - padX,
      background: { r: 114, g: 114, b: 114 },
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // HWC → CHW and normalise to [0, 1]
  const numPixels = YOLO_INPUT_SIZE * YOLO_INPUT_SIZE;
  const float32 = new Float32Array(3 * numPixels);

  for (let i = 0; i < numPixels; i++) {
    float32[i] = (data[i * 3] ?? 0) / 255.0;                    // R
    float32[numPixels + i] = (data[i * 3 + 1] ?? 0) / 255.0;    // G
    float32[2 * numPixels + i] = (data[i * 3 + 2] ?? 0) / 255.0; // B
  }

  const ort = await import("onnxruntime-node");
  const tensor = new ort.Tensor("float32", float32, [1, 3, YOLO_INPUT_SIZE, YOLO_INPUT_SIZE]);

  return { tensor, origWidth, origHeight, scale, padX, padY };
}

// ─── Classifier output parsing (model type: YOLOv8 cls) ──────────

/**
 * Severity class name → Severity mapping for the classifier model.
 *
 * The nezahatkorkmaz/car-damage-level-detection-yolov8 model outputs:
 *   Class 0: "01-minor"
 *   Class 1: "02-moderate"
 *   Class 2: "03-severe"
 */
const CLASSIFIER_SEVERITY_MAP: Record<string, Severity> = {
  "01-minor":    "minor",
  "02-moderate": "moderate",
  "03-severe":   "severe",
  "minor":       "minor",
  "moderate":    "moderate",
  "severe":      "severe",
  // generic numeric fallbacks
  "0":           "minor",
  "1":           "moderate",
  "2":           "severe",
};

/**
 * Reads model-meta.json class names once and caches them.
 */
let classifierClassNames: string[] | null = null;
function getClassifierClassNames(): string[] {
  if (classifierClassNames) return classifierClassNames;
  try {
    const metaPath = path.join(path.dirname(MODEL_PATH), "model-meta.json");
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8")) as { class_names?: string[] };
      if (Array.isArray(meta.class_names) && meta.class_names.length > 0) {
        classifierClassNames = meta.class_names;
        console.log("[AI] Loaded classifier class names:", classifierClassNames);
        return classifierClassNames;
      }
    }
  } catch {
    // ignore parse errors
  }
  // Default for nezahatkorkmaz model
  classifierClassNames = ["01-minor", "02-moderate", "03-severe"];
  return classifierClassNames;
}

/**
 * Parses a classifier output tensor [1, num_classes] into severity + confidence.
 * The model predicts SEVERITY only — damage_type comes from pixel-stat analysis.
 *
 * @param outputData - Flat Float32Array of softmax class probabilities
 * @param numClasses - Number of classes in the output (should be 3)
 * @returns Parsed severity and confidence, or null if confidence < threshold
 */
function parseClassifierOutput(
  outputData: Float32Array,
  numClasses: number
): { severity: Severity; confidence: number; classIndex: number } | null {
  if (numClasses < 1 || outputData.length < numClasses) return null;

  let maxScore = -1;
  let maxIdx = 0;
  for (let i = 0; i < numClasses; i++) {
    const score = outputData[i] ?? 0;
    if (score > maxScore) {
      maxScore = score;
      maxIdx = i;
    }
  }

  // Require at least 30% confidence for any prediction
  if (maxScore < 0.30) return null;

  const classNames = getClassifierClassNames();
  const className = classNames[maxIdx] ?? String(maxIdx);
  const severity: Severity = CLASSIFIER_SEVERITY_MAP[className.toLowerCase()] ??
                              CLASSIFIER_SEVERITY_MAP[String(maxIdx)] ??
                              "minor";

  console.log(`[AI] Classifier result: class="${className}" severity="${severity}" confidence=${(maxScore*100).toFixed(1)}%`);
  return { severity, confidence: maxScore, classIndex: maxIdx };
}

// ─── YOLO detection output parsing ───────────────────────────────

/**
 * Parses YOLOv8 detection output tensor [1, 4+nc, 8400] into raw detections.
 * Applies confidence threshold and converts coords to pixel space.
 *
 * NOTE: Only used for detection models. Classification models use parseClassifierOutput.
 */
function parseYOLOOutput(
  outputData: Float32Array,
  dims: readonly number[],
  origWidth: number,
  origHeight: number,
  scale: number,
  padX: number,
  padY: number
): YOLODetection[] {
  const [, channels, numAnchors] = dims as [number, number, number];
  const nc = (channels ?? 0) - 4;
  const anchors = numAnchors ?? 8400;

  const rawDetections: Array<{
    bbox: number[]; // [x1, y1, x2, y2] in orig pixel space
    score: number;
    classId: number;
  }> = [];

  for (let i = 0; i < anchors; i++) {
    // YOLOv8 output layout: [cx, cy, w, h, c0, c1, ...] per anchor
    const cx = outputData[0 * anchors + i] ?? 0;
    const cy = outputData[1 * anchors + i] ?? 0;
    const bw = outputData[2 * anchors + i] ?? 0;
    const bh = outputData[3 * anchors + i] ?? 0;

    // Find the class with the highest probability
    let maxScore = 0;
    let maxClass = 0;
    for (let c = 0; c < nc; c++) {
      const score = outputData[(4 + c) * anchors + i] ?? 0;
      if (score > maxScore) {
        maxScore = score;
        maxClass = c;
      }
    }

    if (maxScore < CONF_THRESHOLD) continue;

    // Convert from letterbox-padded coords back to original image coords
    const x1Padded = cx - bw / 2;
    const y1Padded = cy - bh / 2;
    const x2Padded = cx + bw / 2;
    const y2Padded = cy + bh / 2;

    // Remove padding and scale back
    const x1 = Math.max(0, (x1Padded - padX) / scale);
    const y1 = Math.max(0, (y1Padded - padY) / scale);
    const x2 = Math.min(origWidth, (x2Padded - padX) / scale);
    const y2 = Math.min(origHeight, (y2Padded - padY) / scale);

    if (x2 <= x1 || y2 <= y1) continue;

    rawDetections.push({ bbox: [x1, y1, x2, y2], score: maxScore, classId: maxClass });
  }

  // Apply NMS
  const nmsResult = nonMaxSuppression(rawDetections, IOU_THRESHOLD);

  return nmsResult.map((d) => ({
    classId: d.classId,
    className: yoloClassNames[d.classId] ?? "damage",
    confidence: d.score,
    bbox: {
      x: d.bbox[0] ?? 0,
      y: d.bbox[1] ?? 0,
      width: (d.bbox[2] ?? 0) - (d.bbox[0] ?? 0),
      height: (d.bbox[3] ?? 0) - (d.bbox[1] ?? 0),
    },
  }));
}

// ─── Non-Maximum Suppression ─────────────────────────────────────

interface RawDetection {
  bbox: number[];   // [x1, y1, x2, y2]
  score: number;
  classId: number;
}

/** IoU (Intersection over Union) between two [x1,y1,x2,y2] boxes */
function computeIoU(a: number[], b: number[]): number {
  const ix1 = Math.max(a[0] ?? 0, b[0] ?? 0);
  const iy1 = Math.max(a[1] ?? 0, b[1] ?? 0);
  const ix2 = Math.min(a[2] ?? 0, b[2] ?? 0);
  const iy2 = Math.min(a[3] ?? 0, b[3] ?? 0);

  if (ix2 <= ix1 || iy2 <= iy1) return 0;

  const intersection = (ix2 - ix1) * (iy2 - iy1);
  const aArea = ((a[2] ?? 0) - (a[0] ?? 0)) * ((a[3] ?? 0) - (a[1] ?? 0));
  const bArea = ((b[2] ?? 0) - (b[0] ?? 0)) * ((b[3] ?? 0) - (b[1] ?? 0));
  const union = aArea + bArea - intersection;

  return union <= 0 ? 0 : intersection / union;
}

/** Greedy NMS — returns only non-overlapping detections sorted by score */
function nonMaxSuppression(detections: RawDetection[], iouThreshold: number): RawDetection[] {
  const sorted = [...detections].sort((a, b) => b.score - a.score);
  const kept: RawDetection[] = [];

  while (sorted.length > 0) {
    const top = sorted.shift();
    if (!top) break;
    kept.push(top);

    // Filter out detections with IoU > threshold against the kept one
    let write = 0;
    for (let i = 0; i < sorted.length; i++) {
      const candidate = sorted[i];
      if (candidate && computeIoU(top.bbox, candidate.bbox) < iouThreshold) {
        sorted[write++] = candidate;
      }
    }
    sorted.length = write;
  }

  return kept;
}

// ─── Detection → DamageDetection mapping ─────────────────────────

/**
 * Maps YOLO detections to the canonical DamageDetection shape.
 *
 * Strategy when multiple detections are present:
 *  - Pick the highest-confidence detection as the primary damage type
 *  - Use bounding box area relative to image size to determine severity
 *  - Multiple detections or large bbox → upgrade severity
 */
function mapDetectionsToDamage(
  detections: YOLODetection[],
  origWidth: number,
  origHeight: number
): DamageDetection {
  if (detections.length === 0) {
    return UNCLEAR_DETECTION;
  }

  // Sort by confidence descending
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const primary = sorted[0]!;

  // Map class name to damage type
  const rawClass = primary.className.toLowerCase().replace(/\s+/g, "_");
  const damage_type: DamageType = CLASS_TO_DAMAGE_TYPE[rawClass] ?? "unknown";

  // Determine severity from bounding box area relative to image
  const imageArea = origWidth * origHeight || 1;
  const bboxArea = primary.bbox.width * primary.bbox.height;
  const coverageRatio = bboxArea / imageArea;

  // Multiple detections increase severity
  const severityUpgrade = detections.length >= 3 ? 1 : detections.length === 2 ? 0 : 0;

  let baseSeverityIdx: number;
  if (coverageRatio > 0.4) {
    baseSeverityIdx = 3; // total_loss
  } else if (coverageRatio > 0.2) {
    baseSeverityIdx = 2; // severe
  } else if (coverageRatio > 0.05) {
    baseSeverityIdx = 1; // moderate
  } else {
    baseSeverityIdx = 0; // minor
  }

  const severityLevels: Severity[] = ["minor", "moderate", "severe", "total_loss"];
  const finalIdx = Math.min(3, baseSeverityIdx + severityUpgrade);
  const severity: Severity = severityLevels[finalIdx] ?? "minor";

  // Confidence: use primary detection's score, penalised if only 1 detection and low coverage
  let confidence = primary.confidence;
  if (detections.length === 1 && coverageRatio < 0.02) {
    confidence *= 0.8; // slightly less sure about tiny detections
  }

  return {
    damage_type,
    severity,
    confidence: Math.min(1, Math.max(0, Number(confidence.toFixed(4)))),
  };
}

// ─── Model type detection ─────────────────────────────────────────

/**
 * Determines whether the loaded ONNX model is a classifier or detector
 * by running a cheap probe on dummy input and inspecting the output shape.
 *
 *  Classifier: output shape [1, N] where N < 50   → "classifier"
 *  Detector:   output shape [1, 4+nc, 8400]        → "detector"
 */
let detectedModelType: "classifier" | "detector" | null = null;

async function detectModelType(
  sess: import("onnxruntime-node").InferenceSession
): Promise<"classifier" | "detector"> {
  if (detectedModelType) return detectedModelType;

  try {
    const ort = await import("onnxruntime-node");
    const dummyInput = new Float32Array(1 * 3 * 640 * 640).fill(0.5);
    const tensor = new ort.Tensor("float32", dummyInput, [1, 3, 640, 640]);
    const results = await sess.run({ [sess.inputNames[0] ?? "images"]: tensor });
    const out = results[sess.outputNames[0] ?? "output0"];
    if (!out) { detectedModelType = "detector"; return "detector"; }

    const dims = out.dims;
    if (dims.length === 2 && dims[0] === 1 && (dims[1] ?? 0) < 50) {
      detectedModelType = "classifier";
      console.log(`[AI] Model type: CLASSIFIER — output shape [${dims.join(",")}]`);
    } else {
      detectedModelType = "detector";
      console.log(`[AI] Model type: DETECTOR — output shape [${dims.join(",")}]`);
    }
  } catch {
    detectedModelType = "detector";
  }

  return detectedModelType;
}

// ─── Classifier inference ─────────────────────────────────────────

/**
 * Runs the ONNX classifier inference.
 * Returns severity + confidence, or null if below threshold.
 */
async function runClassifierInference(buffer: Buffer): Promise<{ severity: Severity; confidence: number } | null> {
  const sess = await getSession();
  if (!sess) return null;

  try {
    const { tensor } = await preprocessForYOLO(buffer);
    const inputName = sess.inputNames[0] ?? "images";
    const results = await sess.run({ [inputName]: tensor });
    const outputName = sess.outputNames[0] ?? "output0";
    const output = results[outputName];
    if (!output) return null;

    const outputData = output.data as Float32Array;
    const numClasses = output.dims[1] ?? outputData.length;
    const parsed = parseClassifierOutput(outputData, numClasses);
    if (!parsed) return null;

    return { severity: parsed.severity, confidence: parsed.confidence };
  } catch (err) {
    console.warn("[AI] Classifier inference error:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

// ─── Detection model inference ────────────────────────────────────

/**
 * Runs YOLO detector ONNX inference.
 */
async function runDetectorInference(buffer: Buffer): Promise<DamageDetection | null> {
  const sess = await getSession();
  if (!sess) return null;

  try {
    const { tensor, origWidth, origHeight, scale, padX, padY } = await preprocessForYOLO(buffer);
    const inputName = sess.inputNames[0] ?? "images";
    const results = await sess.run({ [inputName]: tensor });
    const outputName = sess.outputNames[0] ?? "output0";
    const output = results[outputName];
    if (!output) return null;

    const detections = parseYOLOOutput(
      output.data as Float32Array,
      output.dims,
      origWidth, origHeight, scale, padX, padY
    );
    return mapDetectionsToDamage(detections, origWidth, origHeight);
  } catch (err) {
    console.warn("[AI] Detector inference error:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

// ─── Unified YOLO inference entry point ──────────────────────────

/**
 * Runs ONNX inference, routing to the correct parsing path based on model type.
 *
 * Classifier (nezahatkorkmaz model, output [1,3]):
 *   - Severity comes from the classifier
 *   - Damage type is enriched from pixel-stat analysis
 *
 * Detector (abdullahg7 model, output [1,7+,8400]):
 *   - Full DamageDetection from bounding box predictions
 *
 * Returns null if model unavailable or inference fails.
 */
async function runYOLOInference(buffer: Buffer): Promise<DamageDetection | null> {
  const sess = await getSession();
  if (!sess) return null;

  try {
    const modelType = await detectModelType(sess);

    if (modelType === "classifier") {
      const clsResult = await runClassifierInference(buffer);
      if (!clsResult) return null;

      // Pixel-stats provides damage_type (classifier only predicts severity)
      const pixelStats = await pixelStatFallback(buffer);
      const damage_type: DamageType =
        pixelStats.damage_type === "unclear" ? "structural" : pixelStats.damage_type;

      // Blend confidence: 80% from neural classifier, 20% from pixel stats
      const confidence = Math.min(1, clsResult.confidence * 0.8 + pixelStats.confidence * 0.2);

      console.log(`[AI] Hybrid result: type=${damage_type} severity=${clsResult.severity} conf=${(confidence*100).toFixed(1)}%`);
      return { damage_type, severity: clsResult.severity, confidence };
    } else {
      return await runDetectorInference(buffer);
    }
  } catch (err) {
    console.warn("[AI] runYOLOInference error:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

// ─── Pixel-stat fallback classifier ──────────────────────────────

/**
 * Deterministic pixel-stat heuristic classifier.
 * Used when YOLO model is unavailable or produces no result.
 *
 * Based on:
 *  - Average brightness → darkness indicates fire/severe
 *  - Red channel ratio → fire
 *  - Blue channel ratio → flood
 *  - Luminance variance (stdDev) → structural/edges
 */
async function pixelStatFallback(imageBuffer: Buffer): Promise<DamageDetection> {
  try {
    const { data, info } = await sharp(imageBuffer)
      .resize(128, 128, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = info.width * info.height;
    let totalR = 0, totalG = 0, totalB = 0;

    for (let i = 0; i < data.length; i += 3) {
      totalR += data[i] ?? 0;
      totalG += data[i + 1] ?? 0;
      totalB += data[i + 2] ?? 0;
    }

    const avgR = totalR / pixels;
    const avgG = totalG / pixels;
    const avgB = totalB / pixels;
    const avgBrightness = (avgR + avgG + avgB) / 3;

    const total = avgR + avgG + avgB || 1;
    const rRatio = avgR / total;
    const bRatio = avgB / total;

    const luminances: number[] = [];
    for (let i = 0; i < data.length; i += 3) {
      luminances.push(
        0.299 * (data[i] ?? 0) + 0.587 * (data[i + 1] ?? 0) + 0.114 * (data[i + 2] ?? 0)
      );
    }
    const meanLum = luminances.reduce((a, b) => a + b, 0) / luminances.length;
    const variance =
      luminances.reduce((acc, v) => acc + Math.pow(v - meanLum, 2), 0) / luminances.length;
    const stdDev = Math.sqrt(variance);

    let damage_type: DamageType;
    let severity: Severity;
    let confidence: number;

    if (rRatio > 0.45 && avgBrightness < 100) {
      damage_type = "fire";
      severity = avgBrightness < 50 ? "severe" : "moderate";
      confidence = Math.min(0.88, 0.62 + (rRatio - 0.45) * 0.6);
    } else if (bRatio > 0.40 && avgBrightness < 130) {
      damage_type = "flood";
      severity = avgBrightness < 70 ? "severe" : "moderate";
      confidence = Math.min(0.82, 0.58 + (bRatio - 0.40) * 0.5);
    } else if (stdDev > 70) {
      damage_type = "structural";
      severity = stdDev > 90 ? "severe" : "moderate";
      confidence = stdDev > 90 ? 0.72 : 0.64;
    } else if (stdDev > 45) {
      if (avgBrightness > 160) {
        damage_type = "broken_glass";
        severity = "moderate";
        confidence = 0.62;
      } else {
        damage_type = "dents";
        severity = stdDev > 60 ? "moderate" : "minor";
        confidence = 0.58;
      }
    } else {
      damage_type = "scratches";
      severity = stdDev < 20 ? "minor" : "moderate";
      confidence = 0.52;
    }

    // Very dark image → severe regardless
    if (avgBrightness < 40) severity = "severe";

    // Very low confidence / ambiguous → report as unclear
    if (confidence < 0.30) {
      return { damage_type: "unclear", severity: "minor", confidence };
    }

    return {
      damage_type,
      severity,
      confidence: Math.min(1, Math.max(0, Number(confidence.toFixed(4)))),
    };
  } catch {
    return { ...UNCLEAR_DETECTION };
  }
}

// ─── Public entry point ───────────────────────────────────────────

/**
 * Classifies vehicle damage from an image buffer and returns the standardised AssessmentResult.
 *
 * Pipeline:
 *   1. Try YOLO ONNX inference (if model is present and onnxruntime-node is installed)
 *   2. Fall back to pixel-stat heuristic on any failure
 *   3. If confidence is too low (< 0.30) or both fail, return UNCLEAR_ASSESSMENT
 *   4. Send structured output to Gemini to generate the explanation summary
 *
 * NEVER throws. Always returns a valid AssessmentResult.
 *
 * @param imageBuffer - Clean (EXIF-stripped) image buffer
 */
export async function classifyDamageAI(imageBuffer: Buffer): Promise<AssessmentResult> {
  let detection: DamageDetection | null = null;

  // Try YOLO first
  try {
    const yoloResult = await runYOLOInference(imageBuffer);
    if (yoloResult && yoloResult.confidence >= 0.30) {
      detection = yoloResult;
    }
  } catch {
    // Fall through
  }

  // Fallback to pixel-stat
  if (!detection) {
    try {
      const fallbackResult = await pixelStatFallback(imageBuffer);
      if (fallbackResult && fallbackResult.confidence >= 0.30) {
        detection = fallbackResult;
      }
    } catch {
      // Fall through
    }
  }

  // If both failed or confidence is too low, return UNCLEAR_ASSESSMENT
  if (!detection || detection.damage_type === "unclear" || detection.confidence < 0.30) {
    return UNCLEAR_ASSESSMENT;
  }

  // Convert severity total_loss to severe for the AssessmentResult contract
  const severityMapped = (detection.severity === "total_loss" ? "severe" : detection.severity) as "minor" | "moderate" | "severe";

  // Generate explanation using LLM module
  try {
    const explanationRes = await generateExplanation({
      damage_type: detection.damage_type,
      severity: severityMapped,
      confidence: detection.confidence,
      estimated_cost: 0, // Not available here, but explainer handles it
      fraud_flags: [],
    });

    return {
      damage_type: detection.damage_type,
      severity: severityMapped,
      confidence: detection.confidence,
      explanation: explanationRes.summary,
    };
  } catch {
    return {
      damage_type: detection.damage_type,
      severity: severityMapped,
      confidence: detection.confidence,
      explanation: `Vehicle shows signs of ${detection.damage_type.replace(/_/g, " ")} damage of ${severityMapped} severity.`,
    };
  }
}
