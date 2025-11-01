# Text Annotate Feature

## Overview

Text Annotate adds a reading-mode overlay that extracts page content, segments it into words/POS chunks, and annotates each chunk with literal and contextual translations using Chrome's AI APIs. It supports progressive loading, batching, and TTS on word click. The system is self-contained and separate from the dictionary/rewrites features for easy removal.

## Goals

- Analyze full-page content or selection in a stable reading surface (overlay)
- Segment by language (Thai via `wordcut`; generic fallbacks for others)
- POS chunking with Chrome `LanguageModel` API
- Literal and contextual translations with Chrome `Translator` + `LanguageModel`
- Progressive streaming of annotations with a stable progress bar
- Preserve spaces, avoid layout shifts, keep close button aligned
- Add TTS on click, keyboard Esc to close, dim-background click-to-close
- Provide debug/demo flows, timing metrics, and parallel batching

## Architecture

```
Popup (pages/popup)  ──▶ Content Runtime (pages/content/.../all)
   │                         │
   │ openReadingMode         │ initializes TextAnnotateManager
   │                         │ sets up UI callbacks
   ▼                         ▼
Content Runtime              │ sends messages with target: 'content-ui'
   │                         ▼
   │              Content UI (pages/content-ui) - React component
   │                         │
   │                         │ ReadingMode.tsx renders overlay
   ▼                         ▼
TextAnnotateManager          │ uses packages/api/lib/text-annotate/*
   │                         ▼
   │              Chrome AI APIs (Translator, LanguageModel, LanguageDetector)
   ▼
```

**Message Flow**:
```
Popup
  ↓ chrome.tabs.sendMessage({ action: 'openReadingMode', ... })
Content Runtime
  ↓ textAnnotateManager.openReadingModeAuto()
TextAnnotateManager
  ↓ UI callbacks → chrome.runtime.sendMessage({ target: 'content-ui', ... })
Background Script (forwards to content-ui)
  ↓ chrome.tabs.sendMessage(tabId, message)
Content UI React Component
  ↓ Updates state and renders ReadingMode overlay
```

### Key Modules (packages/api/lib/text-annotate)

- `types.ts`: Core interfaces (`ExtractedText`, `SupportedLanguage`, `POSChunk`, `AnnotatedChunk`, `VocabularyMatch`, `ReadingModeConfig`)
- `language-detector.ts`: Uses Chrome `LanguageDetector` with character-based fallback
- `text-extractor.ts`: Extracts content (Mozilla Readability, selection, selector) and plain text
- `segmenter.ts`: Language-aware segmentation (Thai via `wordcut`)
- `pos-chunker.ts`: Fast token chunking with `Intl.Segmenter` (no AI); whitespace fallback
- `translator.ts`: Literal translation with `Translator` and contextual translation with `LanguageModel` (graceful fallbacks, user gesture handling)
- `vocabulary-matcher.ts`: Matches text chunks against vocabulary database, determines knowledge level and registration status
- `vocabulary-styles.ts`: Utilities for determining vocabulary status and visual styling
- `annotator.ts`: Orchestrates detection → segmentation → POS → translation with batching and progressive streaming, comprehensive timing, vocabulary matching
- `simple-annotator.ts`: Lightweight mock annotator for demo/testing
- Wikimedia image enrichment: optional images per annotated chunk (up to 3), fetched via background
- `styles.ts`: Styles for overlay, underlines, tooltips, progress bar
- `text-annotate-manager.ts`: Entry point managing extraction, annotation, UI lifecycle, vocabulary loading, and message handling
- `index.ts`: Public exports; re-exported by `packages/api/index.mts`

### Content Script Integration

- **Content Runtime** (`pages/content/src/matches/all/index.ts`):
  - Initializes `TextAnnotateManager` and sets up React UI callbacks
  - Handles messages: `openReadingMode` with `{ useFullContent: boolean }`, `closeReadingMode`
  - Forwards UI updates to content-ui via Chrome messages with `target: 'content-ui'`
  
- **Content UI** (`pages/content-ui/src/matches/all/ReadingMode.tsx`):
  - React component that renders the reading mode overlay using Tailwind CSS
  - Receives updates via Chrome messages: `readingModeShow`, `readingModeUpdate`, `readingModeHide`
  - Manages UI state, tooltips, TTS, keyboard shortcuts, and settings controls
  - Implements visual styling with vocabulary-based colored underlines:
    - **Light gray**: Mastered (knowledge_level 5)
    - **Green**: Registered and easy (knowledge_level 3-4)
    - **Orange**: Registered and challenging (knowledge_level 1-2)
    - **Red**: Unregistered (not in vocabulary database)
  - Includes vocabulary difficulty modification in tooltips (Add to Learn, Mark as Mastered, Set as Easy, Set as Challenging)
  - Includes "Add All (N)" button for bulk adding unregistered words to vocabulary
  - Includes image loading and display functionality for tooltips

