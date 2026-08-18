/** Optional OCR hook. Core detection does not require an OCR API. */
export async function localizeTextWithOcr(): Promise<never[]> {
  return [];
}
