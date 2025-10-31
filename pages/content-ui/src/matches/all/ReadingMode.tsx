import { getImagesForQuery } from '@extension/api';
import { useStorage } from '@extension/shared';
import { readingModeSettingsStorage } from '@extension/storage';
import { cn } from '@extension/ui';
import { useFloating, autoUpdate, offset, flip, shift } from '@floating-ui/react';
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
import { useEffect, useRef, useState, useMemo } from 'react';
import type { AnnotatedChunk } from '@extension/api';

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
    literalCompleted?: number;
    contextualCompleted?: number;
  };
  isSimplifyMode?: boolean;
  onClose?: () => void;
}

export const ReadingMode = ({
  isVisible,
  title,
  plainText,
  chunks,
  progress,
  isSimplifyMode,
  onClose,
}: ReadingModeProps) => {
  // Ensure plainText is a string (declare early so it can be used in useEffect)
  const safePlainText = plainText || '';

  const settings = useStorage(readingModeSettingsStorage);
  const [hoveredChunk, setHoveredChunk] = useState<AnnotatedChunk | null>(null);
  const [showImages, setShowImages] = useState(true);
  const [showPrefixes, setShowPrefixes] = useState(true);
  const [hoveredChunkImages, setHoveredChunkImages] = useState<string[]>([]);
  const [hoveredChunkImageIndex, setHoveredChunkImageIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const plainTextRef = useRef<HTMLDivElement>(null);
  const lockedScrollYRef = useRef(0);
  const isScrollLockedRef = useRef(false);
  const tooltipCloseTimeoutRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const lastTranslationRef = useRef<{ literal: string; contextual: string; differs: boolean } | null>(null);

  // Get current chunk from chunks array when hoveredChunk is set
  // This ensures we always have the latest translation without re-rendering unnecessarily
  const currentHoveredChunk = useMemo(() => {
    if (!hoveredChunk) return null;
    return (
      chunks.find(c => c.start === hoveredChunk.start && c.end === hoveredChunk.end && c.text === hoveredChunk.text) ||
      hoveredChunk
    );
  }, [chunks, hoveredChunk]);

  // Floating UI for tooltip positioning
  const { refs, floatingStyles } = useFloating({
    open: hoveredChunk !== null,
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: hoveredChunk !== null ? autoUpdate : undefined,
  });

  // Extract setReference to avoid missing dependency warning
  const setReference = refs.setReference;

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

        // Find the most up-to-date chunk from current chunks array
        const currentChunk = chunks.find(c => c.start === chunk.start && c.end === chunk.end && c.text === chunk.text);
        const chunkToShow = currentChunk || chunk;

        triggerRef.current = wrapper;
        setReference(wrapper);
        setHoveredChunk(chunkToShow);
        setHoveredChunkImages([]);
        setHoveredChunkImageIndex(0);
      });

      wrapper.addEventListener('mouseleave', () => {
        // Delay closing tooltip to allow mouse to move to tooltip
        if (tooltipCloseTimeoutRef.current !== null) {
          clearTimeout(tooltipCloseTimeoutRef.current);
        }
        tooltipCloseTimeoutRef.current = window.setTimeout(() => {
          // Find the most up-to-date chunk before closing (in case translations updated)
          const currentChunk = chunks.find(
            c => c.start === chunk.start && c.end === chunk.end && c.text === chunk.text,
          );
          if (currentChunk && hoveredChunk && currentChunk.start === hoveredChunk.start) {
            // Update hovered chunk if it's the same one
            setHoveredChunk(currentChunk);
          } else {
            setHoveredChunk(null);
          }
          setHoveredChunkImages([]);
          setHoveredChunkImageIndex(0);
          tooltipCloseTimeoutRef.current = null;
        }, 300); // 300ms delay to allow moving to tooltip
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
  }, [chunks, setReference]);

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

  // Update hovered chunk state only when translation content actually changes
  // This prevents unnecessary tooltip re-renders during progressive loading
  useEffect(() => {
    if (!currentHoveredChunk) {
      lastTranslationRef.current = null;
      return;
    }

    const currentTranslation = currentHoveredChunk.translation;
    const lastTranslation = lastTranslationRef.current;

    // Check if translation actually changed
    if (
      !lastTranslation ||
      lastTranslation.literal !== currentTranslation.literal ||
      lastTranslation.contextual !== currentTranslation.contextual ||
      lastTranslation.differs !== currentTranslation.differs
    ) {
      // Only update state if translation content changed
      lastTranslationRef.current = {
        literal: currentTranslation.literal,
        contextual: currentTranslation.contextual,
        differs: currentTranslation.differs,
      };
      // Only call setState if the chunk reference actually changed (avoid re-render if same chunk)
      if (currentHoveredChunk !== hoveredChunk) {
        setHoveredChunk(currentHoveredChunk);
      }
    }
  }, [currentHoveredChunk, hoveredChunk]);

  // Load images for hovered chunk
  // Use currentHoveredChunk (memoized) to avoid re-triggering on every chunks update
  useEffect(() => {
    if (!currentHoveredChunk || !showImages) {
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
      const c = sanitize(currentHoveredChunk.translation?.contextual?.trim());
      const l = sanitize(currentHoveredChunk.translation?.literal?.trim());
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
  }, [currentHoveredChunk, showImages]);

  if (!isVisible) {
    return null;
  }

  const progressPercent = progress ? (progress.completed / progress.total) * 100 : 0;
  const literalProgressPercent =
    progress && progress.literalCompleted !== undefined && progress.total
      ? (progress.literalCompleted / progress.total) * 100
      : progress?.phase === 'translate-literal' || progress?.phase === 'translate-contextual'
        ? progressPercent
        : 0;
  const contextualProgressPercent =
    progress && progress.contextualCompleted !== undefined && progress.total
      ? (progress.contextualCompleted / progress.total) * 100
      : progress?.phase === 'translate-contextual'
        ? progressPercent
        : 0;

  const showDualProgress =
    progress &&
    !isSimplifyMode &&
    (progress.phase === 'translate-literal' ||
      progress.phase === 'translate-contextual' ||
      (progress.literalCompleted !== undefined && progress.contextualCompleted !== undefined));

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
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <h1
              className="m-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-semibold"
              style={{
                fontSize: `${(settings?.fontSizePx || 18) * 1.33}px`,
              }}>
              {title || 'Reading Mode'}
            </h1>
            {isSimplifyMode && (
              <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-300">
                Simplify Mode
              </span>
            )}
          </div>
          <button
            onClick={() => onClose?.()}
            className="cursor-pointer rounded border-0 bg-transparent px-4 py-2 text-3xl leading-none text-inherit transition-colors hover:bg-white/10"
            aria-label="Close reading mode">
            <X size={20} />
          </button>
        </div>

        {/* Progress Bars */}
        {progress && (
          <div className="flex min-h-[28px] flex-col items-center gap-2 px-8 pb-4">
            {showDualProgress ? (
              <>
                <div className="text-center text-sm text-gray-400">
                  {progress.phase === 'translate-literal'
                    ? 'Literal Translation'
                    : progress.phase === 'translate-contextual'
                      ? 'Contextual Translation'
                      : progress.phase || 'Processing...'}
                </div>
                <div className="flex w-full max-w-[300px] flex-col gap-2">
                  {/* Literal progress bar */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Literal</span>
                      <span>
                        {progress.literalCompleted !== undefined
                          ? `${progress.literalCompleted}/${progress.total}`
                          : progress.phase === 'translate-literal'
                            ? `${progress.completed}/${progress.total}`
                            : progress.total
                              ? `${progress.total}/${progress.total}`
                              : '0/0'}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                      <div
                        className="h-full rounded-full transition-all duration-300 ease-in-out"
                        style={{
                          background: 'linear-gradient(90deg, #90CAF9, #64B5F6)',
                          width: `${literalProgressPercent}%`,
                        }}
                      />
                    </div>
                  </div>
                  {/* Contextual progress bar */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Contextual</span>
                      <span>
                        {progress.contextualCompleted !== undefined
                          ? `${progress.contextualCompleted}/${progress.total}`
                          : progress.phase === 'translate-contextual'
                            ? `${progress.completed}/${progress.total}`
                            : '0/0'}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                      <div
                        className="h-full rounded-full transition-all duration-300 ease-in-out"
                        style={{
                          background: 'linear-gradient(90deg, #81C784, #66BB6A)',
                          width: `${contextualProgressPercent}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
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
      {currentHoveredChunk && (
        <div
          ref={refs.setFloating}
          className="pointer-events-auto z-[1000000] min-w-[200px] max-w-[400px] rounded-lg border border-white/30 bg-[#1a1a1a] px-4 py-3 leading-normal shadow-lg"
          style={{
            ...floatingStyles,
            fontSize: `${settings?.fontSizePx || 18}px`,
          }}
          onMouseEnter={e => {
            // Keep tooltip open when mouse enters it or any child element
            e.stopPropagation();
            if (tooltipCloseTimeoutRef.current !== null) {
              clearTimeout(tooltipCloseTimeoutRef.current);
              tooltipCloseTimeoutRef.current = null;
            }
          }}
          onMouseLeave={e => {
            // Only close if mouse leaves the entire tooltip area
            // Check if we're moving to a child element
            const tooltipEl = refs.floating.current;
            const relatedTarget = e.relatedTarget as Node | null;
            if (tooltipEl && relatedTarget && tooltipEl.contains(relatedTarget)) {
              return; // Moving to a child, don't close
            }

            // Close tooltip when mouse leaves it
            if (tooltipCloseTimeoutRef.current !== null) {
              clearTimeout(tooltipCloseTimeoutRef.current);
            }
            tooltipCloseTimeoutRef.current = window.setTimeout(() => {
              setHoveredChunk(null);
              setHoveredChunkImages([]);
              setHoveredChunkImageIndex(0);
              lastTranslationRef.current = null;
              tooltipCloseTimeoutRef.current = null;
            }, 300);
          }}>
          {isSimplifyMode ? (
            // Simplify mode: show simplified text without prefixes
            currentHoveredChunk.translation.contextual && (
              <div className="text-white">{currentHoveredChunk.translation.contextual}</div>
            )
          ) : (
            // Translation mode: show literal and contextual
            <>
              {/* Show literal if it exists and differs from contextual, or if contextual doesn't exist yet */}
              {currentHoveredChunk.translation.literal &&
                (currentHoveredChunk.translation.differs || !currentHoveredChunk.translation.contextual) && (
                  <div
                    className={
                      currentHoveredChunk.translation.contextual && currentHoveredChunk.translation.differs
                        ? 'mb-2 border-b border-white/10 pb-2 text-[#90CAF9]'
                        : 'text-[#90CAF9]'
                    }>
                    {showPrefixes &&
                    currentHoveredChunk.translation.contextual &&
                    currentHoveredChunk.translation.differs
                      ? 'Literal: '
                      : ''}
                    {currentHoveredChunk.translation.literal}
                  </div>
                )}
              {/* Show contextual if it exists */}
              {currentHoveredChunk.translation.contextual && (
                <div
                  className={
                    currentHoveredChunk.translation.differs
                      ? 'text-[#81C784]'
                      : currentHoveredChunk.translation.literal
                        ? 'text-white'
                        : 'text-white'
                  }>
                  {showPrefixes && currentHoveredChunk.translation.differs ? 'Contextual: ' : ''}
                  {currentHoveredChunk.translation.contextual}
                </div>
              )}
            </>
          )}

          {/* Image Viewer */}
          {showImages && hoveredChunkImages.length > 0 && (
            <div
              className="mt-3 flex flex-col items-center gap-2"
              onMouseEnter={e => {
                // Keep tooltip open when hovering over image area
                e.stopPropagation();
                if (tooltipCloseTimeoutRef.current !== null) {
                  clearTimeout(tooltipCloseTimeoutRef.current);
                  tooltipCloseTimeoutRef.current = null;
                }
              }}>
              <button
                type="button"
                className="cursor-pointer rounded-lg transition-opacity hover:opacity-90"
                onClick={() => {
                  // Cycle to next image
                  setHoveredChunkImageIndex(prev => (prev + 1) % hoveredChunkImages.length);
                }}
                aria-label="Cycle to next image">
                <img
                  src={hoveredChunkImages[hoveredChunkImageIndex]}
                  alt={
                    currentHoveredChunk?.translation.contextual ||
                    currentHoveredChunk?.translation.literal ||
                    currentHoveredChunk?.text ||
                    ''
                  }
                  className="h-[120px] w-[120px] rounded-lg object-cover"
                  onError={() => {
                    // Try next image if current fails
                    if (hoveredChunkImageIndex < hoveredChunkImages.length - 1) {
                      setHoveredChunkImageIndex(prev => prev + 1);
                    }
                  }}
                />
              </button>
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
