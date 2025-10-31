<div align="center">

<img alt="Linguine Logo" src="chrome-extension/public/pasta-illustration-2.png" width="400" />


![](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![](https://img.shields.io/badge/Typescript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![](https://badges.aleen42.com/src/vitejs.svg)
![Chrome AI](https://img.shields.io/badge/Chrome%20Built--in%20AI-2025-blue?style=flat-square)

**🚀 Submission to the [Google Chrome Built-in AI Challenge 2025](https://googlechromeai2025.devpost.com/)**

</div>

> [!NOTE]
> Linguine uses Chrome's Built-in AI APIs to provide intelligent language learning features. All AI processing happens client-side with privacy, offline access, and cost-efficiency benefits.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [About](#about)
- [Chrome Built-in AI Challenge 2025](#chrome-built-in-ai-challenge-2025)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Key Features in Detail](#key-features-in-detail)
  - [Reading Mode](#reading-mode)
  - [Text Simplification](#text-simplification)
  - [Vocabulary Analytics](#vocabulary-analytics)
  - [Text Rewrites Library](#text-rewrites-library)
- [Theme System](#theme-system)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)
- [Reference](#reference)

## About

**Linguine** transforms any webpage into a powerful language learning tool using Chrome's Built-in AI APIs. Everything runs locally on your device - no data leaves your browser.

**Why Linguine?**
- 🔒 Privacy-first: All AI processing happens client-side
- 🌐 Works offline after initial setup
- 💰 No API costs
- 📚 Track vocabulary, simplify texts, and get AI insights
- 🌍 Multi-language support (tested on: English, Spanish, French, Thai, Japanese, Mandarin)

## Chrome Built-in AI Challenge 2025

🚀 **Submission to [Google Chrome Built-in AI Challenge 2025](https://googlechromeai2025.devpost.com/)**

Linguine uses multiple Chrome Built-in AI APIs (LanguageModel, Translator, Rewriter, LanguageDetector) to deliver comprehensive language learning features entirely client-side.

## Features

- 📖 **Reading Mode**: Word-by-word translations with progressive loading
- ✏️ **Text Simplification**: Simplify complex texts using Rewriter API (experimental multi-language support)
- 📚 **Vocabulary Tracking**: Personal vocabulary database with knowledge levels
- 📊 **AI Analytics**: Natural language queries about your progress
- 🎯 **Text Evaluation**: Analyze any text against your vocabulary
- 📈 **CEFR Estimation**: AI-powered proficiency assessment
- 🌍 **Multi-Language**: Supports languages available in Chrome's Built-in AI APIs

> [!NOTE]
> **Experimental Language Support**: The Rewriter API officially supports English, Spanish, and Japanese. We use it optimistically for all languages - results may vary. Tested on: English, Spanish, French, Thai, Japanese, and Mandarin.

**Built with:** React, TypeScript, Vite, Turborepo, SQLite (OPFS)

## Architecture

Layered architecture: UI (React) → API Layer → Background/Offscreen → SQLite (OPFS)

See [Architecture Overview](docs/architecture-overview.md) for details.

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
3. Enable <kbd>Developer mode</kbd>
4. Click <kbd>Load unpacked</kbd> in the upper left corner
5. Select the `dist` directory from the linguine project

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

> [!TODO]
> Add recommended test sites for easy testing of Linguine features across different languages.

Currently tested on: English, Spanish, French, Thai, Japanese, and Mandarin content.

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