- **Popup** (`pages/popup/src/Popup.tsx`) buttons:
  - “Open Reading Mode” (full content)
  - “🧪 Test Reading Mode (Demo)” (short Thai sample)
  - “Close Reading Mode” (debug)

## Processing Flow

1) Extract text
   - Mozilla Readability for article content
   - Selection or CSS selector as alternatives
2) Detect language
   - **Priority order**: Chrome `LanguageDetector` API (most accurate, analyzes actual text) → character-based fallback (analyzes patterns) → Readability language hint (unreliable, HTML metadata only) → target language (last resort)
   - Progress/availability handling with comprehensive logging for debugging
3) Segment
   - Intl.Segmenter for all languages with granularity 'word' (fast, no AI)
   - Fallback: whitespace/character heuristics
4) Chunking
   - Use Intl.Segmenter output directly as chunks with start/end offsets
5) Vocabulary matching (for detected language)
   - Load vocabulary map from database for detected language
   - Match each chunk against vocabulary database
   - Determine knowledge level and registration status
   - Attach vocabulary match information to each chunk
6) Translation (parallel batched, two-phase for translation mode)
   - **Simplify Mode** (English → English): Single phase using Chrome `Rewriter` API with contextual prompting
   - **Translation Mode** (other languages): Two-phase process:
     - **Phase 1 - Literal Translation**: Fast, streams to UI immediately using Chrome `Translator` API
     - **Phase 2 - Contextual Translation**: Slower, uses Chrome `LanguageModel` API with literal results as input, updates existing annotations
   - `Promise.all()` batching with configurable `BATCH_SIZE`
   - Progressive `onProgress` callback streams annotated chunks with separate literal/contextual progress tracking
7) UI progressive rendering
   - Show plain text instantly (char spans)
   - Wrap ranges in-place as annotations arrive (no text shifting)
   - Apply vocabulary-based colors to underlines based on knowledge level
   - Stable progress bar; spaces preserved; header X aligned

## Progressive UX

- Immediate plain text render
- Inline, in-place wrapping for annotations (preserve offsets)
- **Vocabulary-based visual styling**: Annotated chunks have colored dotted underlines based on vocabulary status:
  - **Light gray**: Mastered words (knowledge_level 5)
  - **Green**: Registered easy words (knowledge_level 3-4)
  - **Orange**: Registered challenging words (knowledge_level 1-2)
  - **Red**: Unregistered words (not in vocabulary database)
- Hover effects: chunks highlight with semi-transparent backgrounds on hover
- **Dual progress bars** (translation mode): Shows separate progress for literal and contextual translation phases concurrently
- Single progress bar for simplify mode and other phases
- Tooltips optimized to avoid re-rendering during progressive loading:
  - Uses memoized chunk lookup to always show latest translations
  - Only updates when translation content actually changes
- **Vocabulary difficulty modification**: Tooltips include buttons to modify vocabulary difficulty:
  - "Add to Learn" (sets level 3), "Mark as Mastered" (sets level 5)
  - "Set as Easy" (level 3-4), "Set as Challenging" (level 1-2)
  - Context-aware buttons that update based on current vocabulary status
- **Bulk vocabulary operations**: "Add All (N)" button in header to add all unregistered words at once
- **Simplify Mode** UI: Shows "Simplify Mode" badge in header; tooltips show only simplified text (white) without prefixes
- **Translation Mode** tooltips: 
  - Show literal (light blue) if it differs from contextual or if contextual not available yet
  - Show contextual (green if differs, white if same) when available
  - If literal and contextual are effectively identical (punctuation/case/synonym-insensitive), show single combined line (white)
  - Optional "Literal:"/"Contextual:" prefixes via toggle
- Tooltips can include up to three Wikimedia images (lazy-fetched on hover, only shown if images enabled); click image dots to cycle through images
- TTS (`SpeechSynthesisUtterance`) on chunk click (language-aware)
- Close via header X, Esc key, or backdrop click

## Chrome AI APIs and Constraints

- `LanguageDetector`: Used when available; prioritized over Readability language hints (which are based on HTML metadata, not actual content)
- `Translator`: Literal translations; check availability per language pair
- `LanguageModel`: Used for contextual translations only (no longer used for POS)
- `Rewriter`: Used for English simplification mode (when source and target languages are both English)
- User gesture requirement: handle `NotAllowedError` gracefully; literal still works

## Performance

