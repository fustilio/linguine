import { FloatingWidget } from './FloatingWidget';
import { ReadingMode } from './ReadingMode';
import { useEffect, useState } from 'react';
import type { AnnotatedChunk } from '@extension/api';

export default function App() {
  const [readingModeState, setReadingModeState] = useState<{
    isVisible: boolean;
    title?: string;
    plainText: string;
    chunks: AnnotatedChunk[];
    progress?: {
      completed: number;
      total: number;
      isComplete: boolean;
      phase?: string;
    };
  }>({
    isVisible: false,
    title: undefined,
    plainText: '',
    chunks: [],
    progress: undefined,
  });

  useEffect(() => {
    const handleMessage = (
      message: {
        action: string;
        target?: string;
        data?: {
          isVisible?: boolean;
          title?: string;
          plainText?: string;
          chunks?: AnnotatedChunk[];
          progress?: {
            completed: number;
            total: number;
            isComplete: boolean;
            phase?: string;
          };
        };
      },
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void,
    ) => {
      // Only process messages with target: 'content-ui' or no target (for backward compatibility)
      if (message.target && message.target !== 'content-ui') {
        return false;
      }

      if (message.action === 'readingModeUpdate' && message.data) {
        setReadingModeState(prev => ({
          ...prev,
          ...message.data,
        }));
        sendResponse({ success: true });
        return true;
      } else if (message.action === 'readingModeShow' && message.data) {
        setReadingModeState(prev => ({
          ...prev,
          isVisible: true,
          ...message.data,
        }));
        sendResponse({ success: true });
        return true;
      } else if (message.action === 'readingModeHide') {
        setReadingModeState(prev => ({
          ...prev,
          isVisible: false,
        }));
        sendResponse({ success: true });
        return true;
      }

      return false;
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const handleClose = () => {
    chrome.runtime.sendMessage({
      action: 'closeReadingMode',
      target: 'content',
    });
  };

  return (
    <>
      <FloatingWidget />
      <ReadingMode
        isVisible={readingModeState.isVisible}
        title={readingModeState.title}
        plainText={readingModeState.plainText}
        chunks={readingModeState.chunks}
        progress={readingModeState.progress}
        onClose={handleClose}
      />
    </>
  );
}
