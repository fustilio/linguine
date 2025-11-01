# Testing Instructions

## Setup

1. Download ZIP from [GitHub release](https://github.com/fustilio/linguine/releases/tag/submission)
2. Unpack it and load into Chrome browser (`chrome://extensions` → Load unpacked)
3. Configure the appropriate flags (restart required):
   - `chrome://flags/#rewriter-api-for-gemini-nano`
   - `chrome://flags/#prompt-api-for-gemini-nano`
   - `chrome://flags/#translation-api`
4. Use one of the recommended sites for reading content in other languages:
   - [French](https://www.france24.com/fr/plan%C3%A8te/20251031-des-paysans-du-pakistan-engagent-un-bras-de-fer-avec-deux-pollueurs-allemands)
   - [Spanish](https://elpais.com/internacional/)
   - [Thai](https://www.thairath.co.th/news/local/2891763)
   - [Japanese](https://globe.asahi.com/article/16016162?iref=comtop_Globe_02)

## Testing Flow

5. Open popup and make sure extension is enabled. Make sure yellow Linguine widget is available on the bottom right.
6. Select a short piece of text (e.g., a clause or sentence) and press the widget. It should start spinning.
   - **Note**: For the first time, at this point you might need to wait awhile as the model is downloaded.
7. You then have the option of "accepting" that rewrite.
8. Select a large chunk of text like a paragraph, right-click to open context menu and select **Linguine → Read with Linguine**.
9. Reading mode should appear.
10. Wait for the annotations to load, hover over them to see the literal and/or contextual translations.
11. Save vocab to store by adding it via tooltip or by add on button.
12. Right-click icon and open sidebar and explore the tabs of saved data.

## Troubleshooting

- **No translations**: Verify Translator flag enabled, restart Chrome
- **Slow rewrite**: First use downloads model (10-30s), then faster
- **No flashcards**: Add vocabulary first, then review appears
- **Extension won't load**: Check Developer mode enabled, selected extracted folder
- **Widget not appearing**: Verify extension is enabled in popup
