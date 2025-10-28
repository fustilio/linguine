import type { VocabularyItem } from '@extension/sqlite';

export interface VocabularyAnalysisResult {
  text: string;
  knowledgeLevel: number;
  isKnown: boolean;
  matchType: 'exact' | 'partial' | 'unknown';
}

export interface TextEvaluationResult {
  totalWords: number;
  knownWords: number;
  unknownWords: number;
  strugglingWords: number;
  masteredWords: number;
  knownPercentage: number;
  breakdown: VocabularyAnalysisResult[];
}

export interface CEFRLevel {
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'Unknown';
  confidence: 'High' | 'Medium' | 'Low';
  explanation: string;
}

export interface AIResponse {
  text: string;
  error?: string;
}
