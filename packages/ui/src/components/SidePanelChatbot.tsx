/**
 * Example React component for side panel chatbot using the new session manager
 * This demonstrates how to integrate the ChatbotSessionManager with your UI
 */

import React, { useState, useEffect, useRef } from 'react';
import { chatbotSessionManager, type ChatbotSession, type ConversationMessage } from '@extension/api/lib/chatbot-session-manager.js';
import { chromeAIManager } from '@extension/api/lib/chrome-ai-wrapper.js';

interface ChatbotProps {
  className?: string;
}

export const SidePanelChatbot: React.FC<ChatbotProps> = ({ className }) => {
  const [sessions, setSessions] = useState<ChatbotSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatbotSession | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [status, setStatus] = useState<'ready' | 'initializing' | 'downloading' | 'error'>('ready');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize the chatbot
  useEffect(() => {
    const initializeChatbot = async () => {
      try {
        setStatus('initializing');
        await chatbotSessionManager.initialize();
        
        // Set up download progress monitoring
        const unsubscribeProgress = chromeAIManager.onDownloadProgress((progress) => {
          setDownloadProgress(progress);
          setStatus('downloading');
        });

        // Set up status monitoring
        const unsubscribeStatus = chromeAIManager.onStatusUpdate((status, message) => {
          setStatus(status);
          if (status === 'ready') {
            setDownloadProgress(100);
          }
        });

        // Load sessions
        const allSessions = chatbotSessionManager.getAllSessions();
        setSessions(allSessions);
        
        if (allSessions.length > 0) {
          setActiveSession(allSessions[0]);
        } else {
          // Create first session
          const newSession = await chatbotSessionManager.createSession(
            'New Conversation',
            'You are a helpful language learning assistant. Help users practice their target language, explain grammar, provide vocabulary, and answer questions about language learning.'
          );
          setActiveSession(newSession);
          setSessions([newSession]);
        }

        // Set up event listeners
        const unsubscribeSessionCreated = chatbotSessionManager.onSessionCreated((session) => {
          setSessions(prev => [...prev, session]);
        });

        const unsubscribeActiveSessionChanged = chatbotSessionManager.onActiveSessionChanged((session) => {
          setActiveSession(session);
        });

        const unsubscribeMessageAdded = chatbotSessionManager.onMessageAdded(({ session, message }) => {
          if (session.id === activeSession?.id) {
            setActiveSession(session);
          }
          setSessions(prev => prev.map(s => s.id === session.id ? session : s));
        });

        const unsubscribeSessionDeleted = chatbotSessionManager.onSessionDeleted((sessionId) => {
          setSessions(prev => prev.filter(s => s.id !== sessionId));
          if (activeSession?.id === sessionId) {
            const remaining = sessions.filter(s => s.id !== sessionId);
            setActiveSession(remaining.length > 0 ? remaining[0] : null);
          }
        });

        setStatus('ready');

        // Cleanup function
        return () => {
          unsubscribeProgress();
          unsubscribeStatus();
          unsubscribeSessionCreated();
          unsubscribeActiveSessionChanged();
          unsubscribeMessageAdded();
          unsubscribeSessionDeleted();
        };
      } catch (error) {
        console.error('Failed to initialize chatbot:', error);
        setStatus('error');
      }
    };

    initializeChatbot();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !activeSession || isLoading) return;

    setIsLoading(true);
    try {
      await chatbotSessionManager.sendMessage(inputValue.trim(), activeSession.id);
      setInputValue('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewSession = async () => {
    try {
      const newSession = await chatbotSessionManager.createSession(
        `Conversation ${sessions.length + 1}`,
        'You are a helpful language learning assistant.'
      );
      chatbotSessionManager.setActiveSession(newSession.id);
    } catch (error) {
      console.error('Failed to create new session:', error);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      chatbotSessionManager.deleteSession(sessionId);
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleSetActiveSession = (sessionId: string) => {
    chatbotSessionManager.setActiveSession(sessionId);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (status === 'initializing' || status === 'downloading') {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-2">
            {status === 'initializing' ? 'Initializing AI...' : 'Downloading model...'}
          </p>
          {status === 'downloading' && (
            <div className="w-64 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              ></div>
            </div>
          )}
          <p className="text-sm text-gray-500 mt-2">{downloadProgress}%</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold mb-2">AI Not Available</p>
          <p className="text-sm">Please enable Chrome AI flags and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Session Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <div className="flex-1 overflow-x-auto">
          <div className="flex space-x-1 p-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleSetActiveSession(session.id)}
                className={`px-3 py-2 text-sm rounded-md whitespace-nowrap flex items-center space-x-2 ${
                  activeSession?.id === session.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="truncate max-w-32">{session.title}</span>
                {sessions.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSession(session.id);
                    }}
                    className="ml-1 text-gray-400 hover:text-red-500"
                  >
                    ×
                  </button>
                )}
              </button>
            ))}
            <button
              onClick={handleCreateNewSession}
              className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              + New
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeSession?.messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about language learning..."
            className="flex-1 resize-none border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
