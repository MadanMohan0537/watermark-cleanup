const WATERMARKY =
  /\b(watermark|confidential|draft|sample|preview|generated|produced with|do not copy|copyright)\b/i;

export interface TextProposal {
  original: string;
  proposed: string;
  removals: Array<{ text: string; count: number; reason: string }>;
}

function normalizeLine(line: string) {
  return line.trim().replace(/\s+/g, " ");
}

export function proposeTextCleanup(source: string): TextProposal {
  const lines = source.split(/\r?\n/);
  const counts = new Map<string, number>();
  for (const line of lines) {
    const normalized = normalizeLine(line);
    if (normalized.length < 3) continue;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  const removals: TextProposal["removals"] = [];
  const unique = [...counts.entries()];
  const contentLines = lines.filter((line) => normalizeLine(line).length > 0).length;

  for (const [text, count] of unique) {
    const repeated = count >= 3 && count / Math.max(1, contentLines) >= 0.12;
    const headerFooterShape = text.length <= 80 && count >= 2 && (WATERMARKY.test(text) || isMostlyDecor(text));
    if (!repeated && !headerFooterShape) continue;
    if (looksLikeBody(text) && !WATERMARKY.test(text)) continue;
    removals.push({
      text,
      count,
      reason: repeated ? "Repeated across the document" : "Looks like a header, footer, or overlay label",
    });
  }

  const removalSet = new Set(removals.map((item) => item.text));
  const proposed = lines
    .filter((line) => !removalSet.has(normalizeLine(line)))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();

  return { original: source, proposed, removals };
}

function isMostlyDecor(text: string) {
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (!letters.length) return true;
  const upper = letters.replace(/[^A-Z]/g, "").length / letters.length;
  return upper > 0.7 && text.length < 48;
}

function looksLikeBody(text: string) {
  return text.length > 90 || (text.split(" ").length > 12 && !WATERMARKY.test(text));
}

export function applyTextRemovals(source: string, selected: string[]) {
  const chosen = new Set(selected.map(normalizeLine));
  return source
    .split(/\r?\n/)
    .filter((line) => !chosen.has(normalizeLine(line)))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd()
    .concat(source.endsWith("\n") ? "\n" : "");
}
