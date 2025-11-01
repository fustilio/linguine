export type UndoStats = {
  wrappersFound: number;
  buttonsRemoved: number;
  restored: number;
  processedCleared: number;
  durationMs: number;
};

class UndoManager {
  private wrapperRegistry: Set<HTMLElement> = new Set();

  registerWrapper(wrapper: HTMLElement): void {
    this.wrapperRegistry.add(wrapper);
  }

  unregisterWrapper(wrapper: HTMLElement): void {
    this.wrapperRegistry.delete(wrapper);
  }

  hasActiveRewrites(): boolean {
    const wrappers = this.collectAllWrappers();
    return wrappers.length > 0;
  }

  undoAll(): UndoStats {
    const start = performance.now();
    let buttonsRemoved = 0;
    let restored = 0;
    let processedCleared = 0;

    // Gather wrappers from registry + DOMs
    const wrappers = this.collectAllWrappers();
    const wrappersFound = wrappers.length;

    wrappers.forEach(wrapper => {
      const originalText = wrapper.dataset.originalText || wrapper.textContent || '';
      const buttons = wrapper.nextElementSibling;
      if (buttons && buttons.classList.contains('rewriter-buttons')) {
        buttonsRemoved += 1;
        buttons.remove();
      }
      const parent = wrapper.parentNode;
      if (parent) {
        restored += 1;
        parent.replaceChild(document.createTextNode(originalText), wrapper);
        (parent as HTMLElement).normalize();
      }
      this.wrapperRegistry.delete(wrapper);
    });

    // Clear processed markers and orphaned buttons in main document and same-origin frames
    this.visitAllDocuments(doc => {
      const processed = doc.querySelectorAll('.word-replacer-processed');
      processed.forEach(el => {
        processedCleared += 1;
        el.classList.remove('word-replacer-processed');
      });

      // Remove any orphaned button containers
      doc.querySelectorAll('.rewriter-buttons').forEach(btns => {
        btns.remove();
      });
    });

    const durationMs = Math.round(performance.now() - start);
    return { wrappersFound, buttonsRemoved, restored, processedCleared, durationMs };
  }

  removeAllInteractiveKeepCurrent(): void {
    const wrappers = this.collectAllWrappers();
    wrappers.forEach(wrapper => {
      const buttons = wrapper.nextElementSibling;
      if (buttons && buttons.classList.contains('rewriter-buttons')) {
        buttons.remove();
      }
      const parent = wrapper.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(wrapper.textContent || ''), wrapper);
        (parent as HTMLElement).normalize();
      }
      this.wrapperRegistry.delete(wrapper);
    });
  }

  private collectAllWrappers(): HTMLElement[] {
    const fromRegistry = Array.from(this.wrapperRegistry).filter(el => !!el.parentNode);
    const fromDocs: HTMLElement[] = [];
    this.visitAllDocuments(doc => {
      doc.querySelectorAll('.rewriter-highlight').forEach(el => fromDocs.push(el as HTMLElement));
      // In case class was stripped but data attribute remains
      doc.querySelectorAll('[data-original-text]').forEach(el => fromDocs.push(el as HTMLElement));
      // Also search shadow roots
      this.visitAllShadowRoots(doc, root => {
        root.querySelectorAll('.rewriter-highlight').forEach(el => fromDocs.push(el as HTMLElement));
        root.querySelectorAll('[data-original-text]').forEach(el => fromDocs.push(el as HTMLElement));
      });
    });
    const unique = new Set<HTMLElement>([...fromRegistry, ...fromDocs]);
    return Array.from(unique);
  }

  private visitAllDocuments(visitor: (doc: Document) => void): void {
    // Main document
    visitor(document);

    // Same-origin iframes
    const frames = Array.from(window.frames || []);
    frames.forEach(frame => {
      try {
        const doc = (frame as Window).document;
        if (doc) visitor(doc);
      } catch {
        // Cross-origin frame, ignore
      }
    });
  }

  private visitAllShadowRoots(doc: Document, visitor: (root: ShadowRoot) => void): void {
    const stack: Node[] = [doc];
    while (stack.length) {
      const node = stack.pop()!;
      if ((node as Element).shadowRoot) {
        const shadow = (node as Element).shadowRoot as ShadowRoot;
        visitor(shadow);
        stack.push(shadow as unknown as Node);
      }
      // Traverse children
      node.childNodes.forEach(child => stack.push(child));
    }
  }
}

export const undoManager = new UndoManager();


