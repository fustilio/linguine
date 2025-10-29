/// <reference types="dom-chromium-ai" />

/**
 * Chrome AI Manager - Centralized management of Chrome AI APIs
 * Provides session management, download progress monitoring, and user feedback
 */

export interface DownloadProgressCallback {
  (progress: number): void;
}

export interface SessionStatusCallback {
  (status: 'initializing' | 'ready' | 'downloading' | 'error', message?: string): void;
}

export interface ChromeAISession {
  id: string;
  model: LanguageModel;
  createdAt: Date;
  lastUsed: Date;
  inputUsage: number;
  inputQuota: number;
  systemPrompt?: string;
}

export interface ChromeAIManagerConfig {
  maxSessions?: number;
  sessionTimeout?: number; // milliseconds
  enableDownloadProgress?: boolean;
  enableSessionRestoration?: boolean;
}

/**
 * Chrome AI Manager - Handles all Chrome AI APIs with proper session management
 */
export class ChromeAIManager {
  private static instance: ChromeAIManager | null = null;
  private sessions: Map<string, ChromeAISession> = new Map();
  private mainSession: ChromeAISession | null = null;
  private config: Required<ChromeAIManagerConfig>;
  private downloadProgressCallbacks: Set<DownloadProgressCallback> = new Set();
  private statusCallbacks: Set<SessionStatusCallback> = new Set();
  private isInitialized = false;

  private constructor(config: ChromeAIManagerConfig = {}) {
    this.config = {
      maxSessions: config.maxSessions ?? 5,
      sessionTimeout: config.sessionTimeout ?? 30 * 60 * 1000, // 30 minutes
      enableDownloadProgress: config.enableDownloadProgress ?? true,
      enableSessionRestoration: config.enableSessionRestoration ?? true,
    };
  }

  public static getInstance(config?: ChromeAIManagerConfig): ChromeAIManager {
    if (!ChromeAIManager.instance) {
      ChromeAIManager.instance = new ChromeAIManager(config);
    }
    return ChromeAIManager.instance;
  }

  public static resetInstance(): void {
    if (ChromeAIManager.instance) {
      ChromeAIManager.instance.cleanup();
      ChromeAIManager.instance = null;
    }
  }

  /**
   * Add callback for download progress updates
   */
  public onDownloadProgress(callback: DownloadProgressCallback): () => void {
    this.downloadProgressCallbacks.add(callback);
    return () => this.downloadProgressCallbacks.delete(callback);
  }

