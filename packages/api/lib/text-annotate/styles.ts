/**
 * CSS styles for reading mode UI
 */

export function getReadingModeStyles(): string {
  return `
    #text-annotate-reading-mode {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      z-index: 999999;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #ffffff;
    }

    .text-annotate-header {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem 2rem;
      background: rgba(255, 255, 255, 0.1);
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .text-annotate-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      gap: 1rem;
    }

    .text-annotate-title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      flex: 1;
      min-width: 0; /* allow ellipsis */
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .text-annotate-close {
      background: transparent;
      border: none;
      color: #ffffff;
      font-size: 2rem;
      line-height: 1;
      cursor: pointer;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      transition: background-color 0.2s;
    }

    .text-annotate-close:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .text-annotate-progress-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      margin: 0 auto;
      min-height: 28px; /* reserve space to avoid layout shift */
      transition: opacity 0.3s ease;
    }

    .text-annotate-progress-label {
      font-size: 0.9rem;
      color: #cccccc;
      text-align: center;
    }

    .text-annotate-progress-bar {
      width: 100%;
      max-width: 300px;
      height: 6px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
      overflow: hidden;
    }

    .text-annotate-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4CAF50, #8BC34A);
      border-radius: 3px;
      transition: width 0.3s ease;
      width: 0%;
    }

    .text-annotate-plain-text {
      font-size: 1.1rem;
      line-height: 1.6;
      color: #ffffff;
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
      white-space: pre-wrap; /* preserve spaces and newlines */
    }

    .text-annotate-content {
      max-width: 800px;
      margin: 2rem auto;
      padding: 2rem;
      line-height: 1.8;
      font-size: 1.1rem;
    }

    .text-annotate-chunk {
      position: relative;
      display: inline;
      border-bottom: 1px dotted #4CAF50;
      cursor: help;
      transition: background-color 0.2s;
    }

    .text-annotate-chunk:hover {
      background-color: rgba(76, 175, 80, 0.2);
    }

    .text-annotate-chunk-differs {
      border-bottom-color: #FF9800;
    }

    .text-annotate-chunk-differs:hover {
      background-color: rgba(255, 152, 0, 0.2);
    }

    .text-annotate-tooltip {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-bottom: 0.5rem;
      padding: 0.75rem 1rem;
      background: #1a1a1a;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      min-width: 200px;
      max-width: 400px;
      z-index: 1000000;
      pointer-events: none;
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .text-annotate-tooltip-literal {
      color: #90CAF9;
      margin-bottom: 0.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .text-annotate-tooltip-contextual {
      color: #81C784;
    }

    .text-annotate-tooltip-translation {
      color: #ffffff;
    }

    .text-annotate-debug-panel {
      position: fixed;
      bottom: 0.75rem;
      left: 0.75rem;
      background: rgba(0,0,0,0.7);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 6px;
      padding: 0.5rem 0.75rem;
      font-size: 0.85rem;
      z-index: 1000001;
      display: none;
    }
    .text-annotate-debug-panel .dbg-row { margin: 2px 0; }
    .text-annotate-debug-panel .dbg-hint { color: #aaa; font-size: 0.75rem; margin-top: 4px; }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .text-annotate-content {
        padding: 1rem;
        font-size: 1rem;
      }

      .text-annotate-header {
        padding: 1rem;
      }

      .text-annotate-title {
        font-size: 1.25rem;
      }
    }
  `;
}
