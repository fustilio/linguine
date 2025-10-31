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

- `types.ts`: Core interfaces (`ExtractedText`, `SupportedLanguage`, `POSChunk`, `AnnotatedChunk`, `ReadingModeConfig`)
- `language-detector.ts`: Uses Chrome `LanguageDetector` with character-based fallback
- `text-extractor.ts`: Extracts content (Mozilla Readability, selection, selector) and plain text
- `segmenter.ts`: Language-aware segmentation (Thai via `wordcut`)
- `pos-chunker.ts`: Fast token chunking with `Intl.Segmenter` (no AI); whitespace fallback
- `translator.ts`: Literal translation with `Translator` and contextual translation with `LanguageModel` (graceful fallbacks, user gesture handling)
- `annotator.ts`: Orchestrates detection → segmentation → POS → translation with batching and progressive streaming, comprehensive timing
- `simple-annotator.ts`: Lightweight mock annotator for demo/testing
- `reading-mode-ui.ts`: **@deprecated** DOM-based overlay (replaced by React component). The reading mode UI is now implemented as a React component in `pages/content-ui/src/matches/all/ReadingMode.tsx`.
- Wikimedia image enrichment: optional images per annotated chunk (up to 3), fetched via background
- `styles.ts`: Styles for overlay, underlines, tooltips, progress bar
- `text-annotate-manager.ts`: Entry point managing extraction, annotation, UI lifecycle, and message handling
- `index.ts`: Public exports; re-exported by `packages/api/index.mts`

### Content Script Integration

- **Content Runtime** (`pages/content/src/matches/all/index.ts`):
  - Initializes `TextAnnotateManager` and sets up React UI callbacks
  - Handles messages: `openReadingMode` with `{ useFullContent: boolean }`, `closeReadingMode`
  - Forwards UI updates to content-ui via Chrome messages with `target: 'content-ui'`
  
- **Content UI** (`pages/content-ui/src/matches/all/ReadingMode.tsx`):
  - React component that renders the reading mode overlay
  - Receives updates via Chrome messages: `readingModeShow`, `readingModeUpdate`, `readingModeHide`
  - Manages UI state, tooltips, TTS, keyboard shortcuts, and settings controls

- **Popup** (`pages/popup/src/Popup.tsx`) buttons:
  - “Open Reading Mode” (full content)
  - “🧪 Test Reading Mode (Demo)” (short Thai sample)
  - “Close Reading Mode” (debug)

## Processing Flow

1) Extract text
   - Mozilla Readability for article content
   - Selection or CSS selector as alternatives
2) Detect language
   - Chrome `LanguageDetector` with progress/availability handling, fallback to heuristic for short/low-confidence
3) Segment
   - Intl.Segmenter for all languages with granularity 'word' (fast, no AI)
   - Fallback: whitespace/character heuristics
4) Chunking
   - Use Intl.Segmenter output directly as chunks with start/end offsets
5) Translation (parallel batched)
   - Literal: Chrome `Translator`
   - Contextual: Chrome `LanguageModel` (optional, slower)
   - `Promise.all()` batching with configurable `BATCH_SIZE`
   - Progressive `onProgress` callback streams annotated chunks
6) UI progressive rendering
   - Show plain text instantly (char spans)
   - Wrap ranges in-place as annotations arrive (no text shifting)
   - Stable progress bar; spaces preserved; header X aligned

## Progressive UX

- Immediate plain text render
- Inline, in-place wrapping for annotations (preserve offsets)
- Progress bar with locked total from pre-chunk estimate
- Tooltips merge translations smartly: if literal and contextual are effectively identical (punctuation/case/synonym-insensitive), show a single combined line (white). Otherwise show Literal (light blue) then Contextual. Optional “Literal:”/“Contextual:” prefixes via toggle
- Tooltips can include up to three Wikimedia images (lazy-fetched on hover); click image to cycle
- TTS (`SpeechSynthesisUtterance`) on word click (language fallback)
- Close via header X, Esc key, or backdrop click

## Chrome AI APIs and Constraints

- `LanguageDetector`: Used when available; fallback to heuristic
- `Translator`: Literal translations; check availability per language pair
- `LanguageModel`: Used for contextual translations only (no longer used for POS)
- User gesture requirement: handle `NotAllowedError` gracefully; literal still works

## Performance and Logging

- Chunking: Intl.Segmenter reduces pre-chunking to milliseconds on modern Chrome
- Batching with `Promise.all()` (default `BATCH_SIZE = 6`)
- Image fetching done post-translation per chunk, cached per term, capped at 3 per chunk
- Per-chunk translation logging: `[TextAnnotate] Translation: "<src>" (src → dst) | literal="…" | contextual="…"`
- Comprehensive timing metrics:
  - total time, text length, ms/char
  - total operations (chunks)
  - total translation time, avg ms/op
  - estimated sequential time, parallel speedup
- Per-phase timings (extract, detect, segment, prechunk, translate, finalize) streamed to HUD
- Demo mode: short Thai sample for end-to-end testing and timing
- Robust console logs across all phases to diagnose “stuck” states

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
- Controls (Lucide icons, popup-style buttons):
  - Font size: `a-arrow-down` (decrease), `a-arrow-up` (increase)
  - Line height: `list-chevrons-down-up` / `list-chevrons-up-down`
  - Column width: `fold-horizontal` (narrow), `unfold-horizontal` (widen)
  - Theme: `sun-moon` cycles light/dark/sepia
  - Image and prefix toggles are preserved
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
  - Abort-friendly logging: user-initiated aborts log `[TextAnnotate] Annotation aborted by user` without error stacks

## Error Handling

- Language detection fallback when unavailable/low-confidence
- AI user gesture errors produce safe fallbacks and continue
- Network/availability errors degrade to `simple-annotator`
- Errors surfaced in logs; overlay remains responsive

## Debugging Tools

- Popup debug buttons at bottom; clearly labeled
- Demo mode toggle via `useFullContent`
- HUD (Tab to toggle) bottom-left: shows phase, k/N, per-phase timings (ms), batch ms, literal/contextual ops and ms
- Logs show extraction preview, segments, chunk counts, and timing

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