  /**
   * Add callback for session status updates
   */
  public onStatusUpdate(callback: SessionStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  private notifyDownloadProgress(progress: number): void {
    this.downloadProgressCallbacks.forEach(callback => callback(progress));
  }

  private notifyStatus(status: 'initializing' | 'ready' | 'downloading' | 'error', message?: string): void {
    this.statusCallbacks.forEach(callback => callback(status, message));
  }

  /**
   * Initialize the main language model session
   */
  public async initializeMainSession(systemPrompt?: string): Promise<ChromeAISession> {
    if (this.mainSession) {
      return this.mainSession;
    }

    this.notifyStatus('initializing', 'Initializing Chrome AI...');

    try {
      if (typeof LanguageModel === 'undefined') {
        throw new Error('Language Model API not available. Enable #prompt-api-for-gemini-nano flag');
      }

      const availability = await LanguageModel.availability();

      if (availability === 'unavailable') {
        throw new Error('Language Model API not available. Enable #prompt-api-for-gemini-nano flag');
      }

      const options: LanguageModelCreateOptions = {};
      if (systemPrompt) {
        options.initialPrompts = [{ role: 'system', content: systemPrompt }];
      }

      // Add download progress monitoring if enabled
      if (this.config.enableDownloadProgress) {
        options.monitor = (monitor: any) => {
          this.notifyStatus('downloading', 'Downloading AI model...');
          monitor.addEventListener('downloadprogress', (event: ProgressEvent) => {
            const progress = Math.round((event.loaded / event.total) * 100);
            this.notifyDownloadProgress(progress);
          });
        };
      }

      const model = await LanguageModel.create(options);
      
      this.mainSession = {
        id: 'main',
        model,
        createdAt: new Date(),
        lastUsed: new Date(),
        inputUsage: model.inputUsage || 0,
        inputQuota: model.inputQuota || 0,
        systemPrompt,
      };

      this.sessions.set('main', this.mainSession);
      this.isInitialized = true;
      
      this.notifyStatus('ready', 'Chrome AI ready');
      return this.mainSession;
    } catch (error) {
      this.notifyStatus('error', error instanceof Error ? error.message : 'Unknown error');
      console.error('Failed to initialize main language model:', error);
      throw error;
    }
  }

  /**
   * Create a new session by cloning the main session
   */
  public async createSession(sessionId?: string): Promise<ChromeAISession> {
    if (!this.mainSession) {
      throw new Error('Main session not initialized. Call initializeMainSession() first.');
    }

    const id = sessionId || `session_${Date.now()}`;
    
    // Check if we've reached the maximum number of sessions
    if (this.sessions.size >= this.config.maxSessions) {
      // Remove the oldest unused session
      this.cleanupOldSessions();
    }

    try {
      const clonedModel = await this.mainSession.model.clone();
      
      const session: ChromeAISession = {
        id,
        model: clonedModel,
        createdAt: new Date(),
        lastUsed: new Date(),
        inputUsage: clonedModel.inputUsage || 0,
        inputQuota: clonedModel.inputQuota || 0,
        systemPrompt: this.mainSession.systemPrompt,
      };

      this.sessions.set(id, session);
      return session;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Get an existing session or create a new one
   */
  public async getSession(sessionId?: string): Promise<ChromeAISession> {
    if (sessionId && this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId)!;
      session.lastUsed = new Date();
      return session;
    }

    return await this.createSession(sessionId);
  }

  /**
   * Get the main session, initializing if necessary
   */
  public async getMainSession(systemPrompt?: string): Promise<ChromeAISession> {
    if (!this.mainSession) {
      return await this.initializeMainSession(systemPrompt);
    }
    this.mainSession.lastUsed = new Date();
    return this.mainSession;
  }

  /**
   * Restore a session from stored data
   */
  public async restoreSession(sessionData: {
    id: string;
    initialPrompts?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    systemPrompt?: string;
  }): Promise<ChromeAISession> {
    try {
      const options: LanguageModelCreateOptions = {};
      if (sessionData.initialPrompts) {
        options.initialPrompts = sessionData.initialPrompts as any;
      }

      const model = await LanguageModel.create(options);
      
      const session: ChromeAISession = {
        id: sessionData.id,
        model,
        createdAt: new Date(),
        lastUsed: new Date(),
        inputUsage: model.inputUsage || 0,
        inputQuota: model.inputQuota || 0,
        systemPrompt: sessionData.systemPrompt,
      };

      this.sessions.set(sessionData.id, session);
      return session;
    } catch (error) {
      console.error('Failed to restore session:', error);
      throw error;
    }
  }

  /**
   * Get session quota information
   */
  public getSessionQuota(sessionId: string): { usage: number; quota: number; remaining: number } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const usage = session.model.inputUsage || 0;
    const quota = session.model.inputQuota || 0;
    const remaining = quota - usage;

    return { usage, quota, remaining };
  }

  /**
   * Clean up old unused sessions
   */
  private cleanupOldSessions(): void {
    const now = Date.now();
    const sessionsToRemove: string[] = [];

    for (const [id, session] of this.sessions.entries()) {
      if (id === 'main') continue; // Never remove main session
      
      const timeSinceLastUse = now - session.lastUsed.getTime();
      if (timeSinceLastUse > this.config.sessionTimeout) {
        sessionsToRemove.push(id);
      }
    }

    // Remove oldest sessions if we still have too many
    if (this.sessions.size - sessionsToRemove.length >= this.config.maxSessions) {
      const sortedSessions = Array.from(this.sessions.entries())
        .filter(([id]) => id !== 'main' && !sessionsToRemove.includes(id))
        .sort(([, a], [, b]) => a.lastUsed.getTime() - b.lastUsed.getTime());

      const additionalToRemove = this.sessions.size - this.config.maxSessions + 1;
      for (let i = 0; i < additionalToRemove && i < sortedSessions.length; i++) {
        sessionsToRemove.push(sortedSessions[i][0]);
      }
    }

    // Remove the identified sessions
    sessionsToRemove.forEach(id => {
      const session = this.sessions.get(id);
      if (session) {
        session.model.destroy();
        this.sessions.delete(id);
        console.log(`Cleaned up session: ${id}`);
      }
    });
  }

  /**
   * Destroy a specific session
   */
  public destroySession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (sessionId === 'main') {
      this.mainSession = null;
    }

    session.model.destroy();
    this.sessions.delete(sessionId);
    return true;
  }

