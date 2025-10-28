// Plainify Popup JavaScript
// Handles the popup interface and communication with content scripts

import { wordReplacerStorage } from '@extension/storage';
import type { WordReplacerStateType } from '@extension/storage/lib/base/types';
import { DEFAULT_WORD_REPLACER_STATE } from '@extension/storage';

export class PlainifyPopup {
  private state: {
    isActive: boolean;
    highlightColor: string;
    rewriterOptions: WordReplacerStateType['rewriterOptions'];
  };
  private currentTab: chrome.tabs.Tab | null = null;

  constructor() {
    this.state = {
      isActive: DEFAULT_WORD_REPLACER_STATE.isActive,
      highlightColor: '#fbbf24',
      rewriterOptions: {
        sharedContext: DEFAULT_WORD_REPLACER_STATE.rewriterOptions.sharedContext,
        tone: DEFAULT_WORD_REPLACER_STATE.rewriterOptions.tone,
        format: DEFAULT_WORD_REPLACER_STATE.rewriterOptions.format,
        length: DEFAULT_WORD_REPLACER_STATE.rewriterOptions.length,
      },
    };

    void this.init();
  }

  async init() {
    // Load current state
    await this.loadState();

    // Set up event listeners
    this.setupEventListeners();

    // Update UI
    this.updateUI();

    // Check if content script is loaded
    await this.checkContentScript();
  }

  async loadState() {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      this.currentTab = tab;

      // Load settings from modern storage system
      const settings = await wordReplacerStorage.get();

      this.state.isActive = settings.isActive;
      // highlightColor is not part of WordReplacerStateType, keep local default

      // Load rewriter options
      this.state.rewriterOptions = {
        sharedContext: settings.rewriterOptions.sharedContext,
        tone: settings.rewriterOptions.tone,
        format: settings.rewriterOptions.format,
        length: settings.rewriterOptions.length,
      };

      console.log('Popup: State loaded', this.state);
    } catch (error) {
      console.error('Popup: Error loading state', error);
    }
  }

  async saveState() {
    try {
      // Save state using modern storage system
      await wordReplacerStorage.set({
        isActive: this.state.isActive,
        rewriterOptions: this.state.rewriterOptions,
      });

      console.log('Popup: State saved', this.state);

      // Notify content script to update its settings
      try {
        if (this.currentTab?.id) {
          await chrome.tabs.sendMessage(this.currentTab.id, {
            action: 'updateState',
            state: {
              isActive: this.state.isActive,
              rewriterOptions: this.state.rewriterOptions,
            },
          });
        }
      } catch (error) {
        console.error('Popup: Could not notify content script', error);
      }
    } catch (error) {
      console.error('Popup: Error saving state', error);
    }
  }

  setupEventListeners() {
    // Toggle switch
    const toggleSwitch = document.getElementById('toggleSwitch');
    if (toggleSwitch) {
      toggleSwitch.addEventListener('click', () => {
        void this.toggleActive();
      });
    }

    // Settings collapsible
    const settingsHeader = document.getElementById('settingsHeader');
    const settingsContent = document.getElementById('settingsContent');
    const arrow = settingsHeader?.querySelector('.arrow');

    if (settingsHeader && settingsContent) {
      settingsHeader.addEventListener('click', () => {
        const isExpanded = settingsContent.classList.contains('expanded');
        if (isExpanded) {
          settingsContent.classList.remove('expanded');
          arrow?.classList.remove('expanded');
        } else {
          settingsContent.classList.add('expanded');
          arrow?.classList.add('expanded');
        }
      });
    }

    // Rewriter settings form
    const sharedContextEl = document.getElementById('sharedContext');
    const toneEl = document.getElementById('tone');
    const formatEl = document.getElementById('format');
    const lengthEl = document.getElementById('length');
    const saveSettingsBtn = document.getElementById('saveSettings');

    if (sharedContextEl && toneEl && formatEl && lengthEl && saveSettingsBtn) {
      // Load current values into form
      (sharedContextEl as HTMLTextAreaElement).value = this.state.rewriterOptions.sharedContext;
      (toneEl as HTMLSelectElement).value = this.state.rewriterOptions.tone;
      (formatEl as HTMLSelectElement).value = this.state.rewriterOptions.format;
      (lengthEl as HTMLSelectElement).value = this.state.rewriterOptions.length;

      // Save button handler
      saveSettingsBtn.addEventListener('click', async () => {
        this.state.rewriterOptions = {
          sharedContext: (sharedContextEl as HTMLTextAreaElement).value,
          tone: (toneEl as HTMLSelectElement).value,
          format: (formatEl as HTMLSelectElement).value,
          length: (lengthEl as HTMLSelectElement).value,
        };

        // Save using modern storage system
        await wordReplacerStorage.updateRewriterOptions(this.state.rewriterOptions);

        // Notify content script
        try {
          if (this.currentTab?.id) {
            await chrome.tabs.sendMessage(this.currentTab.id, {
              action: 'updateState',
              state: {
                isActive: this.state.isActive,
                rewriterOptions: this.state.rewriterOptions,
              },
            });
          }
        } catch (error) {
          console.error('Popup: Could not notify content script', error);
        }

        // Show feedback
        const originalText = saveSettingsBtn.textContent;
        saveSettingsBtn.textContent = '✓ Saved!';
        saveSettingsBtn.style.background = '#4caf50';

        setTimeout(() => {
          saveSettingsBtn.textContent = originalText;
          saveSettingsBtn.style.background = '';
        }, 2000);
      });
    }
  }

  async toggleActive() {
    await wordReplacerStorage.toggleActive();
    
    // Update local state to reflect the change
    this.state.isActive = !this.state.isActive;

    // Send message to content script
    try {
      if (this.currentTab?.id) {
        await chrome.tabs.sendMessage(this.currentTab.id, {
          action: 'updateState',
          state: {
            isActive: this.state.isActive,
            rewriterOptions: this.state.rewriterOptions,
          },
        });
      }
    } catch (error) {
      console.error('Popup: Error sending toggle message', error);
    }

    this.updateUI();
  }

  updateUI() {
    // Update status
    const statusEl = document.getElementById('status');
    if (statusEl) {
      if (this.state.isActive) {
        statusEl.textContent = 'Extension is active - Select text to simplify';
        statusEl.className = 'status active';
      } else {
        statusEl.textContent = 'Extension is inactive';
        statusEl.className = 'status inactive';
      }
    }

    // Update toggle switch
    const toggleEl = document.getElementById('toggleSwitch');
    if (toggleEl) {
      if (this.state.isActive) {
        toggleEl.classList.add('active');
      } else {
        toggleEl.classList.remove('active');
      }
    }
  }

  async checkContentScript() {
    if (!this.currentTab?.id) return;

    try {
      await chrome.tabs.sendMessage(this.currentTab.id, { action: 'ping' });
      console.log('Popup: Content script is loaded');
    } catch (error) {
      // Content script not loaded, try to inject it
      if (
        this.currentTab.url &&
        (this.currentTab.url.startsWith('http://') || this.currentTab.url.startsWith('https://'))
      ) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: this.currentTab.id },
            files: ['content.js'],
          });
          console.log('Popup: Content script injected');
        } catch (injectError) {
          console.error('Popup: Could not inject content script', injectError);
        }
      }
    }
  }
}


