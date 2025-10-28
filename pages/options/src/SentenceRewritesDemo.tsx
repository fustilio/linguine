import React, { useState } from 'react';
import { addSentenceRewrite } from '@extension/api';
import { themeVariants, button, input, select, cn } from '@extension/ui';

export const SentenceRewritesDemo = () => {
  
  const [originalText, setOriginalText] = useState('');
  const [rewrittenText, setRewrittenText] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<string | null>(null);

  const handleSaveRewrite = async () => {
    if (!originalText.trim() || !rewrittenText.trim()) {
      setSaveResult('Please enter both original and rewritten text.');
      return;
    }

    setIsSaving(true);
    setSaveResult(null);

    try {
      const rewriterSettings = JSON.stringify({
        sharedContext: "Demo rewrite for testing purposes",
        tone: "more-casual",
        format: "plain-text",
        length: "shorter",
      });

      await addSentenceRewrite({
        original_text: originalText.trim(),
        rewritten_text: rewrittenText.trim(),
        language: language,
        rewriter_settings: rewriterSettings,
        source_url: 'https://demo.example.com/test-page',
        url_fragment: '#:~:text=demo%20text',
      });

      setSaveResult('✅ Sentence rewrite saved successfully!');
      setOriginalText('');
      setRewrittenText('');
    } catch (error) {
      console.error('Error saving rewrite:', error);
      setSaveResult('❌ Error saving sentence rewrite. Check console for details.');
    } finally {
      setIsSaving(false);
    }
  };

  const exampleTexts = [
    {
      original: "The implementation of sophisticated machine learning algorithms necessitates comprehensive understanding of statistical methodologies and computational complexity theory.",
      rewritten: "Using advanced computer learning programs requires deep knowledge of math and computer science.",
      language: "en-US"
    },
    {
      original: "La implementación de algoritmos sofisticados de aprendizaje automático requiere una comprensión integral de metodologías estadísticas.",
      rewritten: "Usar programas avanzados de computadora requiere conocimiento profundo de matemáticas.",
      language: "es-ES"
    },
    {
      original: "L'implémentation d'algorithmes sophistiqués d'apprentissage automatique nécessite une compréhension complète des méthodologies statistiques.",
      rewritten: "Utiliser des programmes informatiques avancés nécessite une connaissance approfondie des mathématiques.",
      language: "fr-FR"
    }
  ];

  const loadExample = (example: typeof exampleTexts[0]) => {
    setOriginalText(example.original);
    setRewrittenText(example.rewritten);
    setLanguage(example.language);
  };

  return (
    <div className={cn(themeVariants.card(), 'mb-6')}>
      <h3 className={cn(themeVariants.subheading(), 'mb-4')}>Live Demo</h3>
      <p className={cn(themeVariants.muted(), 'text-sm mb-4')}>
        Test the sentence rewrites functionality by manually adding a rewrite record.
      </p>

      {/* Example Texts */}
      <div className="mb-4">
        <h4 className={cn(themeVariants.muted(), 'text-sm font-medium mb-2')}>Quick Examples</h4>
        <div className="flex flex-wrap gap-2">
          {exampleTexts.map((example, index) => (
            <button
              key={index}
              onClick={() => loadExample(example)}
              className={cn(themeVariants.badge({ variant: 'primary' }), 'hover:opacity-80')}
            >
              {example.language === 'en-US' ? 'English' : 
               example.language === 'es-ES' ? 'Spanish' : 'French'}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label className={cn(themeVariants.muted(), 'block text-sm font-medium mb-1')}>Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className={select()}
          >
            <option value="en-US">English</option>
            <option value="es-ES">Spanish</option>
            <option value="fr-FR">French</option>
            <option value="de-DE">German</option>
            <option value="ja-JP">Japanese</option>
            <option value="ko-KR">Korean</option>
          </select>
        </div>

        <div>
          <label className={cn(themeVariants.muted(), 'block text-sm font-medium mb-1')}>Original Text</label>
          <textarea
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            placeholder="Enter the original complex text here..."
            className={cn(input(), 'h-20 resize-none')}
          />
        </div>

        <div>
          <label className={cn(themeVariants.muted(), 'block text-sm font-medium mb-1')}>Rewritten Text</label>
          <textarea
            value={rewrittenText}
            onChange={(e) => setRewrittenText(e.target.value)}
            placeholder="Enter the simplified/rewritten text here..."
            className={cn(input(), 'h-20 resize-none')}
          />
        </div>

        <button
          onClick={handleSaveRewrite}
          disabled={isSaving || !originalText.trim() || !rewrittenText.trim()}
          className={button({ variant: 'primary', disabled: isSaving || !originalText.trim() || !rewrittenText.trim() }) + ' w-full'}
        >
          {isSaving ? 'Saving...' : 'Save Rewrite'}
        </button>

        {saveResult && (
          <div className={`text-sm p-3 rounded-md ${
            saveResult.startsWith('✅') 
              ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' 
              : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
          }`}>
            {saveResult}
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p><strong>Note:</strong> This demo saves rewrites to your local database. You can view them in the table above after saving.</p>
      </div>
    </div>
  );
};
