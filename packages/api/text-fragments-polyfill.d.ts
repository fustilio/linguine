/**
 * TypeScript declarations for text-fragments-polyfill
 * Based on Google Chrome Labs text-fragments-polyfill library
 * 
 * Repository: https://github.com/GoogleChromeLabs/text-fragments-polyfill
 * Documentation: https://web.dev/text-fragments/
 */

declare module 'text-fragments-polyfill/dist/fragment-generation-utils.js' {
  /**
   * Text fragment object representing a URL text fragment
   * 
   * @example
   * // Simple fragment - find first instance of "human"
   * const fragment: TextFragment = { textStart: "human" };
   * 
   * @example
   * // Text range - find text from "linked URL" to "defining a value"
   * const fragment: TextFragment = { 
   *   textStart: "linked URL",
   *   textEnd: "defining a value"
   * };
   * 
   * @example
   * // With prefix - find "referrer" that appears after "sent"
   * const fragment: TextFragment = {
   *   prefix: "sent",
   *   textStart: "referrer"
   * };
   * 
   * @example
   * // With suffix - find "referrer" before "'s format"
   * const fragment: TextFragment = {
   *   textStart: "referrer",
   *   suffix: "'s format"
   * };
   * 
   * @example
   * // Complex - find specific instance with both prefix and suffix
   * const fragment: TextFragment = {
   *   prefix: "downgrade:",
   *   textStart: "The Referer",
   *   textEnd: "be sent",
   *   suffix: "to origins"
   * };
   */
  export interface TextFragment {
    /** The text to find (required) */
    textStart: string;
    /** Optional end text for a range */
    textEnd?: string;
    /** Optional prefix that must appear before the text */
    prefix?: string;
    /** Optional suffix that must appear after the text */
    suffix?: string;
  }

  /**
   * Fragment generation result
   */
  export interface GenerateFragmentResult {
    /** Status code from GenerateFragmentStatus enum */
    status: number;
    /** Generated fragment object (only present on success) */
    fragment?: TextFragment;
  }

  /**
   * Fragment generation status enum
   */
  export const GenerateFragmentStatus: {
    SUCCESS: 0;
    INVALID_SELECTION: 1;
    AMBIGUOUS: 2;
    TIMEOUT: 3;
    EXECUTION_FAILED: 4;
  };

  /**
   * Generate a text fragment from a Selection object
   * 
   * @param selection - The Selection object to generate a fragment for
   * @param startTime - The time when generation began, for timeout purposes
   * @returns GenerateFragmentResult with status and fragment
   * 
   * @example
   * ```typescript
   * // Get the current text selection
   * const selection = window.getSelection();
   * if (selection && !selection.isCollapsed) {
   *   const result = generateFragment(selection);
   *   if (result.status === GenerateFragmentStatus.SUCCESS) {
   *     console.log('Fragment:', result.fragment);
   *   }
   * }
   * ```
   */
  export function generateFragment(selection: Selection, startTime?: number): GenerateFragmentResult;

  /**
   * Generate a text fragment from a Range object with timeout
   * 
   * @param range - The Range object to generate a fragment for
   * @param startTime - The time when generation began, for timeout purposes
   * @returns GenerateFragmentResult with status and fragment
   * 
   * @example
   * ```typescript
   * // Create a range from selected text
   * const range = document.createRange();
   * range.selectNodeContents(document.getElementById('content'));
   * 
   * // Generate fragment from the range
   * const result = generateFragmentFromRange(range);
   * if (result.status === GenerateFragmentStatus.SUCCESS && result.fragment) {
   *   // Use the fragment in a URL or save it
   *   const urlFragment = result.fragment.textStart;
   * }
   * ```
   */
  export function generateFragmentFromRange(range: Range, startTime?: number): GenerateFragmentResult;

  /**
   * Check if fragment generation can be attempted for a given range
   * @param range - The Range object to check
   * @returns true if fragment generation may proceed; false otherwise
   */
  export function isValidRangeForFragmentGeneration(range: Range): boolean;

