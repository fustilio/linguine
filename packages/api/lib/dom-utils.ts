/**
 * Finds word boundaries using Intl.Segmenter when available.
 * Falls back to null if unavailable or on error.
 */
const getWordBoundaryWithSegmenter = (text: string, offset: number): { start: number; end: number } | null => {
  try {
    if (!('Segmenter' in Intl)) return null;
    const segmenter = new Intl.Segmenter('und', { granularity: 'word' });
    const segments = Array.from(segmenter.segment(text));
    // Find segment containing the offset
    const containing = segments.find(s => {
      const start = s.index;
      const end = start + s.segment.length;
      return offset >= start && offset <= end;
    });
    if (!containing) return null;
    // If word-like, return its boundaries
    if (containing.isWordLike) return { start: containing.index, end: containing.index + containing.segment.length };
    // Otherwise, find nearest word-like segment
    const wordSegments = segments.filter(s => s.isWordLike);
    const prev = wordSegments.filter(s => s.index + s.segment.length <= containing.index).pop();
    const next = wordSegments.find(s => s.index >= containing.index + containing.segment.length);
    if (!prev && !next) return null;
    // Prefer closest word-like segment
    if (!next && prev) return { start: prev.index, end: prev.index + prev.segment.length };
    if (!prev && next) return { start: next.index, end: next.index + next.segment.length };

    if (prev && next) {
      const prevDist = containing.index - (prev.index + prev.segment.length);
      const nextDist = next.index - (containing.index + containing.segment.length);
      return prevDist <= nextDist
        ? { start: prev.index, end: prev.index + prev.segment.length }
        : { start: next.index, end: next.index + next.segment.length };
    }
    throw Error('Should not happen');
  } catch {
    return null;
  }
};

const expandTextNodeBoundary = (text: string, offset: number, isStart: boolean): number => {
  const seg = 'Segmenter' in Intl ? getWordBoundaryWithSegmenter(text, offset) : null;
  if (seg) return isStart ? seg.start : seg.end;
  // Fallback to regex
  if (isStart) {
    let start = offset;
    while (start > 0 && /\w/.test(text[start - 1])) start--;
    return start;
  }
  let end = offset;
  while (end < text.length && /\w/.test(text[end])) end++;
  return end;
};

export const expandSelectionToWordBoundaries = (range: Range): Range => {
  const expandedRange = range.cloneRange();
  const startContainer = expandedRange.startContainer;
  const endContainer = expandedRange.endContainer;

  if (startContainer.nodeType === Node.TEXT_NODE) {
    const text = startContainer.textContent || '';
    expandedRange.setStart(startContainer, expandTextNodeBoundary(text, expandedRange.startOffset, true));
  }

  if (endContainer.nodeType === Node.TEXT_NODE) {
    const text = endContainer.textContent || '';
    expandedRange.setEnd(endContainer, expandTextNodeBoundary(text, expandedRange.endOffset, false));
  }

  return expandedRange;
};

export const findSentenceStart = (text: string, position: number): number => {
  const sentenceEnders = /[.!?]\s+/g;
  const textBefore = text.substring(0, position);
  let lastMatch = 0;
  sentenceEnders.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = sentenceEnders.exec(textBefore)) !== null) lastMatch = match.index + match[0].length;
  return lastMatch;
};

export const findSentenceEnd = (text: string, position: number): number => {
  const sentenceEnders = /[.!?](?=\s|$)/;
  const textAfter = text.substring(position);
  const match = textAfter.match(sentenceEnders);
  return match && match.index !== undefined ? position + match.index + 1 : text.length;
};

export const analyzeTextFormatting = (text: string) => {
  const trimmedText = text.trim();
  return {
    hasCapitalization: /[A-Z]/.test(trimmedText),
    hasPunctuation: /[.!?,:;]/.test(trimmedText),
    startsWithCapital: /^[A-Z]/.test(trimmedText),
    endsWithPunctuation: /[.!?]$/.test(trimmedText),
  };
};

export const preserveOriginalFormatting = (originalText: string, rewrittenText: string): string => {
  const originalFormatting = analyzeTextFormatting(originalText);
  let processedText = rewrittenText.trim();
  if (!originalFormatting.hasCapitalization) processedText = processedText.toLowerCase();
  else if (originalFormatting.startsWithCapital && processedText.length > 0)
    processedText = processedText.charAt(0).toUpperCase() + processedText.slice(1);

  if (!originalFormatting.hasPunctuation) processedText = processedText.replace(/[.!?,:;]/g, '');
  else if (originalFormatting.endsWithPunctuation && !/[.!?]$/.test(processedText)) processedText += '.';

  return processedText;
};

export const cleanupEmptyInlineElements = (container: HTMLElement): void => {
  const emptyElements = container.querySelectorAll('code, span, em, strong, i, b, mark, small, del, ins, sub, sup');
  emptyElements.forEach(element => {
    if (!element.textContent || element.textContent.trim() === '') element.remove();
  });
};

export const cleanupStrayMarkersInDoc = (root: ParentNode = document): void => {
  const markerPattern = /__LINGUINE_\d+_[a-z0-9]+__/g;
  const walker = document.createTreeWalker(root as Node, NodeFilter.SHOW_TEXT);
  const nodesToClean: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    if (textNode.nodeValue && markerPattern.test(textNode.nodeValue)) nodesToClean.push(textNode);
  }
  nodesToClean.forEach(textNode => {
    if (textNode.nodeValue) textNode.nodeValue = textNode.nodeValue.replace(markerPattern, '');
  });
};
