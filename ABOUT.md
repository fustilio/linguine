## Inspiration

**The Problem**

Language learning today is fragmented and disconnected from real-world usage. Learners must constantly switch between vocabulary apps, translation tools, and reading platforms, breaking the natural flow of learning. Existing solutions isolate language learning from actual language use, making it difficult to learn naturally while engaging with authentic content.

**The Vision**

We believe language learning should happen seamlessly while you browse the web. Every webpage you visit, every article you read, every blog post you stumble upon should become a learning opportunity without disrupting your natural browsing experience. There should be no need to copy-paste text into separate apps or juggle multiple tools—learning should be as simple as clicking a button.

**Why It Matters**

Traditional language learning tools create artificial barriers between learning and real-world language use. Linguine bridges this gap by transforming any webpage into an interactive learning environment, enabling learners to build vocabulary and improve comprehension in context—exactly how languages are naturally acquired.

## What it does

Linguine transforms any webpage into a powerful language learning tool using Chrome's Built-in AI APIs. The extension works entirely client-side, meaning all AI processing happens on your device with zero data leaving your browser.

**Core Learning System: Two Reinforcing Loops**

Linguine is built around two interconnected learning loops that work together to accelerate language acquisition:

1. **Vocabulary Learning Loop**: Browse → Discover → Add → Review → Master
   - As you browse webpages, discover unfamiliar words naturally in context
   - Add words to your personal vocabulary database with one click
   - Review words using ANKI-style spaced repetition flashcards
   - Track knowledge levels (1-5) with automatic review scheduling
   - Master words through consistent practice and engagement

2. **Comprehension Learning Loop**: Encounter → Simplify → Understand → Return
   - Encounter complex text while browsing authentic web content
   - Simplify text using Chrome's Rewriter API to make it more accessible
   - Save simplified versions with source links for future reference
   - Track readability improvements over time
   - Return to original text with better understanding and confidence

These two loops reinforce each other: vocabulary learned through the first loop helps you understand more complex texts, while simplified texts from the second loop provide context and examples for vocabulary words.

**Key Features**

- **📖 Reading Mode**: Full-page overlay with word-by-word translations. Hover to see literal and contextual translations, click to hear text-to-speech. Progressive streaming ensures instant text display with annotations loading smoothly in the background.

- **✏️ **Text Simplification**: Select any complex text and use Chrome's Rewriter API to make it easier to understand. Track readability scores and save simplified versions with source links for future reference.

- **📚 Vocabulary Tracking**: Personal vocabulary database with knowledge levels and spaced repetition. Add words while browsing, review using ANKI-style flashcards, and track your progress over time.

- **🧠 AI Analytics**: Ask natural language questions about your vocabulary progress. Get insights into your learning patterns, struggling words, and proficiency levels.

- **🔒 Privacy-First**: Everything runs client-side using Chrome's Built-in AI APIs. Zero data leaves your browser, enabling offline access after initial setup with no API costs.

- **🌍 Multi-Language Support**: Tested on 6 languages (English, Spanish, French, Thai, Japanese, Mandarin) with more being added. Intelligent language detection and multi-language segmentation for authentic learning experiences.

**Chrome Built-in AI APIs Used**

Linguine leverages the following Chrome Built-in AI APIs:
- **Prompt API (LanguageModel)**: Contextual translations, vocabulary analytics, example sentence generation, and natural language query parsing
- **Translator API**: Fast literal translations for word-by-word annotations in Reading Mode
- **Rewriter API**: Text simplification to make complex content more accessible for language learners
- **LanguageDetector API**: Automatic language detection from webpage content for seamless language identification

## How we built it

**Architecture**

Linguine follows a layered architecture pattern that separates concerns and ensures scalability:

```
UI Layer (React) 
  ↓
API Layer (packages/api)
  ↓
Background/Offscreen Document
  ↓
SQLite Database (OPFS)
```

This architecture enables:
- **Type-safe APIs**: Zod validation for all inputs and outputs
- **Message passing**: Efficient communication between extension contexts
- **Database persistence**: SQLite via OPFS for offline access
- **Progressive loading**: Real-time streaming of AI annotations without blocking UI

