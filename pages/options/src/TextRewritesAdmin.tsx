import React, { useState } from 'react';
import { useTextRewrites } from '@extension/api';
import { TextRewritesTestData } from './TextRewritesTestData';
import { TextRewritesDemo } from './TextRewritesDemo';
import { DatabaseReset } from './DatabaseReset';
import { TextRewriteDetailModal } from './TextRewriteDetailModal';
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
import type { TextRewrite } from '@extension/sqlite';
import { migrateLanguageCodes } from '@extension/api';

export const TextRewritesAdmin = () => {
  
  const [languageFilter, setLanguageFilter] = useState<string>('');
  const [readabilityRange, setReadabilityRange] = useState<{ min: number; max: number }>({ min: 0, max: 100 });
  const [recentDays, setRecentDays] = useState<number | undefined>(undefined);
  const [selectedRewrite, setSelectedRewrite] = useState<TextRewrite | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ updated: number; errors: number } | null>(null);

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
    deleteTextRewrite,
    bulkDelete,
    clearAllTextRewrites,
  } = useTextRewrites(filters);

  const totalPages = Math.ceil(totalItems / pageSize);

  const handleDeleteSelected = () => {
    if (selectedItems.size > 0) {
      bulkDelete.mutate();
    }
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all text rewrites? This action cannot be undone.')) {
      clearAllTextRewrites.mutate();
    }
  };

  const handleMigrateLanguageCodes = async () => {
    if (confirm('This will normalize language codes in your text rewrites. Continue?')) {
      setIsMigrating(true);
      setMigrationResult(null);
      
      try {
        const result = await migrateLanguageCodes();
        setMigrationResult(result);
        
        if (result.updated > 0) {
          // Refresh the data to show updated language labels
          window.location.reload();
        }
      } catch (error) {
        console.error('Migration failed:', error);
        setMigrationResult({ updated: 0, errors: 1 });
      } finally {
        setIsMigrating(false);
      }
    }
  };

  const handleViewDetails = (rewrite: TextRewrite) => {
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
        <h1 className={cn(themeVariants.heading(), 'text-2xl mb-2')}>Text Rewrites Explorer</h1>
        <p className={cn(themeVariants.muted())}>
          Manage your AI-rewritten text with readability scores and source links.
        </p>
      </div>

      {/* Database Reset */}
      <DatabaseReset />

      {/* Test Data Generator */}
      <TextRewritesTestData />

      {/* Live Demo */}
      <TextRewritesDemo />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={cn(themeVariants.muted(), 'block text-sm font-medium mb-1')}>Language</label>
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
              <label className={cn(themeVariants.muted(), 'block text-sm font-medium mb-1')}>Readability Range</label>
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
                <span className={cn(themeVariants.muted())}>-</span>
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
              <label className={cn(themeVariants.muted(), 'block text-sm font-medium mb-1')}>Recent Days</label>
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
      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSelectAll}
                className={button({ variant: 'secondary', size: 'sm' })}
              >
                {selectedItems.size === rewrites.length ? 'Deselect All' : 'Select All'}
              </button>
              
              {selectedItems.size > 0 && (
                <span className={cn(themeVariants.muted(), 'text-sm')}>
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
                disabled={clearAllTextRewrites.isPending}
                className={button({ variant: 'danger', size: 'sm', disabled: clearAllTextRewrites.isPending })}
              >
                {clearAllTextRewrites.isPending ? 'Clearing...' : 'Clear All'}
              </button>
              
              <button
                onClick={handleMigrateLanguageCodes}
                disabled={isMigrating}
                className={button({ variant: 'secondary', size: 'sm', disabled: isMigrating })}
              >
                {isMigrating ? 'Migrating...' : 'Fix Language Labels'}
              </button>
            </div>
            
            {migrationResult && (
              <div className={cn(themeVariants.card(), 'mt-4 p-3')}>
                <p className={cn(themeVariants.body(), 'text-sm')}>
                  Migration completed: {migrationResult.updated} language codes updated, {migrationResult.errors} errors
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <StatsGrid columns={4}>
        <StatsCard
          title="Total Rewrites"
          value={totalItems}
        />
        <StatsCard
          title="Easy Reads"
          value={rewrites.filter(r => r.rewritten_readability_score >= 60).length}
        />
        <StatsCard
          title="Moderate"
          value={rewrites.filter(r => r.rewritten_readability_score >= 30 && r.rewritten_readability_score < 60).length}
        />
        <StatsCard
          title="Difficult"
          value={rewrites.filter(r => r.rewritten_readability_score < 30).length}
        />
      </StatsGrid>

      {/* Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <tr>
              <TableHeaderCell>
                <input
                  type="checkbox"
                  checked={selectedItems.size === rewrites.length && rewrites.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:focus:ring-blue-400"
                />
              </TableHeaderCell>
              <TableHeaderCell>Original Text</TableHeaderCell>
              <TableHeaderCell>Rewritten Text</TableHeaderCell>
              <TableHeaderCell>Language</TableHeaderCell>
              <TableHeaderCell>Original Score</TableHeaderCell>
              <TableHeaderCell>Rewritten Score</TableHeaderCell>
              <TableHeaderCell>Source</TableHeaderCell>
              <TableHeaderCell>Created</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </tr>
          </TableHeader>
          <TableBody>
            {rewrites.map((rewrite) => {
              const isSelected = selectedItems.has(rewrite.id);
              
              return (
                <TableRow key={rewrite.id} isSelected={isSelected}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleItemSelected(rewrite.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:focus:ring-blue-400"
                    />
                  </TableCell>
                  
                  <TableCell>
                    <div className="max-w-xs">
                      <p className={cn(themeVariants.body(), 'text-sm truncate')} title={rewrite.original_text}>
                        {rewrite.original_text}
                      </p>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="max-w-xs">
                      <p className={cn(themeVariants.body(), 'text-sm truncate')} title={rewrite.rewritten_text}>
                        {rewrite.rewritten_text}
                      </p>
                    </div>
                  </TableCell>
                  
                  <TableCell className="whitespace-nowrap">
                    <Badge variant="primary">
                      {getLanguageDisplayName(rewrite.language)}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={cn(themeVariants.body(), 'text-sm font-medium mr-2')}>
                        {rewrite.original_readability_score.toFixed(1)}
                      </div>
                      <ReadabilityBadge score={rewrite.original_readability_score} />
                    </div>
                  </TableCell>
                  
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={cn(themeVariants.body(), 'text-sm font-medium mr-2')}>
                        {rewrite.rewritten_readability_score.toFixed(1)}
                      </div>
                      <ReadabilityBadge score={rewrite.rewritten_readability_score} />
                    </div>
                  </TableCell>
                  
                  <TableCell className="whitespace-nowrap">
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
                  
                  <TableCell className="whitespace-nowrap text-sm">
                    <span className={cn(themeVariants.muted())}>
                      {new Date(rewrite.created_at).toLocaleDateString()}
                    </span>
                  </TableCell>
                  
                  <TableCell className="whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDetails(rewrite)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => deleteTextRewrite.mutate(rewrite.id)}
                        disabled={deleteTextRewrite.isPending}
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
          totalItems={totalItems}
          pageSize={pageSize}
        />
      </Card>

      {rewrites.length === 0 && (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <div className={cn(themeVariants.muted(), 'text-lg mb-2')}>No text rewrites found</div>
              <div className={cn(themeVariants.muted(), 'text-sm')}>
                Start highlighting and rewriting text on web pages to see your rewrites here.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Modal */}
      <TextRewriteDetailModal
        rewrite={selectedRewrite}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
      />
    </div>
  );
};