/// <reference types="dom-chromium-ai" />

/**
 * Chatbot Session Manager
 * Based on Chrome Labs AI session management demo patterns
 * Provides conversation management, persistence, and session lifecycle for side panel chatbot
 */

import { chromeAIManager, type ChromeAISession } from './chrome-ai-wrapper.js';

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ChatbotSession {
  id: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: Date;
  lastUsed: Date;
  summary?: string;
  chromeSession: ChromeAISession;
}

export interface ChatbotSessionManagerConfig {
  maxSessions?: number;
  sessionTimeout?: number; // milliseconds
  enablePersistence?: boolean;
  enableSummarization?: boolean;
  defaultSystemPrompt?: string;
}

export class ChatbotSessionManager {
  private static instance: ChatbotSessionManager | null = null;
  private sessions: Map<string, ChatbotSession> = new Map();
  private activeSessionId: string | null = null;
  private config: Required<ChatbotSessionManagerConfig>;
  private eventTarget: EventTarget = new EventTarget();

  private constructor(config: ChatbotSessionManagerConfig = {}) {
    this.config = {
      maxSessions: config.maxSessions ?? 10,
      sessionTimeout: config.sessionTimeout ?? 24 * 60 * 60 * 1000, // 24 hours
      enablePersistence: config.enablePersistence ?? true,
      enableSummarization: config.enableSummarization ?? true,
      defaultSystemPrompt: config.defaultSystemPrompt ?? 'You are a helpful language learning assistant.',
    };
  }

  public static getInstance(config?: ChatbotSessionManagerConfig): ChatbotSessionManager {
    if (!ChatbotSessionManager.instance) {
      ChatbotSessionManager.instance = new ChatbotSessionManager(config);
    }
    return ChatbotSessionManager.instance;
  }

  public static resetInstance(): void {
    if (ChatbotSessionManager.instance) {
      ChatbotSessionManager.instance.cleanup();
      ChatbotSessionManager.instance = null;
    }
  }

  /**
   * Initialize the session manager and restore persisted sessions
   */
  public async initialize(): Promise<void> {
    if (this.config.enablePersistence) {
      await this.restoreSessions();
    }
  }

  /**
   * Create a new chatbot session
   */
  public async createSession(title?: string, systemPrompt?: string): Promise<ChatbotSession> {
    const id = crypto.randomUUID();
    const sessionTitle = title || `Conversation ${this.sessions.size + 1}`;
    
    // Check if we've reached the maximum number of sessions
    if (this.sessions.size >= this.config.maxSessions) {
      this.cleanupOldSessions();
    }

    try {
      // Create a new Chrome AI session
      const chromeSession = await chromeAIManager.createSession(id);
      
      // Initialize with system prompt if provided
      if (systemPrompt || this.config.defaultSystemPrompt) {
        const prompt = systemPrompt || this.config.defaultSystemPrompt;
        await chromeSession.model.prompt(`System: ${prompt}`, {});
      }

      const session: ChatbotSession = {
        id,
        title: sessionTitle,
        messages: [],
        createdAt: new Date(),
        lastUsed: new Date(),
        chromeSession: chromeSession,
      };

      this.sessions.set(id, session);
      
      // Set as active if it's the first session
      if (!this.activeSessionId) {
        this.activeSessionId = id;
      }

      this.notifySessionCreated(session);
      return session;
    } catch (error) {
      console.error('Failed to create chatbot session:', error);
      throw error;
    }
  }

  /**
   * Get the active session or create a new one
   */
  public async getActiveSession(): Promise<ChatbotSession> {
    if (this.activeSessionId && this.sessions.has(this.activeSessionId)) {
      const session = this.sessions.get(this.activeSessionId)!;
      session.lastUsed = new Date();
      return session;
    }

    return await this.createSession();
  }

  /**
   * Set the active session
   */
  public setActiveSession(sessionId: string): boolean {
    if (this.sessions.has(sessionId)) {
      this.activeSessionId = sessionId;
      const session = this.sessions.get(sessionId)!;
      session.lastUsed = new Date();
      this.notifyActiveSessionChanged(session);
      return true;
    }
    return false;
  }

