// Relative to the document so domain roots, sub-paths and Capacitor share assets.
const root = `${import.meta.env?.BASE_URL || './'}vision/0.10.18`
export const VISION_WASM_ROOT = root
export const HAND_MODEL_URL = `${root}/hand_landmarker.task`
export const OBJECT_MODEL_URL = `${root}/efficientdet_lite0.tflite`