- Chunking: Intl.Segmenter reduces pre-chunking to milliseconds on modern Chrome
- Batching with `Promise.all()` (default `BATCH_SIZE = 6`)
- Image fetching done post-translation per chunk, cached per term, capped at 3 per chunk
- Comprehensive timing metrics tracked internally:
  - total time, text length, ms/char
  - total operations (chunks)
  - total translation time, avg ms/op
  - estimated sequential time, parallel speedup
- Per-phase timings (extract, detect, segment, prechunk, translate, finalize) tracked internally
- Demo mode: short Thai sample for end-to-end testing

## Message Passing

**Reading Mode Message Flow**:
- Popup → Content Runtime: `openReadingMode`, `closeReadingMode`
- Content Runtime → Content UI: `readingModeShow`, `readingModeUpdate`, `readingModeHide` (with `target: 'content-ui'`)
- Background Script: Forwards messages with `target: 'content-ui'` to the active tab's content-ui script
- Content UI React Component: Listens for messages and updates state/props accordingly

**TextAnnotateManager Architecture**:
- `TextAnnotateManager` is a utility class that does NOT handle Chrome messages directly
- All message handling is done in the content-runtime script
- `TextAnnotateManager` uses a callback-based UI system:
  - `setUICallbacks()` method accepts callbacks for `onShow`, `onUpdate`, `onHide`
  - Content-runtime provides callbacks that send Chrome messages to content-ui
  - This allows `TextAnnotateManager` to work with both React UI (preferred) and legacy DOM UI (deprecated)

**Image Fetching**:
- Background fetch for images: UI/content asks background `fetchWikimediaImages` to avoid CORS
- Background calls Wikimedia Commons API using generator=search (namespace File) and returns URLs

## UI Details

- Header rows: title + close (Esc supported); progress row centered; controls row for typography and settings
- Scroll behavior: while reading mode is visible, page scroll is locked and the overlay is the only scrollable viewport
- Visual indicators:
  - Annotated chunks display with dotted underlines (green for standard translations, orange for contextual differences)
  - Hover effects provide visual feedback with semi-transparent backgrounds
- Controls (Lucide icons, popup-style buttons):
  - Font size: `a-arrow-down` (decrease), `a-arrow-up` (increase)
  - Line height: `list-chevrons-down-up` / `list-chevrons-up-down`
  - Column width: `fold-horizontal` (narrow), `unfold-horizontal` (widen)
  - Theme: `sun-moon` cycles light/dark/sepia
  - Image toggle: show/hide images in tooltips
  - Prefix toggle: show/hide "Literal:"/"Contextual:" prefixes in tooltips
- Limits & disabled states:
  - Font size: 12–32px; buttons disable at bounds
  - Line height: 1.2–2.0; buttons disable at bounds
  - Column width: 40–90ch; buttons disable at bounds
- Persistence:
  - Settings are saved globally via `chrome.storage.local` (fallback to `localStorage`)
- Keyboard shortcuts (active while overlay visible):
  - Ctrl/Cmd + =: increase font size
  - Ctrl/Cmd + -: decrease font size
  - Ctrl/Cmd + ]: widen column
  - Ctrl/Cmd + [: narrow column
  - T: cycle theme

## Cancellation & Resource Use

- When reading mode closes or a new run starts, all in-flight work is aborted to save resources
  - `TextAnnotateManager` uses an `AbortController` per run and passes `signal` to `annotator`
  - `annotateText` checks `signal.aborted` between phases/batches and throws `annotation_aborted`
  - Abort-friendly handling: user-initiated aborts are handled silently without error stacks

## Error Handling

- Language detection fallback when unavailable/low-confidence
- AI user gesture errors produce safe fallbacks and continue
- Network/availability errors degrade to `simple-annotator`
- Errors handled gracefully; overlay remains responsive

## Testing & Demo Tools

- Popup test buttons for reading mode functionality
- Demo mode toggle via `useFullContent` parameter (uses short Thai sample text for testing)
- Error logging for troubleshooting annotation failures

## Roadmap

- POS improvements and richer grammar tags
- Better non-Thai segmentation strategies per language family
- Streaming UI refinements (partial batches and smooth progress)
- Tooltip enhancements (copy translation, keyboard navigation between chunks)
- Persist last used options (e.g., full content) in `chrome.storage`
- Optional data capture (with consent) for learning analytics

## File Map (Key)

- `packages/api/lib/text-annotate/*` (core)
- `pages/content/src/matches/all/index.ts` (content script wiring)
- `pages/popup/src/Popup.tsx` (popup controls)

## Related Docs

- [Architecture Overview](./architecture-overview.md)
- [Message Passing System](./message-passing-system.md)
- [Packages API](./packages-api.md)
- [Packages Shared](./packages-shared.md)


