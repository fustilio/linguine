/**
 * FloatingWidget - A draggable, interactive floating UI component
 * @deprecated This class is deprecated and will be removed in the future.
 * The floating widget is now implemented as a React component in content-ui.
 * See pages/content-ui/src/matches/all/FloatingWidget.tsx
 */

export type WidgetSize = 'small' | 'medium' | 'large';
export type WidgetState = 'idle' | 'loading' | 'success' | 'error';

export interface WidgetConfig {
  size: WidgetSize;
  initialPosition?: { x: number; y: number };
  iconUrl?: string;
  title?: string;
  zIndex?: number;
}

export interface WidgetCallbacks {
  onClick?: () => void | Promise<void>;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

/**
 * FloatingWidget handles all UI rendering and interaction logic
 * for the draggable floating button
 * @deprecated This class is deprecated and will be removed in the future.
 * Use the React component in content-ui instead.
 */
export class FloatingWidget {
  private element: HTMLElement | null = null;
  private config: Required<WidgetConfig>;
  private callbacks: WidgetCallbacks = {};

  // Drag state
  private isDragging = false;
  private dragStartPosition: { x: number; y: number } | null = null;
  private dragOffset = { x: 0, y: 0 };

  // Event handlers (stored for cleanup)
  private mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private mouseUpHandler: (() => void) | null = null;

  constructor(config: WidgetConfig) {
    this.config = {
      size: config.size,
      initialPosition: config.initialPosition || { x: 20, y: 20 }, // bottom-right default
      iconUrl: config.iconUrl || '',
      title: config.title || 'Click to rewrite selected text',
      zIndex: config.zIndex || 999999,
    };
  }

  /**
   * Builder method: Set click callback
   */
  public onClick(callback: () => void | Promise<void>): this {
    this.callbacks.onClick = callback;
    return this;
  }

  /**
   * Builder method: Set drag start callback
   */
  public onDragStart(callback: () => void): this {
    this.callbacks.onDragStart = callback;
    return this;
  }

  /**
   * Builder method: Set drag end callback
   */
  public onDragEnd(callback: () => void): this {
    this.callbacks.onDragEnd = callback;
    return this;
  }

  /**
   * Create and mount the widget to the DOM
   */
  public mount(): void {
    if (this.element) {
      console.warn('Widget already mounted');
      return;
    }

    this.element = this.createWidgetElement();
    this.attachEventListeners();
    document.body.appendChild(this.element);
  }

  /**
   * Remove the widget from the DOM and cleanup
   */
  public unmount(): void {
    if (!this.element) return;

    this.removeEventListeners();

    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.element = null;
  }

  /**
   * Update widget visual state
   */
  public setState(state: WidgetState, message?: string): void {
    if (!this.element) return;

    const stateStyles = {
      idle: { background: '#f4d03f', cursor: 'move', animation: '' },
      loading: { background: '#f4d03f', cursor: 'wait', animation: 'spin 1s linear infinite' },
      success: { background: '#4ade80', cursor: 'move', animation: '' },
      error: { background: '#f87171', cursor: 'move', animation: '' },
    };

    const style = stateStyles[state];
    Object.assign(this.element.style, style);

    if (message) {
      this.element.title = message;
    }

    // Ensure spin animation exists
    if (state === 'loading') {
      this.ensureSpinAnimation();
    }

    // Auto-reset success/error states after delay
    if (state === 'success' || state === 'error') {
      setTimeout(() => {
        this.setState('idle', this.config.title);
      }, 1500);
    }
  }

  /**
   * Show a temporary tooltip message
   */
  public showTooltip(message: string, duration: number = 1500): void {
    const tooltip = document.createElement('div');
    tooltip.textContent = message;
    tooltip.style.cssText = `
      position: fixed;
      bottom: ${this.getSizeInPixels() + 30}px;
      right: 20px;
      background: #1f2937;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: ${this.config.zIndex + 1};
      pointer-events: none;
      animation: fadeIn 0.2s ease-out;
    `;

    this.ensureFadeInAnimation();
    document.body.appendChild(tooltip);

    setTimeout(() => {
      tooltip.remove();
    }, duration);
  }

  /**
   * Update widget size
   */
  public setSize(size: WidgetSize): void {
    this.config.size = size;
    if (this.element) {
      const sizeValue = this.getSizeValue();
      this.element.style.width = sizeValue.width;
      this.element.style.height = sizeValue.height;
    }
  }

  /**
   * Check if widget is currently mounted
   */
  public isMounted(): boolean {
    return this.element !== null;
  }

  // ==================== Private Methods ====================

  private createWidgetElement(): HTMLElement {
    const widget = document.createElement('div');
    widget.id = 'linguine-floating-widget';
    widget.title = this.config.title;

    const size = this.getSizeValue();
    const position = this.config.initialPosition;

    widget.style.cssText = `
      position: fixed;
      bottom: ${position!.y}px;
      right: ${position!.x}px;
      width: ${size.width};
      height: ${size.height};
      background: #f4d03f;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: move;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: ${this.config.zIndex};
      user-select: none;
      transition: transform 0.2s, box-shadow 0.2s;
      overflow: hidden;
    `;

    // Add icon if provided
    if (this.config.iconUrl) {
      const img = document.createElement('img');
      img.src = this.config.iconUrl;
      img.alt = 'Widget Icon';
      img.style.cssText = `
        width: 70%;
        height: 70%;
        object-fit: contain;
      `;
      widget.appendChild(img);
    }

    return widget;
  }

