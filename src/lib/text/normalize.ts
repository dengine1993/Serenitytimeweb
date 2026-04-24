/**
 * Text normalization utilities for embeddings
 */

/**
 * Normalize text by collapsing whitespace and trimming
 */
export function normalizeText(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .replace(/\u00A0/g, ' ')
    .trim();
}

/**
 * Rough chunking to ~800 tokens by character budget (e.g. 3.5 chars ≈ 1 token).
 * We keep 2400–3000 chars as a safe proxy.
 */
export function simpleChunk(text: string, maxChars = 2800): string[] {
  const t = normalizeText(text);
  if (t.length <= maxChars) return [t];
  
  const chunks: string[] = [];
  let i = 0;
  
  while (i < t.length) {
    const end = Math.min(i + maxChars, t.length);
    // try to split on sentence boundary
    const slice = t.slice(i, end);
    const lastDot = slice.lastIndexOf('. ');
    const cut = lastDot > 1200 ? i + lastDot + 1 : end;
    chunks.push(t.slice(i, cut).trim());
    i = cut;
  }
  
  return chunks.filter(Boolean);
}
