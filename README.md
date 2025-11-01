<div align="center">

<img alt="Linguine Logo" src="chrome-extension/public/pasta-illustration-2.png" width="400" />


![](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![](https://img.shields.io/badge/Typescript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![](https://badges.aleen42.com/src/vitejs.svg)
![Chrome AI](https://img.shields.io/badge/Chrome%20Built--in%20AI-2025-blue?style=flat-square)

**🚀 Submission to the [Google Chrome Built-in AI Challenge 2025](https://googlechromeai2025.devpost.com/)**

**📹 [Watch Demo Video](https://youtu.be/ckd6fi7N4Oo)**

</div>

> [!NOTE]
> Linguine uses Chrome's Built-in AI APIs to provide intelligent language learning features on top of regular browsing. All AI processing happens client-side with privacy, offline access, and cost-efficiency benefits.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [About](#about)
  - [Why (The Problem)](#why-the-problem)
  - [How (The Solution)](#how-the-solution)
  - [What (The Result)](#what-the-result)
- [Chrome Built-in AI Challenge 2025](#chrome-built-in-ai-challenge-2025)
  - [Submission Highlights](#submission-highlights)
- [Features](#features)
  - [Vocabulary Learning Loop Features](#vocabulary-learning-loop-features)
  - [Comprehension Learning Loop Features](#comprehension-learning-loop-features)
  - [General Features](#general-features)
- [Architecture](#architecture)
- [Core Learning Loops](#core-learning-loops)
  - [Vocabulary Learning Loop](#vocabulary-learning-loop)
  - [Comprehension Learning Loop](#comprehension-learning-loop)
  - [How They Reinforce Each Other](#how-they-reinforce-each-other)
- [Installation](#installation)
  - [Load in Chrome ](#load-in-chrome-)
- [Flags to Enable](#flags-to-enable)
- [Linguine Interfaces](#linguine-interfaces)
  - [Popup](#popup)
  - [Rewriter Widget](#rewriter-widget)
  - [Reading Mode](#reading-mode)
  - [Side Panel](#side-panel)
    - [Rewrites Tab](#rewrites-tab)
    - [Vocabulary Tracker Tab](#vocabulary-tracker-tab)
- [Key Features in Detail](#key-features-in-detail)
  - [Reading Mode](#reading-mode-1)
  - [Text Simplification](#text-simplification)
  - [Vocabulary Analytics](#vocabulary-analytics)
  - [Text Rewrites Library](#text-rewrites-library)
- [Theme System](#theme-system)
- [Development](#development)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)
- [Reference](#reference)

## About

**Linguine** transforms any webpage into a powerful language learning tool using Chrome's Built-in AI APIs. Everything runs locally on your device, meaning no data leaves your browser.

### Why (The Problem)

Language learning today is fragmented—vocabulary apps, translation tools, and reading platforms exist separately, breaking the natural learning flow. There's no unified tool that transforms everyday browsing into a seamless, contextual language learning experience.

### How (The Solution)

Linguine leverages Chrome's Built-in AI APIs (Prompt API, Translator API, Rewriter API, LanguageDetector API) to deliver intelligent language learning features entirely client-side. We built a layered architecture with SQLite (OPFS) for offline persistence, enabling privacy-first learning without external services.

### What (The Result)

Two interconnected learning loops that accelerate language acquisition:
1. **Vocabulary Learning Loop**: Discover words while browsing → Add to database → Review with spaced repetition → Master through practice
2. **Comprehension Learning Loop**: Encounter complex text → Simplify with AI → Understand better → Return with confidence

These loops reinforce each other: vocabulary helps comprehension, and simplified texts provide context for vocabulary.

**Why Linguine?**
- 🔒 Privacy-first: All AI processing happens client-side
- 🌐 Works offline after initial setup
- 💰 No API costs
- 📚 Track vocabulary, simplify texts, and get AI insights
- 🌍 Multi-language support (tested on: English, Spanish, French, Thai, Japanese, Mandarin)

## Chrome Built-in AI Challenge 2025

🚀 **Submission to [Google Chrome Built-in AI Challenge 2025](https://googlechromeai2025.devpost.com/)**

### Submission Highlights

Linguine demonstrates comprehensive use of Chrome's Built-in AI ecosystem to solve real-world language learning challenges:

**APIs Used:**
- **Prompt API (LanguageModel)**: Contextual translations, vocabulary analytics, example sentence generation, natural language query parsing
- **Translator API**: Fast literal translations for word-by-word annotations
- **Rewriter API**: Text simplification to make complex content accessible
- **LanguageDetector API**: Automatic language detection from webpage content

**Problem Solved:**
Language learning is fragmented across separate tools, breaking natural learning flow. Linguine unifies vocabulary acquisition, text comprehension, and spaced repetition into a seamless browsing-integrated experience.

**Key Innovations:**
- Two reinforcing learning loops that work together
- Privacy-first client-side architecture with zero data transmission
- Progressive AI streaming for non-blocking user experience
- Multi-language support with intelligent segmentation
- Offline capability with SQLite persistence

See [ABOUT.md](ABOUT.md) for complete project details.

## Features

Linguine's features support two interconnected learning loops that accelerate language acquisition:

### Vocabulary Learning Loop Features
- 📚 **Vocabulary Tracking**: Personal database with knowledge levels (1-5) and spaced repetition
- 🃏 **ANKI-Style Review**: Flashcard system with automatic review scheduling (1-hour intervals)
<!-- - 📊 **AI Analytics**: Natural language queries about your vocabulary progress -->
- 🎯 **Visual Indicators**: Color-coded underlines in Reading Mode show vocabulary status (red=unknown, orange=challenging, green=easy, gray=mastered)
- ➕ **Quick Add**: One-click vocabulary addition while browsing any webpage

### Comprehension Learning Loop Features
- 📖 **Reading Mode**: Word-by-word translations with progressive loading and instant text display
- ✏️ **Text Simplification**: Simplify complex texts using Rewriter API (experimental multi-language support)
- 💾 **Rewrite Library**: Save simplified texts with source links and readability scores for future reference
- 🔗 **Context Preservation**: Jump back to original text locations using Chrome Text Fragment API

### General Features
- 🌍 **Multi-Language**: Supports 6+ languages with intelligent detection and segmentation
- 🔒 **Privacy-First**: Everything runs client-side with zero data leaving your browser
- 🌐 **Offline Capable**: Works entirely offline after initial setup
- 📈 **Progress Tracking**: Monitor vocabulary growth and text comprehension improvements over time

> [!NOTE]
> **Experimental Language Support**: The Rewriter API officially supports English, Spanish, and Japanese. We use it optimistically for all languages - results may vary. Tested on: English, Spanish, French, Thai, Japanese, and Mandarin.

**Built with:** React, TypeScript, Vite, Turborepo, SQLite (OPFS)

## Architecture

Layered architecture: UI (React) → API Layer → Background/Offscreen → SQLite (OPFS)

See [Architecture Overview](docs/architecture-overview.md) for details.

## Core Learning Loops

Linguine is built around two interconnected learning loops that work together to accelerate language acquisition:

### Vocabulary Learning Loop

**Flow**: Browse → Discover → Add → Review → Master

1. **Browse**: Engage with authentic web content in your target language
2. **Discover**: Encounter unfamiliar words naturally in context
3. **Add**: One-click vocabulary addition to your personal database
4. **Review**: ANKI-style spaced repetition flashcards with 1-hour review intervals
5. **Master**: Track knowledge levels (1-5) and progress toward mastery

**Key Features:**
- Visual vocabulary indicators in Reading Mode (color-coded underlines)
- Automatic review scheduling based on knowledge level
- Translation and example sentences generated on-demand
- Progress tracking and analytics

### Comprehension Learning Loop

**Flow**: Encounter → Simplify → Understand → Return

1. **Encounter**: Discover complex text while browsing authentic content
2. **Simplify**: Use Chrome's Rewriter API to make text more accessible
3. **Understand**: Save simplified versions with readability scores
4. **Return**: Jump back to original text locations with better understanding

**Key Features:**
- Text simplification with readability scoring
- Personal library of simplified texts with source links
- Jump-to-original functionality using Chrome Text Fragment API
- Progress tracking showing comprehension improvements

### How They Reinforce Each Other

- **Vocabulary → Comprehension**: Words learned through the vocabulary loop help you understand more complex texts
- **Comprehension → Vocabulary**: Simplified texts provide context and examples for vocabulary words
- **Unified Experience**: Both loops happen seamlessly while you browse, creating natural, contextual learning

This dual-loop system creates a powerful learning cycle where vocabulary acquisition and text comprehension mutually reinforce each other, accelerating overall language proficiency.

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/fustilio/linguine
   cd linguine
   ```
2. Ensure your node version is >= than in `.nvmrc` file (recommend using [nvm](https://github.com/nvm-sh/nvm?tab=readme-ov-file#intro))
3. Install pnpm globally: `npm install -g pnpm`
4. Install dependencies: `pnpm install`

> [!IMPORTANT]
> On Windows, make sure you have WSL enabled and Linux distribution (e.g. Ubuntu) installed on WSL.
> 
> [Installation Guide](https://learn.microsoft.com/en-us/windows/wsl/install)

### Load in Chrome <a name="installation-chrome"></a>

1. Build the extension:
   - Dev: `pnpm dev` (on Windows, you should run as administrator)
   - Prod: `pnpm build`
2. Open `chrome://extensions` in Chrome
3. Enable <kbd>Developer mode</kbd> in the upper right corner
4. Click <kbd>Load unpacked</kbd> in the upper left corner
5. Select the `dist` directory from the linguine project
6. Enable the extension in `chrome://extensions` if not turned on already
7. Open Extensions from the toolbar and pin <kbd>Linguine</kbd> for easy access 

## Flags to Enable
The Chrome Built-In APIs used by Linguine all require specific flags to be enabled (except the Language Detector API). After they have been enabled, Chrome must be restarted for the tools to take effect. 
- <kbd>Rewriter API</kbd>: enable `chrome://flags/#rewriter-api-for-gemini-nano`
- <kbd>PromptAI API</kbd>: enable `chrome://flags/#prompt-api-for-gemini-nano`
- <kbd>Translator API</kbd>: enable `chrome://flags/#translation-api`

## Linguine Interfaces

### Popup
The first interface to enable or disable the extension. Enabling the extension adds a moveable <kbd>Rewriter Widget</kbd> on the browsing webpage. It is also an entry point to open <kbd>Reading Mode</kbd> or the <kbd>Side Panel</kbd> (Right-click icon > Open side panel). Customisation for widget size, dark mode, are also done here.

### Rewriter Widget
The widget rewrites highlighted text in a manner that is easier to understand. This is useful for language learners who know basic words, but prefer complex vocabulary to be rephrased instead of translated.

Steps:
1. Highlight text on webpage written in a target language (eg. French)
2. Click on the widget 
3. Toggle between the original text and the rewritten version
4. Tick to confirm selection

> [!NOTE]
> **Waiting for the Pasta to Spin?**: You may notice that the first rewrite always takes the longest. This is because the Rewriter API has to download a model depending on the language the current webpage is in. This download can only be triggered by a User Activation (i.e. a button click by the user). But fret not, subsequent rewrites will always be faster than the first!

### Reading Mode
Assisted reading interface for focused learning of page content in target language. Contains accessibility features such as <b>text size variability</b>, <b>line spacing</b>, <b>column margins</b> and <b>dark mode</b>. 
- `Hover` over word to see literal and contextual translation.
- `Click` to hear text-to speech.
- `Toggle images` to enable image association with word (sourced from WikiMedia).

### Side Panel
The side panel contains two tabs. The history of <b>local rewrites</b> for the current tab. A <b>personal vocabulary database</b> for language learners as they browse.

#### Rewrites Tab
Locally stored history of past rewrites alongside text difficulty, date, and details. 
- `Jump` to a previous rewrite on the current webpage. Available even after revisiting or refreshing the webpage after a long time. The user may access previous rewrites and jump to that point to recap their knowledge.
- `Rescan` to refresh rewrite history.

#### Vocabulary Tracker Tab
Locally stored database for users to input new words learned during browsing.
- `Add` vocabulary seen by the user when browsing webpages. Serves as a quick notepad for learners. 
-  `Filter` language-specific vocabulary. 12 languages supported for brevity. 

## Key Features in Detail

### Reading Mode
Full-page overlay with word-by-word translations. Shows plain text instantly, streams annotations progressively. Uses Translator API (literal) and LanguageModel API (contextual). Includes TTS on click.

See [Text Annotate Feature](docs/text-annotate.md)

### Text Simplification
Select any text → click simplify → Chrome's Rewriter API makes it easier. Tracks readability scores and saves with source links.

> [!NOTE]
> **Experimental**: Rewriter API officially supports English, Spanish, Japanese. We use it for all languages optimistically.

See [Text Rewrites Feature](docs/text-rewrites.md)

### Vocabulary Analytics
Ask natural language questions: "Show me struggling Spanish words" or "What's my proficiency level?" AI analyzes your vocabulary database.

See [Vocabulary Analytics Feature](docs/vocabulary-analytics.md)

### Text Rewrites Library
Personal archive of simplified texts. Filter by language, readability, date, or source URL. Multi-language readability scoring (Flesch Reading Ease, etc.)

See [Text Rewrites Feature](docs/text-rewrites.md)

## Theme System

Light/dark mode with system preference support. Persists via `chrome.storage` across all extension pages.

See [Theme System Documentation](docs/theme-system.md) for setup details.

## Development

Monorepo with Turborepo. Key directories:
- `chrome-extension/` - Manifest and background
- `pages/` - Extension UI pages
- `packages/api/` - Chrome AI integration and database APIs
- `packages/sqlite/` - SQLite operations via OPFS
- `packages/shared/` - Shared utilities and constants
- `packages/ui/` - UI components

**Install dependencies:**
```bash
pnpm i <package> -w           # Root workspace
pnpm i <package> -F <name>     # Specific package
```

See [Architecture Overview](docs/architecture-overview.md) for full details.

## Testing

The following webpages may be used for browsing: 
- [Thai News](https://www.thairath.co.th/news/local/2891763)
- [Japanese News](https://globe.asahi.com/article/16016162?iref=comtop_Globe_02)
- [French News](https://www.france24.com/fr/plan%C3%A8te/20251031-des-paysans-du-pakistan-engagent-un-bras-de-fer-avec-deux-pollueurs-allemands)
- [English News](https://www.straitstimes.com/asia/se-asia/asean-leaders-push-for-stronger-trade-ties-with-rcep-members-and-other-partners)

## Troubleshooting

**HMR frozen?** Restart dev server (`Ctrl+C` then `pnpm dev`)

**Imports not resolving?** (WSL users) Connect VS Code to WSL remotely

## Documentation

- [Architecture Overview](docs/architecture-overview.md)
- [Message Passing System](docs/message-passing-system.md)
- [Packages API](docs/packages-api.md)
- [Packages SQLite](docs/packages-sqlite.md)
- [Text Annotate](docs/text-annotate.md)
- [Text Rewrites](docs/text-rewrites.md)
- [Vocabulary Analytics](docs/vocabulary-analytics.md)

## Reference

- [Chrome Extensions](https://developer.chrome.com/docs/extensions)
- [Chrome Built-in AI APIs](https://developer.chrome.com/docs/ai)
- [Turborepo](https://turbo.build/repo/docs)
