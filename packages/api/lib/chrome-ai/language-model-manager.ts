/// <reference types="dom-chromium-ai" />

/**
 * Chrome AI Manager - Centralized management of Chrome AI APIs
 * Provides session management, download progress monitoring, and user feedback
 */

import { BaseChromeAIManager } from './base-manager.js';
import type { ChromeAISession, ChromeAIManagerConfig } from './types.js';

export class ChromeAIManager extends BaseChromeAIManager<ChromeAIManager> {
  private static instance: ChromeAIManager | null = null;
  private sessions: Map<string, ChromeAISession> = new Map();
  private mainSession: ChromeAISession | null = null;
  private managerConfig: Required<ChromeAIManagerConfig>;

  private constructor(config: ChromeAIManagerConfig = {}) {
    super(config);
    this.managerConfig = {
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
   * Initialize the main language model session
   */
  public async initializeMainSession(systemPrompt?: string): Promise<ChromeAISession> {
    if (this.mainSession) {
      return this.mainSession;
    }

    this.notifyStatus('initializing', 'Initializing Chrome AI...');

    try {
      await this.checkAPIAvailability('LanguageModel', async () => {
        return await LanguageModel.availability();
      });

      const options: LanguageModelCreateOptions = {} as LanguageModelCreateOptions;
      // Specify an output language to improve output quality/safety attestation
      (options as any).outputLanguage = 'en';
      if (systemPrompt) {
        options.initialPrompts = [{ role: 'system', content: systemPrompt }];
      }

      this.addDownloadProgressMonitor(options);

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
    if (this.sessions.size >= this.managerConfig.maxSessions) {
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
      if (timeSinceLastUse > this.managerConfig.sessionTimeout) {
        sessionsToRemove.push(id);
      }
    }

    // Remove oldest sessions if we still have too many
    if (this.sessions.size - sessionsToRemove.length >= this.managerConfig.maxSessions) {
      const sortedSessions = Array.from(this.sessions.entries())
        .filter(([id]) => id !== 'main' && !sessionsToRemove.includes(id))
        .sort(([, a], [, b]) => a.lastUsed.getTime() - b.lastUsed.getTime());

      const additionalToRemove = this.sessions.size - this.managerConfig.maxSessions + 1;
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
   * Get all active sessions
   */
  public getActiveSessions(): ChromeAISession[] {
    return Array.from(this.sessions.values());
  }

  public cleanup(): void {
    for (const session of this.sessions.values()) {
      session.model.destroy();
    }
    this.sessions.clear();
    this.mainSession = null;
    this.isInitialized = false;
    this.cleanupCallbacks();
  }

  public isReady(): boolean {
    return this.isInitialized && this.mainSession !== null;
  }
}
