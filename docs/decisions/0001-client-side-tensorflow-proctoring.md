# ADR 0001: Client-Side TensorFlow.js Computer Vision for Exam Proctoring

## Context
During campus examinations, universities must prevent exam fraud (e.g. looking at concealed smartphones, secondary screens, or having proxies take the exam). Traditional solutions stream live candidate video feeds to central media servers (WebRTC SFU) for cloud processing. However:
1. Streaming 1,000 concurrent video feeds incurs massive bandwidth and server GPU costs ($> \$5,000$/month).
2. Streaming and storing candidate room video feeds violates student data privacy regulations.

## Decision
We decided to execute computer vision **100% on the client device** using `@tensorflow/tfjs` and `@tensorflow-models/coco-ssd` running MobileNetV2:
- Video frames are captured directly into an ephemeral `<video>` element in browser RAM.
- Inference runs every 500ms locally via WebAssembly / WebGL.
- Only discrete event strings (e.g., `"cell phone detected"`) are transmitted to the database.

## Consequences
- **Positive**: Zero video storage costs, zero server video streaming overhead, 100% privacy-preserving (no student video leaves their machine).
- **Negative**: Slightly higher client CPU/GPU usage; accuracy depends on client webcam quality and lighting conditions.
