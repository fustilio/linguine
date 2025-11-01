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
  - [Vocabulary Learning Loop](#vocabulary-learning-loop)
  - [Comprehension Learning Loop](#comprehension-learning-loop)
  - [General](#general)
- [Architecture](#architecture)
- [Core Learning Loops](#core-learning-loops)
  - [Vocabulary Learning Loop](#vocabulary-learning-loop-1)
  - [Comprehension Learning Loop](#comprehension-learning-loop-1)
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
Language learning is fragmented across separate tools, breaking natural flow. No unified tool transforms everyday browsing into seamless learning.

### How (The Solution)
Chrome Built-in AI APIs (Prompt, Translator, Rewriter, LanguageDetector) + layered architecture + SQLite (OPFS) = privacy-first, client-side learning.

### What (The Result)
Two reinforcing learning loops:
- **Vocabulary Loop**: Browse → Discover → Add → Review → Master
- **Comprehension Loop**: Encounter → Simplify → Understand → Return

Vocabulary helps comprehension; simplified texts provide vocabulary context.

**Why Linguine?**
- 🔒 Privacy-first: All AI processing happens client-side
- 🌐 Works offline after initial setup
- 💰 No API costs
- 📚 Track vocabulary, simplify texts, and get AI insights
- 🌍 Multi-language support (tested on: English, Spanish, French, Thai, Japanese, Mandarin)

## Chrome Built-in AI Challenge 2025

🚀 **Submission to [Google Chrome Built-in AI Challenge 2025](https://googlechromeai2025.devpost.com/)**

### Submission Highlights

**APIs Used:**
- **Prompt API (LanguageModel)**: Contextual translations, analytics, example generation
- **Translator API**: Fast literal translations for annotations
- **Rewriter API**: Text simplification for accessibility
- **LanguageDetector API**: Automatic language detection

**Problem Solved:** Language learning is fragmented. Linguine unifies vocabulary, comprehension, and spaced repetition into seamless browsing-integrated learning.

**Key Innovations:**
- Two reinforcing learning loops
- Privacy-first client-side architecture (zero data transmission)
- Progressive AI streaming (non-blocking UX)
- Multi-language support (6+ languages tested)
- Offline capability (SQLite via OPFS)

See [ABOUT.md](ABOUT.md) for complete details.

## Features

**Features organized by learning loop:**

### Vocabulary Learning Loop
- 📚 Personal database with knowledge levels (1-5) and spaced repetition
- 🃏 ANKI-style flashcards with 1-hour review intervals
- 🎯 Color-coded underlines (red=unknown, orange=challenging, green=easy, gray=mastered)
- ➕ One-click vocabulary addition while browsing

### Comprehension Learning Loop
- 📖 Reading Mode with word-by-word translations (progressive streaming)
- ✏️ Text simplification via Rewriter API
- 💾 Save simplified texts with source links and readability scores
- 🔗 Jump back to original text with Chrome Text Fragment API

### General
- 🌍 6+ languages (English, Spanish, French, Thai, Japanese, Mandarin)
- 🔒 Privacy-first: Everything client-side, zero data transmission
- 🌐 Works offline after setup
- 📈 Track vocabulary growth and comprehension improvements

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

Encounter words while browsing → Add to database → Review with ANKI-style flashcards (1-hour intervals) → Track knowledge levels (1-5) → Master through practice.

### Comprehension Learning Loop
**Flow**: Encounter → Simplify → Understand → Return

Find complex text → Simplify with Rewriter API → Save with readability scores → Jump back to original with better understanding.

### How They Reinforce Each Other
Vocabulary helps comprehension; simplified texts provide vocabulary context. Both loops happen seamlessly while browsing, creating natural learning.

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

For comprehensive testing instructions including setup, feature testing, and troubleshooting, see [Testing Instructions](docs/testing-instructions.md).

**Quick Setup:**
1. Download ZIP from [GitHub release](https://github.com/fustilio/linguine/releases/tag/submission)
2. Extract and load `dist` folder in Chrome (`chrome://extensions` → Load unpacked)
3. Enable Chrome flags (see [Testing Instructions](docs/testing-instructions.md))
4. Follow full testing guide for all features

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