  /**
   * Set the timeout duration for fragment generation
   * @param newTimeoutDurationMs - the desired timeout length, in ms
   */
  export function setTimeout(newTimeoutDurationMs: number): void;

  /**
   * Testing utilities - should not be referenced except in test directories
   */
  export const forTesting: {
    containsBlockBoundary: (range: Range) => boolean;
    doGenerateFragment: (selection: Selection, startTime: number) => GenerateFragmentResult;
    expandRangeEndToWordBound: (range: Range) => void;
    expandRangeStartToWordBound: (range: Range) => void;
    findWordEndBoundInTextNode: (node: Node, endOffset?: number) => number;
    findWordStartBoundInTextNode: (node: Node, startOffset?: number) => number;
    FragmentFactory: any; // Complex class, using any for now
    getSearchSpaceForEnd: (range: Range) => string | undefined;
    getSearchSpaceForStart: (range: Range) => string | undefined;
    getTextNodesInSameBlock: (node: Node) => { preNodes: Node[]; innerNodes: Node[]; postNodes: Node[] };
    recordStartTime: (newStartTime: number) => void;
    BlockTextAccumulator: any; // Complex class, using any for now
    getFirstTextNode: (range: Range) => Node | null;
    getLastTextNode: (range: Range) => Node | null;
    moveRangeEdgesToTextNodes: (range: Range) => void;
  };
}

declare module 'text-fragments-polyfill/text-fragment-utils' {
  /**
   * Text fragment object
   */
  export interface TextFragment {
    textStart: string;
    textEnd?: string;
    prefix?: string;
    suffix?: string;
  }

  /**
   * Text fragments CSS class name
   */
  export const TEXT_FRAGMENT_CSS_CLASS_NAME: string;

  /**
   * Get all text fragments from a string
   * @param hash - string retrieved from Location#hash
   * @returns Text Fragments contained in the hash
   */
  export function getFragmentDirectives(hash: string): { text?: string[] };

  /**
   * Parse fragment directives into structured objects
   * @param fragmentDirectives - Fragment directives object
   * @returns Parsed fragment directives
   */
  export function parseFragmentDirectives(fragmentDirectives: { text?: string[] }): { text?: TextFragment[] };

  /**
   * Process fragment directives and create highlight elements
   * @param parsedFragmentDirectives - Parsed fragment directives
   * @param documentToProcess - Document to process
   * @param root - Root element to process within
   * @returns Processed fragment directives with highlight elements
   */
  export function processFragmentDirectives(
    parsedFragmentDirectives: { text?: TextFragment[] },
    documentToProcess?: Document,
    root?: Element
  ): { text?: HTMLElement[][] };

  /**
   * Process a text fragment directive and find matching ranges
   * 
   * This function searches the document for text matching the fragment specification.
   * 
   * @param textFragment - Text fragment to process
   * @param documentToProcess - Document to search in
   * @param root - Root element to search within
   * @returns Array of matching ranges
   * 
   * @example
   * ```typescript
   * // Search for text matching a fragment
   * const fragment: TextFragment = {
   *   textStart: "human",
   *   suffix: "interface"
   * };
   * 
   * const ranges = processTextFragmentDirective(fragment);
   * if (ranges.length > 0) {
   *   // Found matching text
   *   console.log('Found', ranges.length, 'matches');
   *   
   *   // Scroll to and highlight the first match
   *   const marks = markRange(ranges[0]);
   *   scrollElementIntoView(ranges[0].startContainer.parentElement);
   * }
   * ```
   */
  export function processTextFragmentDirective(
    textFragment: TextFragment,
    documentToProcess?: Document,
    root?: Element
  ): Range[];

  /**
   * Remove highlight marks from the document
   * @param marks - Array of mark elements to remove
   * @param documentToProcess - Document to process
   */
  export function removeMarks(marks: HTMLElement[], documentToProcess?: Document): void;

