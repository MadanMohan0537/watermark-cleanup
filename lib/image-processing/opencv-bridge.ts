/**
 * Optional OpenCV.js bridge. The Worker bundle stays small by using portable
 * TypeScript operators by default. Load OpenCV.js from the client if you need
 * extra morphology or matching later.
 */
export function hasOpenCv() {
  return typeof globalThis !== "undefined" && "cv" in globalThis;
}
