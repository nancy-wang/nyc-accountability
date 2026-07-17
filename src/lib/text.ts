/** Splits prose into short standalone sentences, e.g. for turning a paragraph into bullets or a short lead-in. */
export function splitIntoSentences(text: string, max: number): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);
}