  private attachEventListeners(): void {
    if (!this.element) return;

    // Hover effects
    this.element.addEventListener('mouseenter', this.handleMouseEnter);
    this.element.addEventListener('mouseleave', this.handleMouseLeave);

    // Drag and click
    this.element.addEventListener('mousedown', this.handleMouseDown);
    this.element.addEventListener('click', this.handleClick);

    // Document-level drag handlers
    this.mouseMoveHandler = this.handleMouseMove.bind(this);
    this.mouseUpHandler = this.handleMouseUp.bind(this);

    document.addEventListener('mousemove', this.mouseMoveHandler);
    document.addEventListener('mouseup', this.mouseUpHandler);
  }

  private removeEventListeners(): void {
    if (this.element) {
      this.element.removeEventListener('mouseenter', this.handleMouseEnter);
      this.element.removeEventListener('mouseleave', this.handleMouseLeave);
      this.element.removeEventListener('mousedown', this.handleMouseDown);
      this.element.removeEventListener('click', this.handleClick);
    }

    if (this.mouseMoveHandler) {
      document.removeEventListener('mousemove', this.mouseMoveHandler);
      this.mouseMoveHandler = null;
    }

    if (this.mouseUpHandler) {
      document.removeEventListener('mouseup', this.mouseUpHandler);
      this.mouseUpHandler = null;
    }
  }

  private handleMouseEnter = (): void => {
    if (!this.element) return;
    this.element.style.transform = 'scale(1.1)';
    this.element.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
  };

  private handleMouseLeave = (): void => {
    if (!this.element || this.isDragging) return;
    this.element.style.transform = 'scale(1)';
    this.element.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  };

  private handleMouseDown = (e: MouseEvent): void => {
    if (!this.element) return;

    this.isDragging = false;
    this.dragStartPosition = {
      x: e.clientX,
      y: e.clientY,
    };

    const rect = this.element.getBoundingClientRect();
    this.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    this.element.style.cursor = 'grabbing';
    e.preventDefault();
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.dragStartPosition || !this.element) return;

    const deltaX = Math.abs(e.clientX - this.dragStartPosition.x);
    const deltaY = Math.abs(e.clientY - this.dragStartPosition.y);
    const dragThreshold = 5;

    // Start dragging if moved beyond threshold
    if (!this.isDragging && (deltaX > dragThreshold || deltaY > dragThreshold)) {
      this.isDragging = true;
      this.callbacks.onDragStart?.();
    }

    if (!this.isDragging) return;

    const x = e.clientX - this.dragOffset.x;
    const y = e.clientY - this.dragOffset.y;

    // Keep widget within viewport
    const maxX = window.innerWidth - this.element.offsetWidth;
    const maxY = window.innerHeight - this.element.offsetHeight;

    const boundedX = Math.max(0, Math.min(x, maxX));
    const boundedY = Math.max(0, Math.min(y, maxY));

    this.element.style.left = `${boundedX}px`;
    this.element.style.top = `${boundedY}px`;
    this.element.style.bottom = 'auto';
    this.element.style.right = 'auto';
  };

  private handleMouseUp = (): void => {
    if (this.element) {
      this.element.style.cursor = 'move';
      this.element.style.transform = 'scale(1)';
      this.element.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    }

    if (this.isDragging) {
      this.callbacks.onDragEnd?.();
    }

    // Reset drag state after small delay to prevent click event
    setTimeout(() => {
      this.isDragging = false;
      this.dragStartPosition = null;
    }, 10);
  };

  private handleClick = async (e: MouseEvent): Promise<void> => {
    // Don't trigger click if dragging
    if (this.isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (this.callbacks.onClick) {
      try {
        await this.callbacks.onClick();
      } catch (error) {
        console.error('Widget click handler error:', error);
      }
    }
  };

  private getSizeValue(): { width: string; height: string } {
    const sizeMap = {
      small: { width: '50px', height: '50px' },
      medium: { width: '70px', height: '70px' },
      large: { width: '90px', height: '90px' },
    };
    return sizeMap[this.config.size];
  }

  private getSizeInPixels(): number {
    const sizeMap = { small: 50, medium: 70, large: 90 };
    return sizeMap[this.config.size];
  }

  private ensureSpinAnimation(): void {
    if (document.getElementById('linguine-spin-animation')) return;

    const style = document.createElement('style');
    style.id = 'linguine-spin-animation';
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  private ensureFadeInAnimation(): void {
    if (document.getElementById('linguine-tooltip-animation')) return;

    const style = document.createElement('style');
    style.id = 'linguine-tooltip-animation';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }
}
