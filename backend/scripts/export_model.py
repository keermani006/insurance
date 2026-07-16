#!/usr/bin/env python3
"""
One-time model download and ONNX export script.

Model priority (tries in order):
  1. abdullahg7/cardd-yolov8s          (CarDD dataset, multi-class damage types)
  2. nezahatkorkmaz/car-damage-level-detection-yolov8  (damage severity levels)
  3. yolov8s.pt                         (COCO fallback — generic object detection)

Prerequisites:
  pip install ultralytics huggingface-hub

Usage:
  python scripts/export_model.py

Output:
  models/yolov8s-damage.onnx   — ONNX model for onnxruntime-node
  (prints YOLO_CLASS_NAMES to copy into .env.local)
"""

import os
import sys
import shutil
import json

# Always run from project root
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(project_root)

# ─── Model catalogue ─────────────────────────────────────────────────────────
#
# Each entry: (repo_id, filename_or_None, display_name)
# filename=None means Ultralytics will auto-resolve from the repo.
#
MODELS = [
    {
        "repo_id": "abdullahg7/cardd-yolov8s",
        "filename": "best.pt",
        "display": "abdullahg7/cardd-yolov8s (CarDD multi-class)",
    },
    {
        "repo_id": "nezahatkorkmaz/car-damage-level-detection-yolov8",
        "filename": "car-damage.pt",
        "display": "nezahatkorkmaz/car-damage-level-detection-yolov8 (severity levels)",
    },
]

DEST_ONNX = os.path.join(project_root, "models", "yolov8s-damage.onnx")


def try_download(repo_id: str, filename: str, display: str):
    """Attempts to download a model from HuggingFace Hub. Returns YOLO model or None."""
    from huggingface_hub import hf_hub_download
    try:
        print(f"  Trying: {display}")
        weights_path = hf_hub_download(repo_id=repo_id, filename=filename)
        from ultralytics import YOLO
        model = YOLO(weights_path)
        print(f"  ✓ Loaded. Classes: {model.names}")
        return model
    except Exception as e:
        print(f"  ✗ Failed: {e}")
        return None


def export_to_onnx(model) -> str | None:
    """Exports a YOLO model to ONNX and moves it to models/. Returns dest path or None."""
    print("\nExporting to ONNX (imgsz=640, opset=17, simplify=True)...")
    try:
        export_path = model.export(
            format="onnx",
            imgsz=640,
            simplify=True,
            opset=17,
            dynamic=False,   # Fixed batch — required for onnxruntime-node
        )

        # Locate the .onnx file
        candidates = [
            str(export_path) if export_path else None,
            os.path.join(project_root, "best.onnx"),
            os.path.join(project_root, "car-damage.onnx"),
        ]
        for candidate in candidates:
            if candidate and os.path.exists(candidate):
                shutil.move(candidate, DEST_ONNX)
                return DEST_ONNX

        return None
    except Exception as e:
        print(f"  Export failed: {e}")
        return None


def emit_env_config(model):
    """Prints the env vars the user needs to paste into .env.local."""
    names = model.names  # dict {0: 'scratch', 1: 'dent', ...}
    # Sort by index and build comma-separated list
    ordered = [names[i] for i in sorted(names.keys())]
    class_names_str = ",".join(ordered)

    size_mb = os.path.getsize(DEST_ONNX) / 1_048_576
    print(f"\n{'='*60}")
    print(f"  Model exported: {DEST_ONNX} ({size_mb:.1f} MB)")
    print(f"  Classes ({len(ordered)}): {ordered}")
    print(f"\n  Add these to your .env.local:")
    print(f"  YOLO_MODEL_PATH=./models/yolov8s-damage.onnx")
    print(f"  YOLO_CLASS_NAMES={class_names_str}")
    print(f"{'='*60}\n")

    # Also write a machine-readable metadata file for the TypeScript layer
    meta = {
        "class_names": ordered,
        "num_classes": len(ordered),
        "input_size": 640,
    }
    meta_path = os.path.join(project_root, "models", "model-meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)
    print(f"  Model metadata written to: {meta_path}")


def main():
    # Check dependencies
    try:
        from ultralytics import YOLO  # noqa: F401
        from huggingface_hub import hf_hub_download  # noqa: F401
    except ImportError as e:
        print(f"ERROR: Missing dependency — {e}")
        print("Run: pip install ultralytics huggingface-hub")
        sys.exit(1)

    os.makedirs("models", exist_ok=True)

    # Try each model in priority order
    model = None
    print("\nDownloading pretrained vehicle damage detection model...\n")
    for entry in MODELS:
        model = try_download(entry["repo_id"], entry["filename"], entry["display"])
        if model is not None:
            break

    # Final fallback: standard YOLOv8s (COCO)
    if model is None:
        print("\n  All HuggingFace models failed. Falling back to yolov8s.pt (COCO)...")
        try:
            from ultralytics import YOLO
            model = YOLO("yolov8s.pt")
            print(f"  ✓ Loaded yolov8s (COCO). Note: damage-specific classes will be unavailable.")
        except Exception as e:
            print(f"ERROR: Could not load any model: {e}")
            sys.exit(1)

    # Export to ONNX
    dest = export_to_onnx(model)
    if not dest:
        print("ERROR: ONNX export failed and output file not found.")
        sys.exit(1)

    emit_env_config(model)


if __name__ == "__main__":
    main()