  /**
   * Clean up all sessions and reset the manager
   */
  public cleanup(): void {
    for (const session of this.sessions.values()) {
      session.model.destroy();
    }
    this.sessions.clear();
    this.mainSession = null;
    this.isInitialized = false;
    this.downloadProgressCallbacks.clear();
    this.statusCallbacks.clear();
  }

  /**
   * Get all active sessions
   */
  public getActiveSessions(): ChromeAISession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Check if the manager is initialized
   */
  public isReady(): boolean {
    return this.isInitialized && this.mainSession !== null;
  }
}

/**
 * Translator Manager - Handles Chrome Translator API with language pair management
 */
export class TranslatorManager {
  private static instance: TranslatorManager | null = null;
  private translators: Map<string, Translator> = new Map();
  private config: { enableDownloadProgress?: boolean };

  private constructor(config: { enableDownloadProgress?: boolean } = {}) {
    this.config = {
      enableDownloadProgress: config.enableDownloadProgress ?? true,
    };
  }

  public static getInstance(config?: { enableDownloadProgress?: boolean }): TranslatorManager {
    if (!TranslatorManager.instance) {
      TranslatorManager.instance = new TranslatorManager(config);
    }
    return TranslatorManager.instance;
  }

  public static resetInstance(): void {
    if (TranslatorManager.instance) {
      TranslatorManager.instance.cleanup();
      TranslatorManager.instance = null;
    }
  }

  private getLanguagePairKey(sourceLanguage: string, targetLanguage: string): string {
    return `${sourceLanguage}-${targetLanguage}`;
  }

  public async getTranslator(sourceLanguage: string, targetLanguage: string): Promise<Translator> {
    const key = this.getLanguagePairKey(sourceLanguage, targetLanguage);
    
    if (this.translators.has(key)) {
      return this.translators.get(key)!;
    }

    return await this.createTranslator(sourceLanguage, targetLanguage);
  }

  private async createTranslator(sourceLanguage: string, targetLanguage: string): Promise<Translator> {
    try {
      if (typeof Translator === 'undefined') {
        throw new Error('Translator API not available. Enable #translator-api flag');
      }

      const availability = await Translator.availability({
        sourceLanguage,
        targetLanguage,
      });

      if (availability === 'unavailable') {
        throw new Error('Translation unavailable for this language pair');
      }

      const translator = await Translator.create({
        sourceLanguage,
        targetLanguage,
      });

      const key = this.getLanguagePairKey(sourceLanguage, targetLanguage);
      this.translators.set(key, translator);
      
      return translator;
    } catch (error) {
      console.error('Failed to create translator:', error);
      throw error;
    }
  }

  public cleanup(): void {
    for (const translator of this.translators.values()) {
      translator.destroy();
    }
    this.translators.clear();
  }
}

/**
 * Summarizer Manager - Handles Chrome Summarizer API
 */
export class SummarizerManager {
  private static instance: SummarizerManager | null = null;
  private summarizer: Summarizer | null = null;
  private isReady = false;

  private constructor() {}

  public static getInstance(): SummarizerManager {
    if (!SummarizerManager.instance) {
      SummarizerManager.instance = new SummarizerManager();
    }
    return SummarizerManager.instance;
  }

  public static resetInstance(): void {
    if (SummarizerManager.instance) {
      SummarizerManager.instance.cleanup();
      SummarizerManager.instance = null;
    }
  }

  public async getSummarizer(): Promise<Summarizer> {
    if (this.isReady && this.summarizer) {
      return this.summarizer;
    }

    return await this.initialize();
  }

