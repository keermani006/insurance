# Model Directory

Place ONNX model files here. This directory is excluded from git.

## Required Model

**File**: `yolov8s-damage.onnx`
**Source**: keremberke/yolov8s-vehicle-damage-detection (HuggingFace)

## Download Instructions

```bash
# Option A: Automated (recommended)
pip install ultralytics huggingface-hub
python scripts/export_model.py

# Option B: Manual download (if you have a .pt file)
from ultralytics import YOLO
model = YOLO("path/to/your/best.pt")
model.export(format="onnx", imgsz=640, simplify=True, opset=17)
mv best.onnx models/yolov8s-damage.onnx
```

## Without the Model

The backend **still works** without the model file. It automatically falls
back to a deterministic pixel-stat classifier. You won't see YOLO-quality
bounding box detections, but all API responses remain valid.

## Environment Variable

```
YOLO_MODEL_PATH=./models/yolov8s-damage.onnx
```

Default path if env var is not set: `{project_root}/models/yolov8s-damage.onnx`