  /**
   * Mark a range with highlight elements
   * 
   * This creates &lt;mark&gt; elements around the text in the range to highlight it.
   * 
   * @param range - Range to mark
   * @param documentToProcess - Document to create elements in
   * @returns Array of mark elements created
   * 
   * @example
   * ```typescript
   * // Create a range from selected text
   * const range = window.getSelection()?.getRangeAt(0);
   * if (range) {
   *   // Highlight the range
   *   const marks = markRange(range);
   *   
   *   // Remove highlights after 3 seconds
   *   setTimeout(() => {
   *     removeMarks(marks);
   *   }, 3000);
   * }
   * ```
   */
  export function markRange(range: Range, documentToProcess?: Document): HTMLElement[];

  /**
   * Scroll an element into view
   * @param element - Element to scroll into view
   */
  export function scrollElementIntoView(element: Element): void;

  /**
   * Apply target text styles to the document
   */
  export function applyTargetTextStyle(): void;

  /**
   * Set default text fragment styles
   * @param options - Style options with backgroundColor and color
   */
  export function setDefaultTextFragmentsStyle(options: { backgroundColor: string; color: string }): void;

  /**
   * Testing utilities - should not be referenced except in test directories
   */
  export const forTesting: {
    advanceRangeStartPastOffset: (range: Range, node: Node, offset: number) => void;
    advanceRangeStartToNonWhitespace: (range: Range) => void;
    findRangeFromNodeList: (query: string, range: Range, textNodes: Node[], segmenter?: Intl.Segmenter) => Range | undefined;
    findTextInRange: (query: string, range: Range) => Range | undefined;
    getBoundaryPointAtIndex: (index: number, textNodes: Node[], isEnd: boolean) => { node: Node; offset: number } | undefined;
    isWordBounded: (text: string, startPos: number, length: number, segmenter?: Intl.Segmenter) => boolean;
    makeNewSegmenter: () => Intl.Segmenter | undefined;
    markRange: (range: Range, documentToProcess?: Document) => HTMLElement[];
    normalizeString: (str: string) => string;
    parseTextFragmentDirective: (textFragment: string) => TextFragment;
    forwardTraverse: (walker: TreeWalker, finishedSubtrees: Set<Node>) => Node | null;
    backwardTraverse: (walker: TreeWalker, finishedSubtrees: Set<Node>) => Node | null;
    getAllTextNodes: (root: Node, range: Range) => Node[][];
    acceptTextNodeIfVisibleInRange: (node: Node, range: Range) => number;
  };

  /**
   * Internal utilities - should only be used by other files in this directory
   */
  export const internal: {
    BLOCK_ELEMENTS: string[];
    BOUNDARY_CHARS: RegExp;
    NON_BOUNDARY_CHARS: RegExp;
    acceptNodeIfVisibleInRange: (node: Node, range?: Range) => number;
    normalizeString: (str: string) => string;
    makeNewSegmenter: () => Intl.Segmenter | undefined;
    forwardTraverse: (walker: TreeWalker, finishedSubtrees: Set<Node>) => Node | null;
    backwardTraverse: (walker: TreeWalker, finishedSubtrees: Set<Node>) => Node | null;
    makeTextNodeWalker: (range: Range) => TreeWalker;
    isNodeVisible: (node: Node) => boolean;
  };
}

declare module 'text-fragments-polyfill/dist/text-fragments.js' {
  /**
   * Initialize the text fragments polyfill
   * This should be called on page load
   */
  export function init(): void;

  /**
   * Process text fragments from the current URL
   * @param options - Configuration options
   */
  export function processTextFragments(options?: {
    /** Whether to scroll to the fragment */
    scrollToFragment?: boolean;
    /** Whether to highlight the fragment */
    highlightFragment?: boolean;
  }): void;
}

// Global declarations for when the polyfill is loaded globally
declare global {
  interface Window {
    /** Global generateFragment function when polyfill is loaded */
    generateFragment?: (range: Range | Selection, startTime?: number) => {
      status: number;
      fragment?: {
        textStart: string;
        textEnd?: string;
        prefix?: string;
        suffix?: string;
      };
    };
  }
}
