## Inspiration

**The Problem**

Language learning is fragmented. Learners switch between vocabulary apps, translation tools, and reading platforms, breaking natural learning flow. No tool unifies browsing with contextual language learning.

**The Vision**

Transform everyday browsing into seamless language learning. Every webpage becomes a learning opportunity—no copy-pasting or juggling tools. Just click and learn.

**Why It Matters**

Traditional tools create barriers between learning and real-world language use. Linguine bridges this gap by making any webpage an interactive learning environment, enabling contextual learning—exactly how languages are naturally acquired.

## What it does

Linguine transforms any webpage into a language learning tool using Chrome's Built-in AI APIs. Everything runs client-side with zero data leaving your browser.

### Two Reinforcing Learning Loops

1. **Vocabulary Learning Loop**: Browse → Discover → Add → Review → Master
   - Discover words naturally while browsing
   - Add to personal database with one click
   - Review with ANKI-style spaced repetition (1-hour intervals)
   - Track knowledge levels (1-5) toward mastery

2. **Comprehension Learning Loop**: Encounter → Simplify → Understand → Return
   - Encounter complex text while browsing
   - Simplify with Chrome's Rewriter API
   - Save simplified versions with source links
   - Return to original text with better understanding

These loops reinforce each other: vocabulary helps comprehension, simplified texts provide vocabulary context.

### Key Features

- **📖 Reading Mode**: Word-by-word translations with progressive streaming. Hover for translations, click for TTS.
- **✏️ Text Simplification**: Simplify complex text with Rewriter API. Track readability scores.
- **📚 Vocabulary Tracking**: Personal database with spaced repetition. ANKI-style flashcards.
<!-- - **🧠 AI Analytics**: Natural language queries about vocabulary progress. -->
- **🔒 Privacy-First**: Everything client-side. Works offline. No API costs.
- **🌍 Multi-Language**: Tested on 6 languages (English, Spanish, French, Thai, Japanese, Mandarin).

### Chrome Built-in AI APIs Used

- **Prompt API (LanguageModel)**: Contextual translations, analytics, example generation, query parsing
- **Translator API**: Fast literal translations for word annotations
- **Rewriter API**: Text simplification for accessibility
- **LanguageDetector API**: Automatic language detection

## How we built it

**Architecture**: Layered system (UI → API → Background/Offscreen → SQLite)

**Stack**: React + TypeScript, Vite, Turborepo, SQLite (OPFS), Zod validation

**Key Decisions**:
1. **Offscreen Document Pattern**: Required for OPFS access (service workers can't access OPFS directly)
2. **Progressive Streaming**: Display text instantly, stream annotations in background
3. **Multi-Language Segmentation**: Intl.Segmenter + Thai wordcut + fallbacks
4. **Message Passing**: Direct database communication via offscreen document
5. **Visual Vocabulary Indicators**: Color-coded underlines (red=unknown, orange=challenging, green=easy, gray=mastered)

## Challenges we ran into

**OPFS Access**: Service workers can't access OPFS → implemented offscreen document pattern with message passing.

**Non-Blocking AI**: Progressive streaming needed—display content immediately, load annotations in background with batched operations.

**Multi-Language Segmentation**: Different word boundaries per language. Built language-specific strategies with fallbacks.

**State Synchronization**: Multiple isolated contexts (popup, side panel, options, content scripts). Used Zod validation + reactive chrome.storage.

**User Gestures**: Chrome AI APIs require user gestures (especially Rewriter's initial download). Designed UI with explicit user actions.

**Language Detection**: Built fallback chain—LanguageDetector → character analysis → Readability hints → target language.

## Accomplishments that we're proud of

✅ **Privacy-First**: Zero data leaves browser. Everything client-side.

✅ **Offline Capable**: Works entirely offline after setup. SQLite via OPFS persists everything.

✅ **Multi-Language**: Tested on 6 diverse languages with unique challenges (writing systems, segmentation, readability).

✅ **Performance**: Progressive loading, batched AI requests, React Query caching, indexed queries.

✅ **Robust Architecture**: Type-safe (Zod), clean separation of concerns, comprehensive error handling.

✅ **UX Innovation**: ANKI-style spaced repetition (1-hour intervals), visual vocabulary indicators, seamless browsing integration.

✅ **Complete Chrome AI Integration**: Four APIs working seamlessly together—Prompt, Translator, Rewriter, LanguageDetector.

## What we learned

**Chrome Extension Architecture**: Service workers, offscreen documents, content script injection, message passing, lifecycle management.

**Chrome AI APIs**: Always check availability, handle user gestures gracefully, implement fallbacks, design for async/streaming responses, cache and batch requests.

**Database Design**: Schema migrations, indexing strategies, connection management, transaction boundaries, cross-system queries.

**Language Processing**: Segmentation varies by language, readability needs language-specific formulas, text normalization is crucial, character encoding matters.

**User Experience**: Users need immediate feedback, visual indicators are powerful, seamless integration beats feature richness, offline capability opens new use cases, privacy-first builds trust.

**Developer Experience**: Type safety, monorepo management, and clear documentation pay off in code quality and feature velocity.

## What's next for Linguine - Language Learning

**Near-term**:
- Cache vocabulary card backs (translations, examples) for instant display and offline reviews
- Batch reapplication of text rewrites on page revisit with visual indicators
- Expanded language support with improved segmentation

**Future**:
- Advanced analytics: CEFR tracking over time, personalized recommendations, learning efficiency metrics
- Community features: Share rewrite collections, collaborative vocabulary building, achievements
- Reading Mode enhancements: Better POS tagging, enhanced tooltips, comprehension exercises
- Performance: Optimized batching, database caching, mobile improvements
- Accessibility: Enhanced screen reader support, keyboard navigation, high contrast mode