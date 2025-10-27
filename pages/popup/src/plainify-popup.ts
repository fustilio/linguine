// Plainify Popup JavaScript
// Handles the popup interface and communication with content scripts

export class PlainifyPopup {
  constructor() {
    this.state = {
      isActive: false,
      highlightColor: '#fbbf24',
      rewriterOptions: {
        sharedContext: 'I am learning English. Use simpler vocabulary so I can understand this text.',
        tone: 'as-is',
        format: 'as-is',
        length: 'shorter',
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

      // Load settings from storage
      const result = await chrome.storage.sync.get(['wordReplacer']);
      const settings = result.wordReplacer || {};

      this.state.isActive = settings.isActive || false;
      this.state.highlightColor = settings.highlightColor || '#fbbf24';

      // Load rewriter options with defaults
      this.state.rewriterOptions = {
        sharedContext:
          settings.rewriterOptions?.sharedContext ||
          'I am learning English. Use simpler vocabulary so I can understand this text.',
        tone: settings.rewriterOptions?.tone || 'more-formal',
        format: settings.rewriterOptions?.format || 'plain-text',
        length: settings.rewriterOptions?.length || 'shorter',
      };

      console.log('Popup: State loaded', this.state);
    } catch (error) {
      console.error('Popup: Error loading state', error);
    }
  }

  async saveState() {
    try {
      // Load existing settings first to avoid overwriting other properties
      const result = await chrome.storage.sync.get(['wordReplacer']);
      const existingSettings = result.wordReplacer || {};

      // Merge with new state
      const settings = {
        ...existingSettings,
        isActive: this.state.isActive,
        highlightColor: this.state.highlightColor,
        rewriterOptions: this.state.rewriterOptions,
      };

      await chrome.storage.sync.set({ wordReplacer: settings });
      console.log('Popup: State saved', settings);

      // Notify content script to update its settings
      try {
        await chrome.tabs.sendMessage(this.currentTab.id, {
          action: 'updateRewriterOptions',
          options: this.state.rewriterOptions,
        });
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
      sharedContextEl.value = this.state.rewriterOptions.sharedContext;
      toneEl.value = this.state.rewriterOptions.tone;
      formatEl.value = this.state.rewriterOptions.format;
      lengthEl.value = this.state.rewriterOptions.length;

      // Save button handler
      saveSettingsBtn.addEventListener('click', async () => {
        this.state.rewriterOptions = {
          sharedContext: sharedContextEl.value,
          tone: toneEl.value,
          format: formatEl.value,
          length: lengthEl.value,
        };

        await this.saveState();

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
    this.state.isActive = !this.state.isActive;
    await this.saveState();

    // Send message to content script
    try {
      await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'toggleActive',
      });
    } catch (error) {
      console.error('Popup: Error sending toggle message', error);
    }

    this.updateUI();
  }

  updateUI() {
    // Update status
    const statusEl = document.getElementById('status');
    if (this.state.isActive) {
      statusEl.textContent = 'Extension is active - Select text to simplify';
      statusEl.className = 'status active';
    } else {
      statusEl.textContent = 'Extension is inactive';
      statusEl.className = 'status inactive';
    }

    // Update toggle switch
    const toggleEl = document.getElementById('toggleSwitch');
    if (this.state.isActive) {
      toggleEl.classList.add('active');
    } else {
      toggleEl.classList.remove('active');
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


