import React, { useState } from 'react';
import { addSentenceRewrite } from '@extension/sqlite';
import { themeVariants, button, cn } from '@extension/ui';

export const SentenceRewritesTestData = () => {
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);

  const testData = [
    {
      original_text: "The implementation of sophisticated machine learning algorithms necessitates comprehensive understanding of statistical methodologies and computational complexity theory.",
      rewritten_text: "Using advanced computer learning programs requires deep knowledge of math and computer science.",
      language: "en-US",
      source_url: "https://example.com/research-paper",
      url_fragment: "#:~:text=implementation%20of%20sophisticated",
    },
    {
      original_text: "La implementación de algoritmos sofisticados de aprendizaje automático requiere una comprensión integral de metodologías estadísticas.",
      rewritten_text: "Usar programas avanzados de computadora requiere conocimiento profundo de matemáticas.",
      language: "es-ES",
      source_url: "https://ejemplo.com/articulo-investigacion",
      url_fragment: "#:~:text=implementación%20de%20algoritmos",
    },
    {
      original_text: "L'implémentation d'algorithmes sophistiqués d'apprentissage automatique nécessite une compréhension complète des méthodologies statistiques.",
      rewritten_text: "Utiliser des programmes informatiques avancés nécessite une connaissance approfondie des mathématiques.",
      language: "fr-FR",
      source_url: "https://exemple.com/article-recherche",
      url_fragment: "#:~:text=implémentation%20d'algorithmes",
    },
    {
      original_text: "Die Implementierung ausgeklügelter maschineller Lernalgorithmen erfordert ein umfassendes Verständnis statistischer Methodologien.",
      rewritten_text: "Die Verwendung fortgeschrittener Computerprogramme erfordert tiefes Wissen in Mathematik.",
      language: "de-DE",
      source_url: "https://beispiel.com/forschungsartikel",
      url_fragment: "#:~:text=Implementierung%20ausgeklügelter",
    },
    {
      original_text: "高度な機械学習アルゴリズムの実装には、統計的手法と計算複雑性理論の包括的な理解が必要です。",
      rewritten_text: "高度なコンピュータ学習プログラムを使用するには、数学とコンピュータサイエンスの深い知識が必要です。",
      language: "ja-JP",
      source_url: "https://example.jp/research-paper",
      url_fragment: "#:~:text=高度な機械学習",
    },
    {
      original_text: "정교한 머신러닝 알고리즘의 구현은 통계적 방법론과 계산 복잡성 이론에 대한 포괄적인 이해를 필요로 합니다.",
      rewritten_text: "고급 컴퓨터 학습 프로그램을 사용하려면 수학과 컴퓨터 과학에 대한 깊은 지식이 필요합니다.",
      language: "ko-KR",
      source_url: "https://example.kr/research-paper",
      url_fragment: "#:~:text=정교한%20머신러닝",
    },
    {
      original_text: "The quantum entanglement phenomenon demonstrates non-local correlations between particles that transcend classical physics boundaries.",
      rewritten_text: "Quantum entanglement shows how particles can be connected in ways that classical physics cannot explain.",
      language: "en-US",
      source_url: "https://physics-journal.com/quantum-mechanics",
      url_fragment: "#:~:text=quantum%20entanglement%20phenomenon",
    },
    {
      original_text: "El fenómeno de entrelazamiento cuántico demuestra correlaciones no locales entre partículas que trascienden los límites de la física clásica.",
      rewritten_text: "El entrelazamiento cuántico muestra cómo las partículas pueden estar conectadas de maneras que la física clásica no puede explicar.",
      language: "es-ES",
      source_url: "https://revista-fisica.com/mecanica-cuantica",
      url_fragment: "#:~:text=fenómeno%20de%20entrelazamiento",
    },
    {
      original_text: "The intricate web of interdependencies within complex ecosystems necessitates holistic approaches to environmental conservation strategies.",
      rewritten_text: "The complex connections in nature require comprehensive approaches to protecting the environment.",
      language: "en-US",
      source_url: "https://ecology-review.com/ecosystem-dynamics",
      url_fragment: "#:~:text=intricate%20web%20of%20interdependencies",
    },
    {
      original_text: "Die komplexen Wechselwirkungen innerhalb von Ökosystemen erfordern ganzheitliche Ansätze für Umweltschutzstrategien.",
      rewritten_text: "Die komplexen Verbindungen in der Natur erfordern umfassende Ansätze zum Schutz der Umwelt.",
      language: "de-DE",
      source_url: "https://oekologie-review.de/oekosystem-dynamik",
      url_fragment: "#:~:text=komplexen%20Wechselwirkungen",
    },
  ];

  const generateTestData = async () => {
    setIsGenerating(true);
    setGeneratedCount(0);

    try {
      for (let i = 0; i < testData.length; i++) {
        const item = testData[i];
        const rewriterSettings = JSON.stringify({
          sharedContext: "Use simpler vocabulary so I can understand this text.",
          tone: "more-casual",
          format: "plain-text",
          length: "shorter",
        });

        await addSentenceRewrite({
          original_text: item.original_text,
          rewritten_text: item.rewritten_text,
          language: item.language,
          rewriter_settings: rewriterSettings,
          source_url: item.source_url,
          url_fragment: item.url_fragment,
        });

        setGeneratedCount(i + 1);
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error generating test data:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={cn(themeVariants.card(), 'mb-6')}>
      <h3 className={cn(themeVariants.subheading(), 'mb-4')}>Test Data Generator</h3>
      <p className={cn(themeVariants.muted(), 'text-sm mb-4')}>
        Generate sample sentence rewrites to test the functionality. This will create {testData.length} example rewrites across different languages.
      </p>
      
      <div className="flex items-center gap-4">
        <button
          onClick={generateTestData}
          disabled={isGenerating}
          className={button({ variant: 'primary', disabled: isGenerating })}
        >
          {isGenerating ? `Generating... (${generatedCount}/${testData.length})` : 'Generate Test Data'}
        </button>
        
        {generatedCount > 0 && (
          <div className={cn(themeVariants.muted(), 'text-sm')}>
            Generated {generatedCount} of {testData.length} test rewrites
          </div>
        )}
      </div>

      {isGenerating && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${(generatedCount / testData.length) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p><strong>Languages included:</strong> English, Spanish, French, German, Japanese, Korean</p>
        <p><strong>Content types:</strong> Technical, Scientific, Academic</p>
        <p><strong>Readability range:</strong> Various difficulty levels to test filtering</p>
      </div>
    </div>
  );
};