  /**
   * Send a message to the active session
   */
  public async sendMessage(content: string, sessionId?: string): Promise<string> {
    const session = sessionId ? this.sessions.get(sessionId) : await this.getActiveSession();
    
    if (!session) {
      throw new Error('Session not found');
    }

    try {
      // Add user message to session
      const userMessage: ConversationMessage = {
        role: 'user',
        content,
        timestamp: new Date(),
      };
      session.messages.push(userMessage);
      session.lastUsed = new Date();

      // Send to Chrome AI
      const response = await session.chromeSession.model.prompt(content, {});
      
      // Add assistant response to session
      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      session.messages.push(assistantMessage);

      // Generate conversation summary if enabled and this is a new conversation
      if (this.config.enableSummarization && session.messages.length === 2) {
        await this.generateConversationSummary(session);
      }

      // Persist session if enabled
      if (this.config.enablePersistence) {
        await this.persistSession(session);
      }

      this.notifyMessageAdded(session, assistantMessage);
      return response;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Stream a message to the active session
   */
  public async *streamMessage(content: string, sessionId?: string): AsyncGenerator<string, void, unknown> {
    const session = sessionId ? this.sessions.get(sessionId) : await this.getActiveSession();
    
    if (!session) {
      throw new Error('Session not found');
    }

    try {
      // Add user message to session
      const userMessage: ConversationMessage = {
        role: 'user',
        content,
        timestamp: new Date(),
      };
      session.messages.push(userMessage);
      session.lastUsed = new Date();

      // Stream from Chrome AI
      const stream = session.chromeSession.model.promptStreaming(content, {});
      let fullResponse = '';
      
      // Convert ReadableStream to async iterator
      const reader = stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          fullResponse += value;
          yield value;
        }
      } finally {
        reader.releaseLock();
      }
      
      // Add assistant response to session
      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date(),
      };
      session.messages.push(assistantMessage);

      // Generate conversation summary if enabled and this is a new conversation
      if (this.config.enableSummarization && session.messages.length === 2) {
        await this.generateConversationSummary(session);
      }

      // Persist session if enabled
      if (this.config.enablePersistence) {
        await this.persistSession(session);
      }

      this.notifyMessageAdded(session, assistantMessage);
    } catch (error) {
      console.error('Failed to stream message:', error);
      throw error;
    }
  }

  /**
   * Generate a conversation summary
   */
  private async generateConversationSummary(session: ChatbotSession): Promise<void> {
    try {
      const summarySession = await chromeAIManager.createSession();
      const summaryPrompt = 'Summarize this conversation as briefly as possible in one short sentence.';
      
      const conversationText = session.messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
      
      const summary = await summarySession.model.prompt(
        `${summaryPrompt}\n\nConversation:\n${conversationText}`,
        {}
      );
      
      session.summary = summary.trim();
      summarySession.model.destroy();
      
      this.notifySessionUpdated(session);
    } catch (error) {
      console.warn('Failed to generate conversation summary:', error);
    }
  }

  /**
   * Delete a session
   */
  public deleteSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // Don't delete the active session if it's the only one
    if (this.activeSessionId === sessionId && this.sessions.size === 1) {
      return false;
    }

    // Destroy the Chrome AI session
    session.chromeSession.model.destroy();
    this.sessions.delete(sessionId);

    // Set a new active session if needed
    if (this.activeSessionId === sessionId) {
      const remainingSessions = Array.from(this.sessions.keys());
      this.activeSessionId = remainingSessions.length > 0 ? remainingSessions[0] : null;
    }

    // Remove from persistence
    if (this.config.enablePersistence) {
      this.removePersistedSession(sessionId);
    }

    this.notifySessionDeleted(sessionId);
    return true;
  }

  /**
   * Get all sessions
   */
  public getAllSessions(): ChatbotSession[] {
    return Array.from(this.sessions.values()).sort((a, b) => 
      b.lastUsed.getTime() - a.lastUsed.getTime()
    );
  }

  /**
   * Get session by ID
   */
  public getSession(sessionId: string): ChatbotSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Clean up old unused sessions
   */
  private cleanupOldSessions(): void {
    const now = Date.now();
    const sessionsToRemove: string[] = [];

    for (const [id, session] of this.sessions.entries()) {
      const timeSinceLastUse = now - session.lastUsed.getTime();
      if (timeSinceLastUse > this.config.sessionTimeout) {
        sessionsToRemove.push(id);
      }
    }

    // Remove oldest sessions if we still have too many
    if (this.sessions.size - sessionsToRemove.length >= this.config.maxSessions) {
      const sortedSessions = Array.from(this.sessions.entries())
        .filter(([id]) => !sessionsToRemove.includes(id))
        .sort(([, a], [, b]) => a.lastUsed.getTime() - b.lastUsed.getTime());

      const additionalToRemove = this.sessions.size - this.config.maxSessions + 1;
      for (let i = 0; i < additionalToRemove && i < sortedSessions.length; i++) {
        sessionsToRemove.push(sortedSessions[i][0]);
      }
    }

    // Remove the identified sessions
    sessionsToRemove.forEach(id => {
      this.deleteSession(id);
    });
  }

  /**
   * Persist session to localStorage
   */
  private async persistSession(session: ChatbotSession): Promise<void> {
    try {
      const sessionData = {
        id: session.id,
        title: session.title,
        messages: session.messages,
        createdAt: session.createdAt,
        lastUsed: session.lastUsed,
        summary: session.summary,
        systemPrompt: session.chromeSession.systemPrompt,
      };

      localStorage.setItem(`chatbot_session_${session.id}`, JSON.stringify(sessionData));
      
      // Update the list of session IDs
      const sessionIds = this.getPersistedSessionIds();
      if (!sessionIds.includes(session.id)) {
        sessionIds.push(session.id);
        localStorage.setItem('chatbot_session_ids', JSON.stringify(sessionIds));
      }
    } catch (error) {
      console.warn('Failed to persist session:', error);
    }
  }

  /**
   * Restore sessions from localStorage
   */
  private async restoreSessions(): Promise<void> {
    try {
      const sessionIds = this.getPersistedSessionIds();
      
      for (const sessionId of sessionIds) {
        const sessionData = localStorage.getItem(`chatbot_session_${sessionId}`);
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          
          // Restore Chrome AI session
          const chromeSession = await chromeAIManager.restoreSession({
            id: sessionId,
            systemPrompt: parsed.systemPrompt,
          });

          const session: ChatbotSession = {
            id: parsed.id,
            title: parsed.title,
            messages: parsed.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            })),
            createdAt: new Date(parsed.createdAt),
            lastUsed: new Date(parsed.lastUsed),
        summary: parsed.summary,
        chromeSession: chromeSession,
          };

          this.sessions.set(sessionId, session);
        }
      }

      // Set the most recently used session as active
      if (this.sessions.size > 0) {
        const sortedSessions = this.getAllSessions();
        this.activeSessionId = sortedSessions[0].id;
      }
    } catch (error) {
      console.warn('Failed to restore sessions:', error);
    }
  }

  /**
   * Get persisted session IDs
   */
  private getPersistedSessionIds(): string[] {
    try {
      const ids = localStorage.getItem('chatbot_session_ids');
      return ids ? JSON.parse(ids) : [];
    } catch {
      return [];
    }
  }

  /**
   * Remove persisted session
   */
  private removePersistedSession(sessionId: string): void {
    localStorage.removeItem(`chatbot_session_${sessionId}`);
    
    const sessionIds = this.getPersistedSessionIds();
    const updatedIds = sessionIds.filter(id => id !== sessionId);
    localStorage.setItem('chatbot_session_ids', JSON.stringify(updatedIds));
  }

  /**
   * Event handling
   */
  private notifySessionCreated(session: ChatbotSession): void {
    this.eventTarget.dispatchEvent(new CustomEvent('sessionCreated', { detail: session }));
  }

  private notifyActiveSessionChanged(session: ChatbotSession): void {
    this.eventTarget.dispatchEvent(new CustomEvent('activeSessionChanged', { detail: session }));
  }

  private notifyMessageAdded(session: ChatbotSession, message: ConversationMessage): void {
    this.eventTarget.dispatchEvent(new CustomEvent('messageAdded', { 
      detail: { session, message } 
    }));
  }

  private notifySessionUpdated(session: ChatbotSession): void {
    this.eventTarget.dispatchEvent(new CustomEvent('sessionUpdated', { detail: session }));
  }

  private notifySessionDeleted(sessionId: string): void {
    this.eventTarget.dispatchEvent(new CustomEvent('sessionDeleted', { detail: sessionId }));
  }

  /**
   * Event listeners
   */
  public onSessionCreated(callback: (session: ChatbotSession) => void): () => void {
    const listener = (event: Event) => callback((event as CustomEvent).detail);
    this.eventTarget.addEventListener('sessionCreated', listener);
    return () => this.eventTarget.removeEventListener('sessionCreated', listener);
  }

  public onActiveSessionChanged(callback: (session: ChatbotSession) => void): () => void {
    const listener = (event: Event) => callback((event as CustomEvent).detail);
    this.eventTarget.addEventListener('activeSessionChanged', listener);
    return () => this.eventTarget.removeEventListener('activeSessionChanged', listener);
  }

  public onMessageAdded(callback: (data: { session: ChatbotSession; message: ConversationMessage }) => void): () => void {
    const listener = (event: Event) => callback((event as CustomEvent).detail);
    this.eventTarget.addEventListener('messageAdded', listener);
    return () => this.eventTarget.removeEventListener('messageAdded', listener);
  }

  public onSessionUpdated(callback: (session: ChatbotSession) => void): () => void {
    const listener = (event: Event) => callback((event as CustomEvent).detail);
    this.eventTarget.addEventListener('sessionUpdated', listener);
    return () => this.eventTarget.removeEventListener('sessionUpdated', listener);
  }

  public onSessionDeleted(callback: (sessionId: string) => void): () => void {
    const listener = (event: Event) => callback((event as CustomEvent).detail);
    this.eventTarget.addEventListener('sessionDeleted', listener);
    return () => this.eventTarget.removeEventListener('sessionDeleted', listener);
  }

  /**
   * Clean up all sessions and reset the manager
   */
  public cleanup(): void {
    for (const session of this.sessions.values()) {
      session.chromeSession.model.destroy();
    }
    this.sessions.clear();
    this.activeSessionId = null;
    this.eventTarget = new EventTarget();
  }
}

// Export singleton instance
export const chatbotSessionManager = ChatbotSessionManager.getInstance();
