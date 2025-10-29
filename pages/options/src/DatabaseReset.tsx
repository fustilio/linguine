import React, { useState } from 'react';
import { resetEntireDatabase, resetTextRewritesOnly, resetVocabularyOnly } from '@extension/sqlite';
import { button, Modal, ModalHeader, ModalBody, ModalFooter, cn } from '@extension/ui';

export const DatabaseReset = () => {
  
  const [isResetting, setIsResetting] = useState(false);
  const [resetType, setResetType] = useState<'entire' | 'text-rewrites' | 'vocabulary'>('entire');
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleConfirmReset = async () => {
    setShowConfirmModal(false);
    setIsResetting(true);
    setResetResult(null);

    try {
      switch (resetType) {
        case 'entire':
          await resetEntireDatabase();
          setResetResult('✅ Entire database reset successfully! All tables have been recreated.');
          break;
        case 'text-rewrites':
          await resetTextRewritesOnly();
          setResetResult('✅ Text rewrites table reset successfully!');
          break;
        case 'vocabulary':
          await resetVocabularyOnly();
          setResetResult('✅ Vocabulary table reset successfully!');
          break;
      }
    } catch (error) {
      console.error('Error resetting database:', error);
      setResetResult('❌ Error resetting database. Check console for details.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetClick = () => {
    setShowConfirmModal(true);
  };

  const resetOptions = [
    { value: 'entire', label: 'Reset Entire Database', description: 'Drops and recreates all tables (vocabulary + text rewrites)' },
    { value: 'text-rewrites', label: 'Reset Text Rewrites Only', description: 'Drops and recreates only the text rewrites table' },
    { value: 'vocabulary', label: 'Reset Vocabulary Only', description: 'Drops and recreates only the vocabulary table' },
  ];

  return (
    <div className={cn('rounded-lg border p-4 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 mb-6')}>
      <h3 className={cn('mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100')}>Database Reset</h3>
      <p className={cn('text-sm text-gray-600 dark:text-gray-400 mb-4')}>
        <strong>Warning:</strong> This will permanently delete all data in the selected tables. This action cannot be undone.
      </p>

      <div className="space-y-4">
        <div>
          <label className={cn('block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2')}>Reset Type</label>
          <div className="space-y-2">
            {resetOptions.map((option) => (
              <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="resetType"
                  value={option.value}
                  checked={resetType === option.value}
                  onChange={(e) => setResetType(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{option.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleResetClick}
          disabled={isResetting}
          className={button({ 
            variant: 'danger', 
            disabled: isResetting 
          }) + ' w-full'}
        >
          {isResetting ? 'Resetting...' : 'Reset Database'}
        </button>

        {resetResult && (
          <div className={`text-sm p-3 rounded-md ${
            resetResult.startsWith('✅') 
              ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' 
              : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
          }`}>
            {resetResult}
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p><strong>Note:</strong> After resetting, you may need to refresh the page to see the changes take effect.</p>
      </div>

      {/* Confirmation Modal */}
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} size="md">
        <ModalHeader onClose={() => setShowConfirmModal(false)}>
          <h3 className="text-lg font-semibold">Confirm Database Reset</h3>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  This action cannot be undone
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  You are about to permanently delete all data in the{' '}
                  {resetType === 'entire' ? 'entire database' : 
                   resetType === 'text-rewrites' ? 'text rewrites table' : 
                   'vocabulary table'}. This will remove all your saved data and cannot be recovered.
                </p>
              </div>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Selected reset type:</strong> {resetOptions.find(opt => opt.value === resetType)?.label}
              </p>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowConfirmModal(false)}
              className={button({ variant: 'secondary' })}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmReset}
              className={button({ variant: 'danger' })}
            >
              Yes, Reset Database
            </button>
          </div>
        </ModalFooter>
      </Modal>
    </div>
  );
};