  private async initialize(): Promise<Summarizer> {
    try {
      if (typeof Summarizer === 'undefined') {
        throw new Error('Summarizer API not available. Enable #summarization-api-for-gemini-nano flag');
      }

      this.summarizer = await Summarizer.create({});
      this.isReady = true;
      return this.summarizer;
    } catch (error) {
      console.error('Failed to initialize summarizer:', error);
      throw error;
    }
  }

  public cleanup(): void {
    if (this.summarizer) {
      this.summarizer.destroy();
      this.summarizer = null;
      this.isReady = false;
    }
  }
}

// Convenience functions using managers

/**
 * Translate text using Chrome Translator API
 */
export const translateText = async (text: string, sourceLanguage: string, targetLanguage: string) => {
  const translatorManager = TranslatorManager.getInstance();
  const translator = await translatorManager.getTranslator(sourceLanguage, targetLanguage);
  return await translator.translate(text);
};

/**
 * Summarize text using Chrome Summarizer API
 */
export const summarizeText = async (text: string, context?: string) => {
  const summarizerManager = SummarizerManager.getInstance();
  const summarizer = await summarizerManager.getSummarizer();
  return await summarizer.summarize(text, context ? { context } : undefined);
};

/**
 * Stream summarize text using Chrome Summarizer API
 */
export const streamSummarizeText = async (text: string, context?: string) => {
  const summarizerManager = SummarizerManager.getInstance();
  const summarizer = await summarizerManager.getSummarizer();
  return summarizer.summarizeStreaming(text, context ? { context } : undefined);
};

/**
 * Rewriter Manager - Handles Chrome Rewriter API with options management
 */
export class RewriterManager {
  private static instance: RewriterManager | null = null;
  private rewriter: Rewriter | null = null;
  private isReady = false;
  private currentOptions: RewriterCreateOptions | null = null;

  private constructor() {}

  public static getInstance(): RewriterManager {
    if (!RewriterManager.instance) {
      RewriterManager.instance = new RewriterManager();
    }
    return RewriterManager.instance;
  }

  public static resetInstance(): void {
    if (RewriterManager.instance) {
      RewriterManager.instance.cleanup();
      RewriterManager.instance = null;
    }
  }

  public async getRewriter(options?: RewriterCreateOptions): Promise<Rewriter> {
    // Check if we need to reinitialize based on options change
    const optionsChanged = JSON.stringify(this.currentOptions) !== JSON.stringify(options);
    
    if (this.isReady && this.rewriter && !optionsChanged) {
      return this.rewriter;
    }

    return await this.initialize(options);
  }

  private async initialize(options?: RewriterCreateOptions): Promise<Rewriter> {
    try {
      if (typeof Rewriter === 'undefined') {
        throw new Error('Rewriter API not available. Enable #rewriter-api flag');
      }

      const availability = await Rewriter.availability();

      if (availability === 'unavailable') {
        throw new Error('Rewriter is not supported on this device');
      }

      // Destroy existing rewriter if options changed
      if (this.rewriter) {
        this.rewriter.destroy();
      }

      this.rewriter = await Rewriter.create(options || {});
      this.currentOptions = options || null;
      
      // Wait for rewriter to be ready
      if ('ready' in this.rewriter) {
        await (this.rewriter as any).ready;
      }
      
      this.isReady = true;
      return this.rewriter;
    } catch (error) {
      console.error('Failed to initialize rewriter:', error);
      throw error;
    }
  }

  public cleanup(): void {
    if (this.rewriter) {
      this.rewriter.destroy();
      this.rewriter = null;
      this.isReady = false;
      this.currentOptions = null;
    }
  }
}

/**
 * Rewrite text using Chrome Rewriter API
 */
export const rewriteText = async (text: string, options?: RewriterRewriteOptions) => {
  const rewriterManager = RewriterManager.getInstance();
  const rewriter = await rewriterManager.getRewriter(options);
  return await rewriter.rewrite(text, { context: options?.context });
};

// Export manager instances for direct access
export const chromeAIManager = ChromeAIManager.getInstance();
export const translatorManager = TranslatorManager.getInstance();
export const summarizerManager = SummarizerManager.getInstance();
export const rewriterManager = RewriterManager.getInstance();
