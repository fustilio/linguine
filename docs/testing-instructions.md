# Testing Instructions

## Setup

1. Download ZIP from [GitHub release](https://github.com/fustilio/linguine/releases/tag/submission)
2. Extract and load folder in Chrome (`chrome://extensions` → Load unpacked)
3. Enable Chrome flags (restart required):
   - `chrome://flags/#rewriter-api-for-gemini-nano`
   - `chrome://flags/#prompt-api-for-gemini-nano`
   - `chrome://flags/#translation-api`
4. Test pages: [French](https://www.france24.com/fr/plan%C3%A8te/20251031-des-paysans-du-pakistan-engagent-un-bras-de-fer-avec-deux-pollueurs-allemands) | [Spanish](https://elpais.com/internacional/) | [Thai](https://www.thairath.co.th/news/local/2891763) | [Japanese](https://globe.asahi.com/article/16016162?iref=comtop_Globe_02)

## Quick API Testing

### 1. Translator API
- Open [French News](https://www.france24.com/fr/plan%C3%A8te/20251031-des-paysans-du-pakistan-engagent-un-bras-de-fer-avec-deux-pollueurs-allemands)
- Extension icon → "Open Reading Mode"
- Hover over words → See instant literal translations

### 2. Rewriter API
- Highlight complex paragraph on any page
- Click floating widget
- Wait for rewrite (first time: 10-30s, then <5s)
- Toggle original/simplified

### 3. Prompt API (LanguageModel)
- Side Panel → "Review" tab
- Flip vocabulary card (click word)
- See "Example Usage" generated

### 4. LanguageDetector API
- Open any foreign language page
- Extension icon → "Open Reading Mode"
- Check header for detected language

## Learning Flow Demo

**Vocabulary Loop** (2 min):
1. Reading Mode → Hover word → Click "Add to Learn"
2. Side Panel → "Vocabulary Tracker" → Word appears
3. Side Panel → "Review" tab → Flashcard appears
4. Rate card → Knowledge level updates

**Comprehension Loop** (1 min):
1. Highlight text → Click widget → See simplified version
2. Save rewrite → Side Panel → "Rewrites" tab
3. Click "Jump" → Returns to original text

**Loops Together**:
- Review words → Return to Reading Mode → More words are green (learned)
- Simplified texts provide easier context for vocabulary

## Troubleshooting

- **No translations**: Verify Translator flag enabled, restart Chrome
- **Slow rewrite**: First use downloads model (10-30s), then faster
- **No flashcards**: Add vocabulary first, then review appears
- **Extension won't load**: Check Developer mode enabled, selected extracted folder