**Technical Stack**

- **Frontend**: React with TypeScript, Tailwind CSS for styling
- **Build System**: Vite for fast development, Turborepo for monorepo management
- **Database**: SQLite with OPFS (Origin Private File System) for persistent, offline storage
- **State Management**: TanStack Query for server state, React hooks for local state
- **Validation**: Zod schemas for runtime type safety across all layers

**Key Technical Decisions**

1. **Offscreen Document Pattern**: Chrome extensions require offscreen documents to access OPFS (service workers can't access it directly). We implemented a robust message-passing architecture that routes database operations directly to the offscreen document.

2. **Progressive Annotation Streaming**: Reading Mode displays plain text instantly, then streams annotations progressively. This ensures users see content immediately while AI processing happens in the background, creating a smooth, non-blocking experience.

3. **Multi-Language Segmentation**: Different languages require different segmentation strategies. We use `Intl.Segmenter` for most languages, with special handling for Thai (wordcut library) and graceful fallbacks for all languages.

4. **Message Passing Architecture**: All extension contexts (options page, popup, side panel, content scripts) can communicate directly with the database via offscreen document, bypassing the background script for optimal performance.

5. **Vocabulary-Based Visual Styling**: Reading Mode uses color-coded underlines based on vocabulary knowledge levels—red for unregistered words, orange for challenging, green for easy, gray for mastered—providing instant visual feedback on learning progress.

## Challenges we ran into

**OPFS Access Restrictions**

The biggest challenge was accessing SQLite databases in a Chrome extension. Service workers (background scripts) can't access OPFS directly, so we had to implement the offscreen document pattern. This required careful message passing architecture and lifecycle management to ensure the offscreen document exists when needed while maintaining good performance.

**Real-Time AI Processing Without Blocking UI**

Progressive streaming was crucial for user experience. We needed to display content immediately while AI annotations loaded in the background. This required batched Promise.all() operations, careful progress tracking, and UI state management that could handle partial data gracefully.

**Multi-Language Segmentation**

Different languages have vastly different word boundaries. Thai requires a special wordcut library, Japanese needs character-level segmentation, and European languages need word-level segmentation. We built a robust system with language-specific segmentation strategies and fallbacks that work for any language.

**Maintaining State Across Extension Contexts**

Chrome extensions have multiple isolated contexts (popup, side panel, options page, content scripts). Keeping vocabulary and settings synchronized required a sophisticated message passing system with Zod validation and a reactive storage layer using chrome.storage with live updates.

**User Gesture Requirements**

Chrome AI APIs require user gestures for certain operations (especially the Rewriter API's initial model download). We had to design the UI to ensure all AI operations are triggered by explicit user actions, with clear feedback about what's happening and when.

**Language Detection Prioritization**

We needed a reliable way to detect webpage language. Chrome's LanguageDetector API is most accurate but not always available. We built a fallback system that tries LanguageDetector → character-based analysis → Readability language hints → target language, ensuring we always have a reasonable language guess.

## Accomplishments that we're proud of

**Privacy-First Architecture**

Everything runs client-side. Zero data leaves your browser. This isn't just a feature—it's a fundamental architectural decision that enables offline access, eliminates API costs, and ensures complete user privacy. Users can learn languages without any external services tracking their progress.

**Offline Capability**

After initial setup, Linguine works entirely offline. The SQLite database persists via OPFS, Chrome AI models run locally, and all vocabulary and text rewrites are stored locally. This means you can learn languages even without internet connectivity.

**Multi-Language Support**

We tested Linguine on 6 diverse languages: English, Spanish, French, Thai, Japanese, and Mandarin. Each language has unique challenges—different writing systems, segmentation rules, and readability algorithms. We built language-specific solutions while maintaining a unified user experience.

**Performance Optimizations**

- Progressive loading ensures instant content display
- Batched AI requests reduce latency
- React Query caching minimizes redundant API calls
- Indexed database queries for fast vocabulary lookups
- Efficient message passing reduces overhead

**Robust Architecture**

Type-safe with Zod validation at every layer, clear separation of concerns, comprehensive error handling, and graceful fallbacks. The codebase is maintainable, testable, and ready for future enhancements.

**User Experience Innovations**

- ANKI-style spaced repetition with 1-hour review intervals for rapid learning
- Visual vocabulary indicators (color-coded underlines) for instant feedback
- Seamless browsing integration that doesn't disrupt normal web use
- Dual progress bars for literal and contextual translations
- Vocabulary difficulty modification directly from tooltips

**Complete Chrome AI API Integration**

We're using four different Chrome Built-in AI APIs together seamlessly:
- Prompt API for contextual understanding and analytics
- Translator API for fast literal translations
- Rewriter API for text simplification
- LanguageDetector API for automatic language identification

This comprehensive integration showcases the full potential of Chrome's Built-in AI ecosystem.

## What we learned

**Chrome Extension Architecture**

Building a complex Chrome extension taught us about service workers, offscreen documents, content script injection, and message passing. We learned how to manage lifecycle, handle multiple isolated contexts, and ensure smooth communication between all parts of the extension.

**Chrome AI APIs**

Working with Chrome's Built-in AI APIs revealed important patterns:
- Always check API availability before use
- Handle user gesture requirements gracefully
- Implement fallbacks for unavailable APIs
- Design UI to work with async, streaming AI responses
- Cache and batch requests for performance

**Database Design**

SQLite in OPFS required us to think carefully about:
- Schema migrations and versioning
- Indexing strategies for performance
- Connection management and lifecycle
- Transaction boundaries for data consistency
- Cross-system queries for analytics

**Language Processing**

Languages are wonderfully diverse, and building a system that works across multiple languages taught us:
- Segmentation algorithms vary dramatically by language
- Readability scoring needs language-specific formulas
- Text normalization is crucial for matching
- Character encoding matters (especially for Asian languages)
- Visual text rendering affects learning (reading direction, fonts, spacing)

**User Experience**

Progressive loading, visual feedback, and state management across contexts were critical. We learned that:
- Users need immediate feedback even while AI processes in background
- Color-coded visual indicators are powerful learning tools
- Seamless integration is more important than feature richness
- Offline capability opens up new use cases
- Privacy-first architecture creates user trust

**Developer Experience**

Type safety with Zod, monorepo management with Turborepo, and clear documentation made the codebase maintainable. We learned that investing in developer experience pays off in code quality and feature velocity.

## What's next for Linguine - Language Learning

**Enhanced Caching for Vocabulary Card Backs**

We plan to cache translation and example usage data in the database, enabling instant card back display on subsequent reviews and full offline review capability. This will dramatically improve review session performance.

**Batch Reapplication of Text Rewrites**

When users revisit webpages with saved text rewrites, we'll automatically detect available rewrites and offer one-click reapplication. Visual indicators will show which text can be simplified, making it easy to revisit and review previously simplified content.

**Expanded Language Support**

We'll continue adding more languages with proper segmentation and readability scoring. Each new language teaches us more about language processing and helps us refine our algorithms.

**Advanced Analytics**

- CEFR proficiency tracking over time with visual progress charts
- Personalized learning recommendations based on vocabulary patterns
- Text comprehension analysis across different content types
- Learning efficiency metrics (time to mastery, retention rates)

**Community Features**

- Share rewrite collections with other learners
- Collaborative vocabulary building
- Learning streaks and achievements
- Export/import vocabulary databases

**Reading Mode Enhancements**

- Improved POS (part-of-speech) tagging with richer grammar information
- Better segmentation strategies for non-Latin scripts
- Enhanced tooltip functionality (copy translations, keyboard navigation)
- Reading comprehension exercises based on simplified texts

**Performance Improvements**

- Optimize AI request batching for even faster annotation streaming
- Implement database query caching for large vocabulary databases
- Reduce memory footprint for long reading sessions
- Improve mobile device performance

**Accessibility**

- Enhanced screen reader support
- Keyboard-only navigation improvements
- High contrast mode support
- Adjustable reading speeds for TTS

Linguine is just getting started. We're excited to continue building the future of contextual, privacy-first language learning.