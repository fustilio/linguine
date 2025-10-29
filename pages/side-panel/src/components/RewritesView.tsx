import { useState, useEffect } from 'react';
import { useTextRewrites } from '@extension/api';
import { Card, CardContent, cn, themeVariants } from '@extension/ui';
import type { TextRewrite } from '@extension/api';
import { RewriteDetailView } from './RewriteDetailView';
import { RewritesList } from './RewritesList';
import { useQueryClient } from '@tanstack/react-query';

interface RewritesViewProps {
  currentUrl: string;
}

export const RewritesView = ({ currentUrl }: RewritesViewProps) => {
  const queryClient = useQueryClient();
  
  // Parse URL to get domain + path (ignore query params and fragments)
  const getUrlBase = (url: string) => {
    try {
      const parsed = new URL(url);
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      return url;
    }
  };

  // Use hook with sourceUrl filter matching domain + path
  const urlBase = getUrlBase(currentUrl);
  const { items: rewrites, deleteTextRewrite } = useTextRewrites({ 
    sourceUrl: urlBase
  });
  
  // Listen for rewrite accepted messages from content script
  useEffect(() => {
    const handleMessage = (
      message: { 
        action: string; 
        target?: string;
        data?: { rewrite?: TextRewrite; url?: string } 
      }
    ) => {
      // Only process messages explicitly targeted to sidepanel or with no target (for backward compatibility)
      if (message.target && message.target !== 'sidepanel') {
        return; // Message not for us
      }

      if (message.action === 'rewriteAccepted' && message.data) {
        const { rewrite, url } = message.data;
            // Check if this rewrite is for the current page
            if (rewrite && url) {
              const rewriteUrlBase = getUrlBase(url);
              if (rewriteUrlBase === urlBase) {
                // Invalidate queries to refresh the rewrites list
                queryClient.invalidateQueries({ queryKey: ['textRewrites'] });
              }
            }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [urlBase, queryClient]);

  // Selected rewrite state (default to most recent)
  const [selectedRewrite, setSelectedRewrite] = useState<TextRewrite | null>(null);
  
  // Text availability status for each rewrite
  const [textAvailabilityStatus, setTextAvailabilityStatus] = useState<Map<number, 'rewritten' | 'original' | 'none'>>(new Map());

  // Update selected when rewrites load
  useEffect(() => {
    if (rewrites.length > 0 && !selectedRewrite) {
      setSelectedRewrite(rewrites[0]);
    }
  }, [rewrites, selectedRewrite]);

  // Scan all rewrites for text availability when rewrites change
  useEffect(() => {
    if (rewrites.length > 0) {
      scanAllRewritesAvailability();
    }
  }, [rewrites]);

  const scanAllRewritesAvailability = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'scanAllRewritesAvailability',
        data: {
          rewrites: rewrites.map(rewrite => ({
            id: rewrite.id,
            originalText: rewrite.original_text,
            rewrittenText: rewrite.rewritten_text,
            url: rewrite.source_url
          }))
        }
      });

      if (response && response.success) {
        const statusMap = new Map<number, 'rewritten' | 'original' | 'none'>();
        response.data.forEach((status: { id: number; status: 'rewritten' | 'original' | 'none' }) => {
          statusMap.set(status.id, status.status);
        });
        setTextAvailabilityStatus(statusMap);
      }
    } catch (error) {
      console.error('Failed to scan rewrites availability:', error);
    }
  };

  const handleRescan = () => {
    scanAllRewritesAvailability();
  };

  // Handle delete rewrite
  const handleDeleteRewrite = (rewriteId: number) => {
    deleteTextRewrite.mutate(rewriteId);
    // Clear selection if the deleted rewrite was selected
    if (selectedRewrite?.id === rewriteId) {
      setSelectedRewrite(null);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 pt-4">
      {/* Detail View - Top Section */}
      <div className="flex-shrink-0 h-2/5">
        {selectedRewrite ? (
          <RewriteDetailView 
            rewrite={selectedRewrite} 
            onDelete={handleDeleteRewrite}
            availabilityStatus={textAvailabilityStatus.get(selectedRewrite.id)}
          />
        ) : (
          <Card className="h-full">
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className={cn(themeVariants.muted())}>No rewrites for this page</p>
                <p className={cn(themeVariants.muted(), 'text-sm mt-2')}>
                  Select text and rewrite it to see it here
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* List View - Bottom Section */}
      <div className="flex-1 min-h-0">
        <RewritesList 
          rewrites={rewrites}
          selectedId={selectedRewrite?.id}
          onSelectRewrite={setSelectedRewrite}
          onDelete={handleDeleteRewrite}
          textAvailabilityStatus={textAvailabilityStatus}
          onRescan={handleRescan}
        />
      </div>
    </div>
  );
};
