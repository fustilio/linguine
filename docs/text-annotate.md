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
Popup (pages/popup)  ──▶ Content Script (pages/content/.../all)
   │                         │
   │ openReadingMode         │ initializes TextAnnotateManager
   ▼                         ▼
ReadingMode Overlay (DOM managed by ReadingModeUI)
   │
   │ uses packages/api/lib/text-annotate/*
   ▼
Chrome AI APIs (Translator, LanguageModel, LanguageDetector)
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
- `reading-mode-ui.ts`: DOM-based overlay; immediate plain text, progressive inline annotations, tooltips, progress bar, TTS
- Wikimedia image enrichment: optional images per annotated chunk (up to 3), fetched via background
- `styles.ts`: Styles for overlay, underlines, tooltips, progress bar
- `text-annotate-manager.ts`: Entry point managing extraction, annotation, UI lifecycle, and message handling
- `index.ts`: Public exports; re-exported by `packages/api/index.mts`

### Content Script Integration

- `pages/content/src/matches/all/index.ts` initializes `TextAnnotateManager` and handles messages:
  - `openReadingMode` with `{ useFullContent: boolean }`
  - `closeReadingMode`
- Popup (`pages/popup/src/Popup.tsx`) buttons:
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
- Tooltips show POS + literal + contextual differences when applicable
- Tooltips can include up to three Wikimedia images with simple prev/next controls
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
- Comprehensive timing metrics:
  - total time, text length, ms/char
  - total operations (chunks)
  - total translation time, avg ms/op
  - estimated sequential time, parallel speedup
- Per-phase timings (extract, detect, segment, prechunk, translate, finalize) streamed to HUD
- Demo mode: short Thai sample for end-to-end testing and timing
- Robust console logs across all phases to diagnose “stuck” states

## Message Passing

- Popup → Content Script: `openReadingMode`, `closeReadingMode`
- Content manages DOM overlay via `ReadingModeUI` (no React)
- Internal progress via direct method calls and Chrome messaging (no CustomEvents)
- Background fetch for images: UI/content asks background `fetchWikimediaImages` to avoid CORS; background calls Wikimedia API and returns URLs

## UI Details

- Two-row header: title + X top row (space-between); progress row centered below
- Progress container has min-height and fades out to avoid layout shift
- Spaces and punctuation are not annotated; whitespace-only chunks ignored

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


