import React, { useState } from 'react';
import { useSentenceRewrites } from '@extension/api';
import { SentenceRewritesTestData } from './SentenceRewritesTestData';
import { SentenceRewritesDemo } from './SentenceRewritesDemo';
import { DatabaseReset } from './DatabaseReset';
import { SentenceRewriteDetailModal } from './SentenceRewriteDetailModal';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableCell, 
  TableHeaderCell,
  StatsCard,
  StatsGrid,
  Pagination,
  Badge,
  ReadabilityBadge,
  button, 
  select, 
  input,
  getLanguageDisplayName,
  themeVariants,
  cn
} from '@extension/ui';
import type { SentenceRewrite } from '@extension/sqlite';

export const SentenceRewritesAdmin = () => {
  
  const [languageFilter, setLanguageFilter] = useState<string>('');
  const [readabilityRange, setReadabilityRange] = useState<{ min: number; max: number }>({ min: 0, max: 100 });
  const [recentDays, setRecentDays] = useState<number | undefined>(undefined);
  const [selectedRewrite, setSelectedRewrite] = useState<SentenceRewrite | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const filters = {
    language: languageFilter || undefined,
    minReadability: readabilityRange.min,
    maxReadability: readabilityRange.max,
    recentDays: recentDays,
  };

  const {
    items: rewrites,
    totalItems,
    currentPage,
    pageSize,
    goToPage,
    selectedItems,
    toggleItemSelected,
    toggleSelectAll,
    deleteSentenceRewrite,
    bulkDelete,
    clearAllSentenceRewrites,
  } = useSentenceRewrites(filters);

  const totalPages = Math.ceil(totalItems / pageSize);

  const handleDeleteSelected = () => {
    if (selectedItems.size > 0) {
      bulkDelete.mutate();
    }
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all sentence rewrites? This action cannot be undone.')) {
      clearAllSentenceRewrites.mutate();
    }
  };

  const handleViewDetails = (rewrite: SentenceRewrite) => {
    setSelectedRewrite(rewrite);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedRewrite(null);
  };

  return (
    <div className={cn(themeVariants.container(), 'p-6 space-y-6')}>
      <div>
        <h1 className={cn(themeVariants.heading(), 'text-2xl mb-2')}>Sentence Rewrites Explorer</h1>
        <p className={cn(themeVariants.muted())}>
          Manage your AI-rewritten sentences with readability scores and source links.
        </p>
      </div>

      {/* Database Reset */}
      <DatabaseReset />

      {/* Test Data Generator */}
      <SentenceRewritesTestData />

      {/* Live Demo */}
      <SentenceRewritesDemo />

      {/* Filters */}
      <Card isLight={isLight}>
        <CardHeader isLight={isLight}>
          <CardTitle isLight={isLight}>Filters</CardTitle>
        </CardHeader>
        <CardContent isLight={isLight}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={themeVariants.muted({ theme }) + ' block text-sm font-medium mb-1'}>Language</label>
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className={select()}
              >
                <option value="">All Languages</option>
                <option value="en-US">English</option>
                <option value="es-ES">Spanish</option>
                <option value="fr-FR">French</option>
                <option value="de-DE">German</option>
                <option value="ja-JP">Japanese</option>
                <option value="ko-KR">Korean</option>
              </select>
            </div>

            <div>
              <label className={themeVariants.muted({ theme }) + ' block text-sm font-medium mb-1'}>Readability Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={readabilityRange.min}
                  onChange={(e) => setReadabilityRange(prev => ({ ...prev, min: parseInt(e.target.value) || 0 }))}
                  className={input() + ' w-20'}
                  placeholder="Min"
                />
                <span className={themeVariants.muted({ theme })}>-</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={readabilityRange.max}
                  onChange={(e) => setReadabilityRange(prev => ({ ...prev, max: parseInt(e.target.value) || 100 }))}
                  className={input() + ' w-20'}
                  placeholder="Max"
                />
              </div>
            </div>

            <div>
              <label className={themeVariants.muted({ theme }) + ' block text-sm font-medium mb-1'}>Recent Days</label>
              <select
                value={recentDays || ''}
                onChange={(e) => setRecentDays(e.target.value ? parseInt(e.target.value) : undefined)}
                className={select()}
              >
                <option value="">All Time</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      <Card isLight={isLight}>
        <CardContent isLight={isLight}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSelectAll}
                className={button({ variant: 'secondary', size: 'sm' })}
              >
                {selectedItems.size === rewrites.length ? 'Deselect All' : 'Select All'}
              </button>
              
              {selectedItems.size > 0 && (
                <span className={themeVariants.muted({ theme }) + ' text-sm'}>
                  {selectedItems.size} selected
                </span>
              )}
            </div>

            <div className="flex gap-2">
              {selectedItems.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  disabled={bulkDelete.isPending}
                  className={button({ variant: 'danger', size: 'sm', disabled: bulkDelete.isPending })}
                >
                  {bulkDelete.isPending ? 'Deleting...' : `Delete Selected (${selectedItems.size})`}
                </button>
              )}
              
              <button
                onClick={handleClearAll}
                disabled={clearAllSentenceRewrites.isPending}
                className={button({ variant: 'danger', size: 'sm', disabled: clearAllSentenceRewrites.isPending })}
              >
                {clearAllSentenceRewrites.isPending ? 'Clearing...' : 'Clear All'}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <StatsGrid columns={4}>
        <StatsCard
          title="Total Rewrites"
          value={totalItems}
          isLight={isLight}
        />
        <StatsCard
          title="Easy Reads"
          value={rewrites.filter(r => r.rewritten_readability_score >= 60).length}
          isLight={isLight}
        />
        <StatsCard
          title="Moderate"
          value={rewrites.filter(r => r.rewritten_readability_score >= 30 && r.rewritten_readability_score < 60).length}
          isLight={isLight}
        />
        <StatsCard
          title="Difficult"
          value={rewrites.filter(r => r.rewritten_readability_score < 30).length}
          isLight={isLight}
        />
      </StatsGrid>

      {/* Table */}
      <Card isLight={isLight} className="overflow-hidden">
        <Table isLight={isLight}>
          <TableHeader isLight={isLight}>
            <tr>
              <TableHeaderCell isLight={isLight}>
                <input
                  type="checkbox"
                  checked={selectedItems.size === rewrites.length && rewrites.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:focus:ring-blue-400"
                />
              </TableHeaderCell>
              <TableHeaderCell isLight={isLight}>Original Text</TableHeaderCell>
              <TableHeaderCell isLight={isLight}>Rewritten Text</TableHeaderCell>
              <TableHeaderCell isLight={isLight}>Language</TableHeaderCell>
              <TableHeaderCell isLight={isLight}>Original Score</TableHeaderCell>
              <TableHeaderCell isLight={isLight}>Rewritten Score</TableHeaderCell>
              <TableHeaderCell isLight={isLight}>Source</TableHeaderCell>
              <TableHeaderCell isLight={isLight}>Created</TableHeaderCell>
              <TableHeaderCell isLight={isLight}>Actions</TableHeaderCell>
            </tr>
          </TableHeader>
          <TableBody isLight={isLight}>
            {rewrites.map((rewrite) => {
              const isSelected = selectedItems.has(rewrite.id);
              
              return (
                <TableRow key={rewrite.id} isLight={isLight} isSelected={isSelected}>
                  <TableCell isLight={isLight}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleItemSelected(rewrite.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:focus:ring-blue-400"
                    />
                  </TableCell>
                  
                  <TableCell isLight={isLight}>
                    <div className="max-w-xs">
                      <p className={themeVariants.body({ theme }) + ' text-sm truncate'} title={rewrite.original_text}>
                        {rewrite.original_text}
                      </p>
                    </div>
                  </TableCell>
                  
                  <TableCell isLight={isLight}>
                    <div className="max-w-xs">
                      <p className={themeVariants.body({ theme }) + ' text-sm truncate'} title={rewrite.rewritten_text}>
                        {rewrite.rewritten_text}
                      </p>
                    </div>
                  </TableCell>
                  
                  <TableCell isLight={isLight} className="whitespace-nowrap">
                    <Badge variant="primary">
                      {getLanguageDisplayName(rewrite.language)}
                    </Badge>
                  </TableCell>
                  
                  <TableCell isLight={isLight} className="whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={themeVariants.body({ theme }) + ' text-sm font-medium mr-2'}>
                        {rewrite.original_readability_score.toFixed(1)}
                      </div>
                      <ReadabilityBadge score={rewrite.original_readability_score} isLight={isLight} />
                    </div>
                  </TableCell>
                  
                  <TableCell isLight={isLight} className="whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={themeVariants.body({ theme }) + ' text-sm font-medium mr-2'}>
                        {rewrite.rewritten_readability_score.toFixed(1)}
                      </div>
                      <ReadabilityBadge score={rewrite.rewritten_readability_score} isLight={isLight} />
                    </div>
                  </TableCell>
                  
                  <TableCell isLight={isLight} className="whitespace-nowrap">
                    <a
                      href={rewrite.source_url + (rewrite.url_fragment || '')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 truncate max-w-xs block"
                      title={rewrite.source_url}
                    >
                      {new URL(rewrite.source_url).hostname}
                    </a>
                  </TableCell>
                  
                  <TableCell isLight={isLight} className="whitespace-nowrap text-sm">
                    <span className={themeVariants.muted({ theme })}>
                      {new Date(rewrite.created_at).toLocaleDateString()}
                    </span>
                  </TableCell>
                  
                  <TableCell isLight={isLight} className="whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDetails(rewrite)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => deleteSentenceRewrite.mutate(rewrite.id)}
                        disabled={deleteSentenceRewrite.isPending}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          isLight={isLight}
          totalItems={totalItems}
          pageSize={pageSize}
        />
      </Card>

      {rewrites.length === 0 && (
        <Card isLight={isLight}>
          <CardContent isLight={isLight}>
            <div className="text-center py-12">
              <div className={themeVariants.muted({ theme }) + ' text-lg mb-2'}>No sentence rewrites found</div>
              <div className={themeVariants.muted({ theme }) + ' text-sm'}>
                Start highlighting and rewriting text on web pages to see your rewrites here.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Modal */}
      <SentenceRewriteDetailModal
        rewrite={selectedRewrite}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
      />
    </div>
  );
};