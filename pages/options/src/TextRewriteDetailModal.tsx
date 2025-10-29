import React from 'react';
import type { TextRewrite } from '@extension/sqlite';
import { themeVariants, getReadabilityStyles, getLanguageDisplayName, cn } from '@extension/ui';

interface TextRewriteDetailModalProps {
  rewrite: TextRewrite | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TextRewriteDetailModal = ({ rewrite, isOpen, onClose }: TextRewriteDetailModalProps) => {

  if (!isOpen || !rewrite) return null;

  const settings = JSON.parse(rewrite.rewriter_settings);
  const originalReadability = getReadabilityStyles(rewrite.original_readability_score);
  const rewrittenReadability = getReadabilityStyles(rewrite.rewritten_readability_score);

  return (
    <div className={themeVariants.modalOverlay()}>
      <div className={themeVariants.modalContent()}>
        {/* Header */}
        <div className={themeVariants.modalHeader()}>
          <div className="flex items-center justify-between">
            <h3 className={cn(themeVariants.heading(), 'text-lg')}>Text Rewrite Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={themeVariants.modalBody()}>
          <div className="space-y-6">
            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className={cn(themeVariants.card(), 'p-4')}>
                <h4 className={cn(themeVariants.muted(), 'text-sm font-medium mb-2')}>Language</h4>
                <span className={themeVariants.badge({ variant: 'primary' })}>
                  {getLanguageDisplayName(rewrite.language)}
                </span>
              </div>
              
              <div className={cn(themeVariants.card(), 'p-4')}>
                <h4 className={cn(themeVariants.muted(), 'text-sm font-medium mb-2')}>Original Readability</h4>
                <div className="flex items-center">
                  <div className={`text-lg font-bold ${originalReadability.color} mr-2`}>
                    {rewrite.original_readability_score.toFixed(1)}
                  </div>
                  <span className={`text-sm font-medium px-2 py-1 rounded ${originalReadability.badge}`}>
                    {originalReadability.text}
                  </span>
                </div>
              </div>
              
              <div className={cn(themeVariants.card(), 'p-4')}>
                <h4 className={cn(themeVariants.muted(), 'text-sm font-medium mb-2')}>Rewritten Readability</h4>
                <div className="flex items-center">
                  <div className={`text-lg font-bold ${rewrittenReadability.color} mr-2`}>
                    {rewrite.rewritten_readability_score.toFixed(1)}
                  </div>
                  <span className={`text-sm font-medium px-2 py-1 rounded ${rewrittenReadability.badge}`}>
                    {rewrittenReadability.text}
                  </span>
                </div>
              </div>
              
              <div className={cn(themeVariants.card(), 'p-4')}>
                <h4 className={cn(themeVariants.muted(), 'text-sm font-medium mb-2')}>Created</h4>
                <div className={cn(themeVariants.body(), 'text-sm')}>
                  {new Date(rewrite.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Original Text */}
            <div>
              <h4 className={cn(themeVariants.muted(), 'text-sm font-medium mb-2')}>Original Text</h4>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className={cn(themeVariants.body(), 'leading-relaxed')}>{rewrite.original_text}</p>
              </div>
            </div>

            {/* Rewritten Text */}
            <div>
              <h4 className={cn(themeVariants.muted(), 'text-sm font-medium mb-2')}>Rewritten Text</h4>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className={cn(themeVariants.body(), 'leading-relaxed')}>{rewrite.rewritten_text}</p>
              </div>
            </div>

            {/* Rewriter Settings */}
            <div>
              <h4 className={cn(themeVariants.muted(), 'text-sm font-medium mb-2')}>Rewriter Settings</h4>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">Shared Context</span>
                    <p className={cn(themeVariants.body(), 'text-sm mt-1')}>{settings.sharedContext || 'None'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">Tone</span>
                    <p className={cn(themeVariants.body(), 'text-sm mt-1')}>{settings.tone || 'Default'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">Format</span>
                    <p className={cn(themeVariants.body(), 'text-sm mt-1')}>{settings.format || 'Default'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">Length</span>
                    <p className={cn(themeVariants.body(), 'text-sm mt-1')}>{settings.length || 'Default'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Source Information */}
            <div>
              <h4 className={cn(themeVariants.muted(), 'text-sm font-medium mb-2')}>Source Information</h4>
              <div className={cn(themeVariants.card(), 'p-4')}>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">URL</span>
                    <a
                      href={rewrite.source_url + (rewrite.url_fragment || '')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mt-1 break-all"
                    >
                      {rewrite.source_url}
                    </a>
                  </div>
                  {rewrite.url_fragment && (
                    <div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Text Fragment</span>
                      <p className={cn(themeVariants.body(), 'text-sm mt-1 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded')}>
                        {rewrite.url_fragment}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Raw Data */}
            <details className={cn(themeVariants.card(), 'p-4')}>
              <summary className={cn(themeVariants.muted(), 'text-sm font-medium cursor-pointer hover:text-gray-900 dark:hover:text-gray-100')}>
                Raw JSON Data
              </summary>
              <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                {JSON.stringify(rewrite, null, 2)}
              </pre>
            </details>
          </div>
        </div>

        {/* Footer */}
        <div className={themeVariants.modalFooter()}>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className={cn(themeVariants.button({ variant: 'secondary' }), 'text-sm')}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
