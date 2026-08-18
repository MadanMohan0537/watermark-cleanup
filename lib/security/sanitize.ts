const UNSAFE = /[^\w.\-]+/g;

export function sanitizeFilename(name: string) {
  const base = name.split(/[/\\]/).pop()?.trim() || "upload";
  const cleaned = base.replace(UNSAFE, "_").replace(/^\.+/, "").slice(0, 80);
  return cleaned || "upload";
}

export function publicFileLabel(mediaKind: string, mimeType: string) {
  const ext =
    mimeType === "image/png"
      ? "png"
      : mimeType === "image/jpeg"
        ? "jpg"
        : mimeType === "image/webp"
          ? "webp"
          : mimeType === "application/pdf"
            ? "pdf"
            : mimeType === "text/markdown"
              ? "md"
              : "txt";
  return `cleaned-${mediaKind}.${ext}`;
}
