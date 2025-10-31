import { useEffect, useRef, useState } from 'react';
import {
  AArrowDown,
  AArrowUp,
  Captions,
  CaptionsOff,
  FoldHorizontal,
  Image,
  ImageOff,
  ListChevronsDownUp,
  ListChevronsUpDown,
  SunMoon,
  UnfoldHorizontal,
  X,
} from 'lucide-react';
import type { AnnotatedChunk } from '@extension/api';
import { getImagesForQuery } from '@extension/api';
import { useStorage } from '@extension/shared';
import { readingModeSettingsStorage } from '@extension/storage';
import { cn } from '@extension/ui';

interface ReadingModeProps {
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
  onClose?: () => void;
}

export const ReadingMode = ({ isVisible, title, plainText, chunks, progress, onClose }: ReadingModeProps) => {
  // Ensure plainText is a string (declare early so it can be used in useEffect)
  const safePlainText = plainText || '';

  const settings = useStorage(readingModeSettingsStorage);
  const [hoveredChunk, setHoveredChunk] = useState<AnnotatedChunk | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [showImages, setShowImages] = useState(true);
  const [showPrefixes, setShowPrefixes] = useState(true);
  const [hoveredChunkImages, setHoveredChunkImages] = useState<string[]>([]);
  const [hoveredChunkImageIndex, setHoveredChunkImageIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const plainTextRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const lockedScrollYRef = useRef(0);
  const isScrollLockedRef = useRef(false);
  const tooltipCloseTimeoutRef = useRef<number | null>(null);

  // Lock/unlock scroll when visible
  useEffect(() => {
    if (isVisible) {
      if (!isScrollLockedRef.current) {
        lockedScrollYRef.current = window.scrollY;
        isScrollLockedRef.current = true;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${lockedScrollYRef.current}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
      }
    } else {
      if (isScrollLockedRef.current) {
        isScrollLockedRef.current = false;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, lockedScrollYRef.current);
      }
    }

    return () => {
      if (isScrollLockedRef.current) {
        isScrollLockedRef.current = false;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
      }
      // Clear any pending tooltip close timeout on unmount
      if (tooltipCloseTimeoutRef.current !== null) {
        clearTimeout(tooltipCloseTimeoutRef.current);
        tooltipCloseTimeoutRef.current = null;
      }
    };
  }, [isVisible]);

  // Initialize plain text with character spans
  useEffect(() => {
    if (!plainTextRef.current || !safePlainText) {
      return;
    }

    // Clear existing content
    plainTextRef.current.innerHTML = '';

    // Render each character in its own span
    for (let i = 0; i < safePlainText.length; i++) {
      const ch = safePlainText[i];
      const span = document.createElement('span');
      span.className = 'txt-char';
      span.setAttribute('data-idx', String(i));
      span.textContent = ch;
      plainTextRef.current.appendChild(span);
    }
  }, [safePlainText]);

  // Incrementally wrap chunks as they arrive
  useEffect(() => {
    if (!plainTextRef.current || chunks.length === 0) return;

    const container = plainTextRef.current;

    for (const chunk of chunks) {
      // Skip whitespace-only chunks
      if (!chunk.text || chunk.text.trim().length === 0) continue;
      if (typeof chunk.start !== 'number' || typeof chunk.end !== 'number' || chunk.end <= chunk.start) continue;

      // Check if already wrapped
      const first = container.querySelector(`span.txt-char[data-idx="${chunk.start}"]`);
      if (!first || !first.classList.contains('txt-char')) continue;

      // Collect spans to wrap
      const toWrap: HTMLElement[] = [];
      for (let i = chunk.start; i < chunk.end; i++) {
        const el = container.querySelector(`span.txt-char[data-idx="${i}"]`) as HTMLElement | null;
        if (!el || !el.classList.contains('txt-char')) {
          return; // Already wrapped or missing
        }
        toWrap.push(el);
      }

      // Create wrapper element
      const wrapper = document.createElement('span');
      wrapper.className = 'text-annotate-chunk inline cursor-help transition-colors border-b border-dotted';
      if (chunk.translation.differs) {
        wrapper.classList.add('text-annotate-chunk-differs');
        wrapper.style.borderBottomColor = '#FF9800';
      } else {
        wrapper.style.borderBottomColor = '#4CAF50';
      }
      wrapper.setAttribute('data-start', String(chunk.start));
      wrapper.setAttribute('data-end', String(chunk.end));
      
      // Add hover effect
      wrapper.addEventListener('mouseenter', () => {
        if (chunk.translation.differs) {
          wrapper.style.backgroundColor = 'rgba(255, 152, 0, 0.2)';
        } else {
          wrapper.style.backgroundColor = 'rgba(76, 175, 80, 0.2)';
        }
      });
      wrapper.addEventListener('mouseleave', () => {
        wrapper.style.backgroundColor = '';
      });

      // Compose combined text
      const combined = toWrap.map(el => el.textContent || '').join('');
      wrapper.textContent = combined;

      // Add event listeners for tooltip and TTS
      wrapper.addEventListener('mouseenter', () => {
        // Clear any pending close timeout
        if (tooltipCloseTimeoutRef.current !== null) {
          clearTimeout(tooltipCloseTimeoutRef.current);
          tooltipCloseTimeoutRef.current = null;
        }
        
        setHoveredChunk(chunk);
        setHoveredChunkImages([]);
        setHoveredChunkImageIndex(0);
        const rect = wrapper.getBoundingClientRect();
        setTooltipPosition({
          x: rect.left + rect.width / 2,
          y: rect.top,
        });
      });

      wrapper.addEventListener('mouseleave', () => {
        // Delay closing tooltip to allow mouse to move to tooltip
        if (tooltipCloseTimeoutRef.current !== null) {
          clearTimeout(tooltipCloseTimeoutRef.current);
        }
        tooltipCloseTimeoutRef.current = window.setTimeout(() => {
          setHoveredChunk(null);
          setTooltipPosition(null);
          setHoveredChunkImages([]);
          setHoveredChunkImageIndex(0);
          tooltipCloseTimeoutRef.current = null;
        }, 200); // 200ms delay to allow moving to tooltip
      });

      wrapper.addEventListener('click', () => {
        // TTS
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(chunk.text);
          utterance.lang = chunk.language || 'en-US';
          window.speechSynthesis.speak(utterance);
        }
      });

      // Insert wrapper and remove old spans
      const firstNode = toWrap[0];
      container.insertBefore(wrapper, firstNode);
      toWrap.forEach(el => el.remove());
    }
  }, [chunks]);

  // Note: Icons are rendered directly as React components, no need for createIcons

  // Keyboard shortcuts
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      } else {
        const isMeta = e.ctrlKey || e.metaKey;
        if (isMeta && (e.key === '=' || e.key === '+')) {
          e.preventDefault();
          e.stopPropagation();
          readingModeSettingsStorage.adjustFontSize(+1).catch(() => {});
        } else if (isMeta && e.key === '-') {
          e.preventDefault();
          e.stopPropagation();
          readingModeSettingsStorage.adjustFontSize(-1).catch(() => {});
        } else if (isMeta && e.key === ']') {
          e.preventDefault();
          e.stopPropagation();
          readingModeSettingsStorage.adjustMaxWidth(+5).catch(() => {});
        } else if (isMeta && e.key === '[') {
          e.preventDefault();
          e.stopPropagation();
          readingModeSettingsStorage.adjustMaxWidth(-5).catch(() => {});
        } else if (!isMeta && (e.key === 't' || e.key === 'T')) {
          e.preventDefault();
          e.stopPropagation();
          readingModeSettingsStorage.cycleTheme().catch(() => {});
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isVisible, onClose]);

  // Theme-based background colors
  const getBackgroundColor = () => {
    if (settings?.theme === 'dark') return 'bg-black/90';
    if (settings?.theme === 'sepia') return 'bg-[#f4ecd8]/95';
    return 'bg-white/95';
  };

  const getTextColor = () => {
    if (settings?.theme === 'dark') return 'text-[#e6e8ea]';
    if (settings?.theme === 'sepia') return 'text-[#403323]';
    return 'text-[#111111]';
  };

  // Load images for hovered chunk
  useEffect(() => {
    if (!hoveredChunk || !showImages) {
      setHoveredChunkImages([]);
      return;
    }

    // Sanitize query string (same logic as deprecated ReadingModeUI)
    const sanitize = (s: string | undefined | null): string | null => {
      if (!s) return null;
      let q = s;
      // remove parenthetical notes
      q = q.replace(/\([^)]*\)/g, '');
      // choose first option before '/'
      q = q.split('/')[0];
      // choose first before ','
      q = q.split(',')[0];
      // keep only latin letters, spaces and hyphens
      q = q.replace(/[^a-zA-Z\-\s]/g, '').trim();
      if (!/[a-zA-Z]/.test(q)) return null;
      // collapse whitespace
      q = q.replace(/\s+/g, ' ').trim();
      return q || null;
    };

    const loadImages = async () => {
      const queries: string[] = [];
      const c = sanitize(hoveredChunk.translation?.contextual?.trim());
      const l = sanitize(hoveredChunk.translation?.literal?.trim());
      if (c) queries.push(c);
      if (l && l !== c) queries.push(l);
      if (queries.length === 0) {
        setHoveredChunkImages([]);
        return;
      }

      const collected: string[] = [];
      for (const q of queries) {
        if (!q || collected.length >= 3) break;
        try {
          const imgs = await getImagesForQuery(q, 3 - collected.length);
          for (const u of imgs) {
            if (!collected.includes(u)) collected.push(u);
            if (collected.length >= 3) break;
          }
        } catch (error) {
          console.error('[ReadingMode] Failed to load images for query:', q, error);
        }
      }
      setHoveredChunkImages(collected);
      setHoveredChunkImageIndex(0);
    };

    loadImages();
  }, [hoveredChunk, showImages]);

  if (!isVisible) {
    return null;
  }

  const progressPercent = progress ? (progress.completed / progress.total) * 100 : 0;

  return (
    <div
      ref={containerRef}
      id="text-annotate-reading-mode"
      className={cn(
        'fixed inset-0 flex h-screen flex-col overflow-y-auto overscroll-contain',
        getBackgroundColor(),
        getTextColor(),
      )}
      style={{ zIndex: 2147483647 }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-inherit">
        {/* Title and Close */}
        <div className="flex items-center justify-between gap-4 px-8 py-4">
          <h1 className="m-0 min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-2xl font-semibold">
            {title || 'Reading Mode'}
          </h1>
          <button
            onClick={() => onClose?.()}
            className="cursor-pointer rounded border-0 bg-transparent px-4 py-2 text-3xl leading-none text-inherit transition-colors hover:bg-white/10"
            aria-label="Close reading mode">
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        {progress && (
          <div className="flex min-h-[28px] flex-col items-center gap-2 px-8 pb-4">
            <div className="text-center text-sm text-gray-400">
              {progress.phase || 'Processing...'} ({progress.completed}/{progress.total})
            </div>
            <div className="h-1.5 w-full max-w-[300px] overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full transition-all duration-300 ease-in-out"
                style={{
                  background: 'linear-gradient(90deg, #4CAF50, #8BC34A)',
                  width: `${progressPercent}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 px-8 pb-4">
          <button
            className="rounded p-2 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => readingModeSettingsStorage.adjustFontSize(-1).catch(() => {})}
            title="Decrease font size (Ctrl/Cmd + -)"
            disabled={settings && settings.fontSizePx <= 12}>
            <AArrowDown size={16} />
          </button>
          <button
            className="rounded p-2 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => readingModeSettingsStorage.adjustFontSize(+1).catch(() => {})}
            title="Increase font size (Ctrl/Cmd + =)"
            disabled={settings && settings.fontSizePx >= 32}>
            <AArrowUp size={16} />
          </button>
          <button
            className="rounded p-2 transition-colors hover:bg-white/10"
            onClick={() => readingModeSettingsStorage.adjustLineHeight(-0.05).catch(() => {})}
            title="Decrease line height">
            <ListChevronsDownUp size={16} />
          </button>
          <button
            className="rounded p-2 transition-colors hover:bg-white/10"
            onClick={() => readingModeSettingsStorage.adjustLineHeight(+0.05).catch(() => {})}
            title="Increase line height">
            <ListChevronsUpDown size={16} />
          </button>
          <button
            className="rounded p-2 transition-colors hover:bg-white/10"
            onClick={() => readingModeSettingsStorage.adjustMaxWidth(-5).catch(() => {})}
            title="Narrow column (Ctrl/Cmd + [)">
            <FoldHorizontal size={16} />
          </button>
          <button
            className="rounded p-2 transition-colors hover:bg-white/10"
            onClick={() => readingModeSettingsStorage.adjustMaxWidth(+5).catch(() => {})}
            title="Widen column (Ctrl/Cmd + ])">
            <UnfoldHorizontal size={16} />
          </button>
          <button
            className="rounded p-2 transition-colors hover:bg-white/10"
            onClick={() => readingModeSettingsStorage.cycleTheme().catch(() => {})}
            title="Cycle theme (T)">
            <SunMoon size={16} />
          </button>
          <button
            className="rounded p-2 transition-colors hover:bg-white/10"
            onClick={() => setShowImages(!showImages)}
            title={showImages ? 'Hide images' : 'Show images'}>
            {showImages ? <Image size={16} /> : <ImageOff size={16} />}
          </button>
          <button
            className="rounded p-2 transition-colors hover:bg-white/10"
            onClick={() => setShowPrefixes(!showPrefixes)}
            title={showPrefixes ? 'Hide translation prefixes' : 'Show translation prefixes'}>
            {showPrefixes ? <Captions size={16} /> : <CaptionsOff size={16} />}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div
        ref={contentAreaRef}
        className="mx-auto flex-1 px-8 py-8"
        style={{
          maxWidth: `${settings?.maxWidthCh || 65}ch`,
          fontSize: `${settings?.fontSizePx || 18}px`,
          lineHeight: settings?.lineHeight || 1.6,
        }}>
        <div
          ref={plainTextRef}
          className="whitespace-pre-wrap"
          style={{
            fontSize: `${settings?.fontSizePx || 18}px`,
            lineHeight: settings?.lineHeight || 1.6,
          }}
        />
      </div>

      {/* Tooltip */}
      {hoveredChunk && tooltipPosition && (
        <div
          ref={tooltipRef}
          className="pointer-events-auto fixed z-[1000000] mb-2 min-w-[200px] max-w-[400px] rounded-lg border border-white/30 bg-[#1a1a1a] px-4 py-3 text-base leading-normal shadow-lg"
          style={{
            bottom: `${window.innerHeight - tooltipPosition.y}px`,
            left: `${tooltipPosition.x}px`,
            transform: 'translateX(-50%)',
          }}
          onMouseEnter={() => {
            // Keep tooltip open when mouse enters it
            if (tooltipCloseTimeoutRef.current !== null) {
              clearTimeout(tooltipCloseTimeoutRef.current);
              tooltipCloseTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => {
            // Close tooltip when mouse leaves it
            if (tooltipCloseTimeoutRef.current !== null) {
              clearTimeout(tooltipCloseTimeoutRef.current);
            }
            tooltipCloseTimeoutRef.current = window.setTimeout(() => {
              setHoveredChunk(null);
              setTooltipPosition(null);
              setHoveredChunkImages([]);
              setHoveredChunkImageIndex(0);
              tooltipCloseTimeoutRef.current = null;
            }, 200);
          }}>
          {hoveredChunk.translation.literal && (
            <div className="mb-2 border-b border-white/10 pb-2 text-[#90CAF9]">
              {showPrefixes ? 'Literal: ' : ''}
              {hoveredChunk.translation.literal}
            </div>
          )}
          {hoveredChunk.translation.contextual && hoveredChunk.translation.differs && (
            <div className="text-[#81C784]">
              {showPrefixes ? 'Contextual: ' : ''}
              {hoveredChunk.translation.contextual}
            </div>
          )}
          {!hoveredChunk.translation.differs && hoveredChunk.translation.contextual && (
            <div className="text-white">{hoveredChunk.translation.contextual}</div>
          )}
          
          {/* Image Viewer */}
          {showImages && hoveredChunkImages.length > 0 && (
            <div className="mt-3 flex flex-col items-center gap-2">
              <img
                src={hoveredChunkImages[hoveredChunkImageIndex]}
                alt={hoveredChunk.translation.contextual || hoveredChunk.translation.literal || hoveredChunk.text}
                className="h-[120px] w-[120px] rounded-lg object-cover"
                onError={() => {
                  // Try next image if current fails
                  if (hoveredChunkImageIndex < hoveredChunkImages.length - 1) {
                    setHoveredChunkImageIndex(prev => prev + 1);
                  }
                }}
              />
              {hoveredChunkImages.length > 1 && (
                <div className="flex gap-1">
                  {hoveredChunkImages.map((_, idx) => (
                    <button
                      key={idx}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        idx === hoveredChunkImageIndex ? 'bg-white' : 'bg-white/40'
                      }`}
                      onClick={() => setHoveredChunkImageIndex(idx)}
                      aria-label={`Image ${idx + 1} of ${hoveredChunkImages.length}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
