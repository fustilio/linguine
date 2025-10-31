import { useStorage } from '@extension/shared';
import { wordReplacerStorage } from '@extension/storage';
import { useEffect, useRef, useState } from 'react';

type WidgetState = 'idle' | 'loading' | 'success' | 'error';
type WidgetSize = 'small' | 'medium' | 'large';

const SIZE_MAP = {
  small: { width: '50px', height: '50px' },
  medium: { width: '70px', height: '70px' },
  large: { width: '90px', height: '90px' },
};

const STATE_COLORS = {
  idle: '#f4d03f',
  loading: '#f4d03f',
  success: '#4ade80',
  error: '#f87171',
};

export const FloatingWidget = () => {
  const wordReplacerState = useStorage(wordReplacerStorage);
  const isActive = wordReplacerState?.isActive ?? false;
  const widgetSize = (wordReplacerState?.widgetSize ?? 'small') as WidgetSize;

  const [state, setState] = useState<WidgetState>('idle');
  const [position, setPosition] = useState<{ x: number; y: number } | { bottom: number; right: number }>({
    bottom: 20,
    right: 20,
  }); // bottom-right default
  const [isDragging, setIsDragging] = useState(false);
  const [tooltipMessage, setTooltipMessage] = useState<string | null>(null);

  const widgetRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const mouseMoveHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
  const mouseUpHandlerRef = useRef<(() => void) | null>(null);

  // Get icon URL
  const iconUrl = chrome.runtime.getURL('pasta-icon.webp');

  // Auto-reset success/error states after delay
  useEffect(() => {
    if (state === 'success' || state === 'error') {
      const timer = setTimeout(() => {
        setState('idle');
        setTooltipMessage(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [state]);

  // Auto-reset tooltip after delay
  useEffect(() => {
    if (tooltipMessage) {
      const timer = setTimeout(() => {
        setTooltipMessage(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [tooltipMessage]);

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      if (mouseMoveHandlerRef.current) {
        document.removeEventListener('mousemove', mouseMoveHandlerRef.current);
        mouseMoveHandlerRef.current = null;
      }
      if (mouseUpHandlerRef.current) {
        document.removeEventListener('mouseup', mouseUpHandlerRef.current);
        mouseUpHandlerRef.current = null;
      }
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!widgetRef.current) return;

    e.preventDefault();
    isDraggingRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    const rect = widgetRef.current.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current || !widgetRef.current) return;

      const deltaX = Math.abs(e.clientX - dragStartRef.current.x);
      const deltaY = Math.abs(e.clientY - dragStartRef.current.y);
      const dragThreshold = 5;

      // Start dragging if moved beyond threshold
      if (!isDraggingRef.current && (deltaX > dragThreshold || deltaY > dragThreshold)) {
        isDraggingRef.current = true;
        setIsDragging(true);
      }

      if (!isDraggingRef.current) return;

      const x = e.clientX - dragOffsetRef.current.x;
      const y = e.clientY - dragOffsetRef.current.y;

      // Keep widget within viewport
      const maxX = window.innerWidth - widgetRef.current.offsetWidth;
      const maxY = window.innerHeight - widgetRef.current.offsetHeight;

      const boundedX = Math.max(0, Math.min(x, maxX));
      const boundedY = Math.max(0, Math.min(y, maxY));

      // After first drag, switch to absolute positioning
      setPosition({ x: boundedX, y: boundedY });
    };

    const handleMouseUp = () => {
      const wasDragging = isDraggingRef.current;
      isDraggingRef.current = false;
      dragStartRef.current = null;
      setIsDragging(false);

      // Clean up event listeners
      if (mouseMoveHandlerRef.current) {
        document.removeEventListener('mousemove', mouseMoveHandlerRef.current);
        mouseMoveHandlerRef.current = null;
      }
      if (mouseUpHandlerRef.current) {
        document.removeEventListener('mouseup', mouseUpHandlerRef.current);
        mouseUpHandlerRef.current = null;
      }

      // Reset after small delay to prevent click event if dragging occurred
      if (wasDragging) {
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 10);
      }
    };

    // Remove any existing listeners first
    if (mouseMoveHandlerRef.current) {
      document.removeEventListener('mousemove', mouseMoveHandlerRef.current);
    }
    if (mouseUpHandlerRef.current) {
      document.removeEventListener('mouseup', mouseUpHandlerRef.current);
    }

    mouseMoveHandlerRef.current = handleMouseMove;
    mouseUpHandlerRef.current = handleMouseUp;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't trigger click if dragging
    if (isDraggingRef.current || isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.toString().trim().length === 0) {
      setTooltipMessage('Please select some text first');
      setState('error');
      return;
    }

    try {
      setState('loading');
      setTooltipMessage('Rewriting...');

      // Send message to content script to trigger rewrite
      const response = await chrome.runtime.sendMessage({
        action: 'rewriteSelectedText',
        target: 'content',
      });

      if (response?.success) {
        setState('success');
        setTooltipMessage('Rewrite complete!');
      } else {
        throw new Error(response?.error || 'Rewrite failed');
      }
    } catch (error) {
      console.error('Error rewriting from widget:', error);
      setState('error');
      setTooltipMessage('Rewrite failed');
    }
  };

  // Don't render if not active
  if (!isActive) {
    return null;
  }

  const size = SIZE_MAP[widgetSize];
  const backgroundColor = STATE_COLORS[state];
  const tooltipText = tooltipMessage || 'Click to rewrite selected text';

  return (
    <>
      <div
        ref={widgetRef}
        id="linguine-floating-widget"
        role="button"
        tabIndex={0}
        title={tooltipText}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick(e as unknown as React.MouseEvent<HTMLDivElement>);
          }
        }}
        style={{
          position: 'fixed',
          ...('x' in position
            ? { left: `${position.x}px`, top: `${position.y}px` }
            : { bottom: `${position.bottom}px`, right: `${position.right}px` }),
          width: size.width,
          height: size.height,
          backgroundColor,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isDragging ? 'grabbing' : 'move',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 999999,
          userSelect: 'none',
          transition: isDragging ? 'none' : 'transform 0.2s, box-shadow 0.2s',
          overflow: 'hidden',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
        }}
        onMouseLeave={e => {
          if (!isDraggingRef.current && !isDragging) {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }
        }}>
        {iconUrl && (
          <img
            src={iconUrl}
            alt="Widget Icon"
            style={{
              width: '70%',
              height: '70%',
              objectFit: 'contain',
            }}
          />
        )}
        {state === 'loading' && (
          <style>
            {`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              #linguine-floating-widget {
                animation: spin 1s linear infinite;
              }
            `}
          </style>
        )}
      </div>
      {tooltipMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: `${parseInt(size.height) + 30}px`,
            right: '20px',
            background: '#1f2937',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 1000000,
            pointerEvents: 'none',
            animation: 'fadeIn 0.2s ease-out',
          }}>
          <style>
            {`
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}
          </style>
          {tooltipMessage}
        </div>
      )}
    </>
  );
};
