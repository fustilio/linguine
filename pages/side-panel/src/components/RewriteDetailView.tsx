import { Card, CardContent, Badge, ReadabilityBadge, cn, themeVariants } from '@extension/ui';
import { getLanguageDisplayName } from '@extension/shared';
import type { TextRewrite } from '@extension/api';
import { useState } from 'react';

interface RewriteDetailViewProps {
  rewrite: TextRewrite;
  onDelete?: (rewriteId: number) => void;
  availabilityStatus?: 'rewritten' | 'original' | 'none';
}

export const RewriteDetailView = ({ rewrite, onDelete, availabilityStatus }: RewriteDetailViewProps) => {
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Determine if text is available and what type
  const isTextAvailable = availabilityStatus !== 'none';
  const isRewrittenAvailable = availabilityStatus === 'rewritten';

  const handleJumpToText = async () => {
    try {
      // Send message to content script to scroll to text on the main page
      const response = await chrome.runtime.sendMessage({
        action: 'scrollToText',
        data: {
          textFragment: rewrite.url_fragment,
          originalText: rewrite.original_text,
          rewrittenText: rewrite.rewritten_text,
          url: rewrite.source_url
        }
      });

      if (!response || !response.success) {
        console.error('Failed to scroll to text:', response?.error);
      }
    } catch (error) {
      console.error('Failed to scroll to text:', error);
    }
  };

  const handleDelete = () => {
    if (onDelete && confirm('Are you sure you want to delete this rewrite?')) {
      onDelete(rewrite.id);
    }
  };


  return (
    <Card className="h-full">
      <CardContent className="p-4 h-full flex flex-col">
        {/* Header with warning indicator */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className={cn(themeVariants.heading(), 'text-sm font-semibold')}>
              Rewrite Details
            </h3>
                {availabilityStatus === 'none' && (
                  <span
                    className="text-red-500 text-sm"
                    title="This text is no longer available on the current page"
                  >
                    ❌
                  </span>
                )}
                {availabilityStatus === 'original' && (
                  <span
                    className="text-yellow-500 text-sm"
                    title="Original text available (rewrite not applied)"
                  >
                    ⚠️
                  </span>
                )}
                {availabilityStatus === 'rewritten' && (
                  <span
                    className="text-green-500 text-sm"
                    title="Rewritten text is active on the page"
                  >
                    ✅
                  </span>
                )}
          </div>
          <div className="flex items-center gap-2">
            {/* Jump button - only show if text is available on current page */}
            {isTextAvailable && (
              <button
                onClick={handleJumpToText}
                className={cn(
                  'px-2 py-1 text-xs rounded-md transition-colors',
                  'bg-blue-100 text-blue-700 hover:bg-blue-200',
                  'dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50'
                )}
                title={`Jump to ${isRewrittenAvailable ? 'rewritten' : 'original'} text on the page`}
              >
                🔗 Jump
              </button>
            )}
            
            {/* More options dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMoreOptions(!showMoreOptions)}
                className={cn(
                  'px-2 py-1 text-xs rounded-md transition-colors',
                  'bg-gray-100 text-gray-700 hover:bg-gray-200',
                  'dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                )}
                title="More options"
              >
                ⋯
              </button>
              
              {showMoreOptions && (
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
                  <button
                    onClick={handleDelete}
                    className={cn(
                      'w-full px-3 py-2 text-xs text-left hover:bg-red-50 dark:hover:bg-red-900/20',
                      'text-red-600 dark:text-red-400 rounded-md'
                    )}
                  >
                    🗑️ Delete Rewrite
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Original Text */}
        <div className="flex-1 mb-3">
          <label className={cn(themeVariants.muted(), 'text-xs font-semibold mb-1 block')}>
            Original
          </label>
          <div className={cn(
            themeVariants.body(), 
            'text-sm p-3 rounded bg-gray-50 dark:bg-gray-900 overflow-auto max-h-32'
          )}>
            {rewrite.original_text}
          </div>
        </div>

        {/* Rewritten Text */}
        <div className="flex-1">
          <label className={cn(themeVariants.muted(), 'text-xs font-semibold mb-1 block')}>
            Rewritten
          </label>
          <div className={cn(
            themeVariants.body(), 
            'text-sm p-3 rounded bg-blue-50 dark:bg-blue-900/20 overflow-auto max-h-32'
          )}>
            {rewrite.rewritten_text}
          </div>
        </div>

        {/* Metadata Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Badge variant="primary">{getLanguageDisplayName(rewrite.language)}</Badge>
            <ReadabilityBadge score={rewrite.rewritten_readability_score} />
            <span className={cn(themeVariants.muted(), 'text-xs')}>
              {new Date(rewrite.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
