/**
 * Text Fragments API
 * Minimal wrapper around Google's text-fragments-polyfill
 *
 * Based on: https://github.com/GoogleChromeLabs/text-fragments-polyfill
 *
 * Text fragments link directly to specific text in a web page, without requiring
 * the page author to add an ID. This feature lets you create deep links to content
 * that you don't control and may not have IDs associated.
 *
 * @example
 * // Simple text fragment - highlights first instance of "human"
 * scrollToText('human', { highlight: true });
 *
 * @example
 * // Text range - highlights text from "linked" to "URL"
 * scrollToText('linked%20URL,defining%20a%20value', { highlight: true });
 *
 * @example
 * // With prefix - find specific instance of "referrer" after "sent"
 * scrollToText('sent-,referrer', { highlight: true });
 *
 * @example
 * // With suffix - find specific instance before certain text
 * scrollToText("referrer,-'s%20format", { highlight: true });
 *
 * @example
 * // Complex fragment with prefix, range, and suffix
 * scrollToText('downgrade:-,The%20Referer,be%20sent,-to%20origins', {
 *   highlight: true,
 *   highlightDuration: 3000
 * });
 */

// Fragment Generation Functions
export {
  generateFragment,
  generateFragmentFromRange,
  isValidRangeForFragmentGeneration,
  setTimeout,
  GenerateFragmentStatus,
  type GenerateFragmentResult,
  type TextFragment as TextFragmentFromGen,
} from 'text-fragments-polyfill/dist/fragment-generation-utils.js';

// Fragment Processing Functions
export {
  TEXT_FRAGMENT_CSS_CLASS_NAME,
  getFragmentDirectives,
  parseFragmentDirectives,
  processFragmentDirectives,
  processTextFragmentDirective,
  removeMarks,
  markRange,
  scrollElementIntoView,
  applyTargetTextStyle,
  setDefaultTextFragmentsStyle,
  type TextFragment,
} from 'text-fragments-polyfill/text-fragment-utils';

import { generateFragmentFromRange } from 'text-fragments-polyfill/dist/fragment-generation-utils.js';
import {
  parseFragmentDirectives,
  processTextFragmentDirective,
  markRange,
  removeMarks,
  scrollElementIntoView,
  type TextFragment,
  getFragmentDirectives,
} from 'text-fragments-polyfill/text-fragment-utils';

/**
 * Scroll to text using text fragments API
 * Uses the polyfill's built-in functionality for maximum compatibility
 *
 * @param textFragment - The text fragment string to scroll to. Can be:
 *   - Simple: "human" - scrolls to first instance of "human"
 *   - Range: "linked%20URL,defining%20a%20value" - scrolls to text from start to end
 *   - With prefix: "sent-,referrer" - finds text after "sent"
 *   - With suffix: "referrer,-'s%20format" - finds text before suffix
 *   - Complex: "downgrade:-,The%20Referer,be%20sent,-to%20origins"
 *
 * @param options - Configuration options
 * @param options.highlight - Whether to highlight the matched text (default: false)
 * @param options.highlightDuration - How long to keep the highlight in milliseconds (default: no timeout)
 *
 * @returns Object with found status, text node, and matching ranges
 *
 * @example
 * ```typescript
 * // Simple usage - just scroll to text
 * const result = scrollToText('human');
 * if (result.found) {
 *   console.log('Found:', result.textNode?.textContent);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // With highlighting for 3 seconds
 * scrollToText('important%20text', {
 *   highlight: true,
 *   highlightDuration: 3000
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Find specific phrase with prefix/suffix
 * scrollToText('avoid-,use,-confusion', {
 *   highlight: true
 * });
 * ```
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment/Text_fragments
 */
export function scrollToText(
  textFragment: string,
  options: {
    highlight?: boolean;
    highlightDuration?: number;
  } = {},
): { found: boolean; textNode?: Text; ranges?: Range[] } {
  try {
    console.log('textFragmenet', textFragment);

    // Use the polyfill's built-in processing
    const fragmentDirectives = getFragmentDirectives(textFragment);
    console.log('fragmentDirectives', fragmentDirectives);

    const parsedDirectives = parseFragmentDirectives(fragmentDirectives);

    console.log('parsedDirectives', parsedDirectives);

    if (!parsedDirectives.text || parsedDirectives.text.length === 0) {
      return { found: false };
    }

    const ranges = processTextFragmentDirective(parsedDirectives.text[0]);

    console.log('ranges', ranges);

    if (ranges.length === 0) {
      return { found: false };
    }

    const range = ranges[0];

    console.log('first range', range);

    const textNode = range.startContainer.nodeType === Node.TEXT_NODE ? (range.startContainer as Text) : undefined;

    // Get the element to scroll to - handle both text nodes and elements
    let scrollTarget: Element | null = null;
    if (range.startContainer.nodeType === Node.TEXT_NODE) {
      // If it's a text node, get its parent element
      scrollTarget = (range.startContainer as Text).parentElement;
    } else if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
      // If it's already an element, use it directly
      scrollTarget = range.startContainer as Element;
    }

    // Fallback: use common ancestor container if we still don't have an element
    if (!scrollTarget && range.commonAncestorContainer) {
      if (range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE) {
        scrollTarget = range.commonAncestorContainer as Element;
      } else {
        scrollTarget = (range.commonAncestorContainer as Node).parentElement;
      }
    }

    // Use smooth scrolling to scroll to the range's exact position
    try {
      // Get the bounding rectangle of the range for precise positioning
      const rect = range.getBoundingClientRect();
      
      // Calculate scroll position to center the text in the viewport
      const scrollY = window.scrollY + rect.top - window.innerHeight / 2 + rect.height / 2;
      const scrollX = window.scrollX + rect.left - window.innerWidth / 2 + rect.width / 2;
      
      // Use smooth scrolling to the calculated position
      window.scrollTo({
        top: Math.max(0, scrollY),
        left: Math.max(0, scrollX),
        behavior: 'smooth'
      });
    } catch (error) {
      // Fallback: use element-based scrolling if range calculation fails
      if (scrollTarget) {
        scrollTarget.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center', 
          inline: 'nearest' 
        });
      } else {
        console.warn('Could not scroll to text:', error);
      }
    }

    console.log('options', options.highlight);

    // Use the polyfill's built-in highlighting
    if (options.highlight) {
      const marks = markRange(range);

      if (options.highlightDuration) {
        globalThis.setTimeout(() => {
          removeMarks(marks);
        }, options.highlightDuration);
      }
    }

    return {
      found: true,
      textNode,
      ranges,
    };
  } catch (error) {
    console.error('Failed to scroll to text:', error);
    return { found: false };
  }
}

export function stringifyFragment(fragment: TextFragment): string {
  let fragmentString = encodeURIComponent(fragment.textStart);
  if (fragment.textEnd) {
    fragmentString += `,${encodeURIComponent(fragment.textEnd)}`;
  }
  if (fragment.prefix) {
    fragmentString = `${encodeURIComponent(fragment.prefix)}-,${fragmentString}`;
  }

  if (fragment.suffix) {
    fragmentString += `,-${encodeURIComponent(fragment.suffix)}`;
  }
  return fragmentString;
}

export function generateFragmentStringHashFromRange(range: Range): string {
  const result = generateFragmentFromRange(range);
  console.log("generateFragmentFromRange", result)
  if (result.status === 0 && result.fragment) {
    return "#:~:text=" + stringifyFragment(result.fragment);
  }

  throw Error('Failed to generate fragment string from range');
}
