/**
 * Text extraction using Mozilla Readability for automatic content extraction
 */

import { Readability } from '@mozilla/readability';
import type { ExtractedText } from './types.js';

/**
 * Extract main content from page using Mozilla Readability
 */
export function extractContentWithReadability(doc: Document, url: string): ExtractedText | null {
  try {
    // Clone document to avoid modifying original
    const clonedDoc = doc.cloneNode(true) as Document;
    
    const reader = new Readability(clonedDoc, {
      debug: false,
    });

    const article = reader.parse();
    
    if (!article) {
      return null;
    }

    return {
      title: article.title || undefined,
      byline: article.byline || undefined,
      content: article.content, // Clean HTML content
      language: article.lang || undefined,
      siteName: article.siteName || undefined,
    };
  } catch (error) {
    console.error('Failed to extract content with Readability:', error);
    return null;
  }
}

/**
 * Extract selected text from page
 */
export function extractSelectedText(doc: Document): ExtractedText | null {
  const selection = window.getSelection();
  
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const text = selection.toString().trim();
  
  if (!text || text.length === 0) {
    return null;
  }

  // Try to get title from the document
  const title = doc.querySelector('title')?.textContent || undefined;
  
  // Detect language from text if possible
  const lang = doc.documentElement.lang || undefined;

  return {
    title,
    content: `<p>${escapeHtml(text)}</p>`, // Wrap in paragraph tag
    language: lang,
  };
}

/**
 * Extract text using a CSS selector
 */
export function extractTextBySelector(doc: Document, selector: string): ExtractedText | null {
  try {
    const element = doc.querySelector(selector);
    
    if (!element) {
      return null;
    }

    // Clone element to avoid modifying original
    const clonedElement = element.cloneNode(true) as HTMLElement;
    
    // Get title from document
    const title = doc.querySelector('title')?.textContent || undefined;
    const lang = doc.documentElement.lang || undefined;

    return {
      title,
      content: clonedElement.innerHTML,
      language: lang,
    };
  } catch (error) {
    console.error('Failed to extract text by selector:', error);
    return null;
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Extract plain text from HTML (removes all tags)
 */
export function extractPlainText(html: string): string {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || '';
}
