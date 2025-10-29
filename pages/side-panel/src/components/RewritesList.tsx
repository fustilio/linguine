import { Card, CardContent, CardHeader, CardTitle, Badge, ReadabilityBadge, cn, themeVariants } from '@extension/ui';
import { getLanguageDisplayName } from '@extension/shared';
import type { TextRewrite } from '@extension/api';

interface RewritesListProps {
  rewrites: TextRewrite[];
  selectedId?: number;
  onSelectRewrite: (rewrite: TextRewrite) => void;
  onDelete?: (rewriteId: number) => void;
  textAvailabilityStatus: Map<number, 'rewritten' | 'original' | 'none'>;
  onRescan?: () => void;
}

export const RewritesList = ({ rewrites, selectedId, onSelectRewrite, onDelete, textAvailabilityStatus, onRescan }: RewritesListProps) => {
  const handleJumpToText = async (rewrite: TextRewrite, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the row selection
    
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

  const handleDelete = (rewriteId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the row selection
    if (onDelete && confirm('Are you sure you want to delete this rewrite?')) {
      onDelete(rewriteId);
    }
  };

  if (rewrites.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className={cn(themeVariants.muted())}>No rewrites found for this page</p>
            <p className={cn(themeVariants.muted(), 'text-sm mt-2')}>
              Select text and rewrite it to see it here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Rewrites ({rewrites.length})</CardTitle>
          {onRescan && (
            <button
              onClick={onRescan}
              className={cn(
                'px-2 py-1 text-xs rounded-md transition-colors',
                'bg-gray-100 text-gray-700 hover:bg-gray-200',
                'dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              )}
              title="Rescan page for text availability"
            >
              🔄 Rescan
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-0">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {rewrites.map((rewrite) => (
            <div
              key={rewrite.id}
              className={cn(
                'p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800',
                selectedId === rewrite.id && 'bg-blue-50 dark:bg-blue-900/20'
              )}
            >
              {/* Main content row */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <button
                  onClick={() => onSelectRewrite(rewrite)}
                  className="flex-1 text-left flex items-start gap-2"
                >
                  <p className={cn(themeVariants.body(), 'text-sm truncate')}>
                    {rewrite.original_text}
                  </p>
                  {/* Warning indicator for missing text */}
                  {(() => {
                    const availabilityStatus = textAvailabilityStatus.get(rewrite.id);
                    
                    if (availabilityStatus === 'none') {
                      return (
                        <span
                          className="text-red-500 text-xs flex-shrink-0"
                          title="This text is no longer available on the current page"
                        >
                          ❌
                        </span>
                      );
                    } else if (availabilityStatus === 'original') {
                      return (
                        <span
                          className="text-yellow-500 text-xs flex-shrink-0"
                          title="Original text available (rewrite not applied)"
                        >
                          ⚠️
                        </span>
                      );
                    } else if (availabilityStatus === 'rewritten') {
                      return (
                        <span
                          className="text-green-500 text-xs flex-shrink-0"
                          title="Rewritten text is active on the page"
                        >
                          ✅
                        </span>
                      );
                    }
                    
                    return (
                      <span 
                        className="text-gray-400 text-xs flex-shrink-0" 
                        title="Checking text availability..."
                      >
                        ⏳
                      </span>
                    );
                  })()}
                </button>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <ReadabilityBadge score={rewrite.rewritten_readability_score} />
                  {/* Jump button - only show if text is available */}
                  {(() => {
                    const availabilityStatus = textAvailabilityStatus.get(rewrite.id);
                    const isTextAvailable = availabilityStatus !== 'none';
                    const isRewrittenAvailable = availabilityStatus === 'rewritten';
                    
                    if (isTextAvailable) {
                      return (
                        <button
                          onClick={(e) => handleJumpToText(rewrite, e)}
                          className={cn(
                            'px-2 py-1 text-xs rounded-md transition-colors',
                            'bg-blue-100 text-blue-700 hover:bg-blue-200',
                            'dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50'
                          )}
                          title={`Jump to ${isRewrittenAvailable ? 'rewritten' : 'original'} text on the page`}
                        >
                          🔗 Jump
                        </button>
                      );
                    }
                    return null;
                  })()}
                  {onDelete && (
                    <button
                      onClick={(e) => handleDelete(rewrite.id, e)}
                      className={cn(
                        'px-2 py-1 text-xs rounded-md transition-colors',
                        'bg-red-100 text-red-700 hover:bg-red-200',
                        'dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50'
                      )}
                      title="Delete this rewrite"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
              
              {/* Metadata row */}
              <div className="flex items-center gap-2">
                <Badge variant="default">
                  {getLanguageDisplayName(rewrite.language)}
                </Badge>
                <span className={cn(themeVariants.muted(), 'text-xs')}>
                  {new Date(rewrite.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
