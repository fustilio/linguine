import { cn } from '@/lib/utils';
import type { VocabularyItem } from '@extension/sqlite';

interface VocabularyStatsProps {
  items: VocabularyItem[];
  isLight: boolean;
}

export const VocabularyStats = ({ items, isLight }: VocabularyStatsProps) => {
  // Calculate statistics
  const total = items.length;
  const byLanguage = new Map<string, number>();
  const byLevel = {
    struggling: 0, // 1-2
    learning: 0, // 3
    mastered: 0, // 4-5
  };

  for (const item of items) {
    byLanguage.set(item.language, (byLanguage.get(item.language) || 0) + 1);

    if (item.knowledge_level <= 2) {
      byLevel.struggling++;
    } else if (item.knowledge_level === 3) {
      byLevel.learning++;
    } else {
      byLevel.mastered++;
    }
  }

  const languages = Array.from(byLanguage.entries()).sort((a, b) => b[1] - a[1]);

  if (total === 0) {
    return (
      <div className={cn('rounded-lg border p-4', isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800')}>
        <p className={cn('text-sm', isLight ? 'text-gray-500' : 'text-gray-400')}>No vocabulary data</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* Overall Stats */}
      <div className={cn('rounded-lg border p-4', isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800')}>
        <h4 className={cn('mb-2 text-xs font-semibold uppercase tracking-wide', isLight ? 'text-gray-600' : 'text-gray-400')}>
          Total Words
        </h4>
        <p className={cn('text-2xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>{total}</p>
      </div>

      {/* Knowledge Level Breakdown */}
      <div className={cn('rounded-lg border p-4', isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800')}>
        <h4 className={cn('mb-2 text-xs font-semibold uppercase tracking-wide', isLight ? 'text-gray-600' : 'text-gray-400')}>
          Mastery
        </h4>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className={cn('flex items-center gap-2', isLight ? 'text-gray-700' : 'text-gray-300')}>
              <span className="block h-2 w-2 rounded-full bg-green-500"></span>
              Mastered
            </span>
            <span className={cn('font-medium', isLight ? 'text-gray-900' : 'text-gray-100')}>{byLevel.mastered}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className={cn('flex items-center gap-2', isLight ? 'text-gray-700' : 'text-gray-300')}>
              <span className="block h-2 w-2 rounded-full bg-yellow-500"></span>
              Learning
            </span>
            <span className={cn('font-medium', isLight ? 'text-gray-900' : 'text-gray-100')}>{byLevel.learning}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className={cn('flex items-center gap-2', isLight ? 'text-gray-700' : 'text-gray-300')}>
              <span className="block h-2 w-2 rounded-full bg-red-500"></span>
              Struggling
            </span>
            <span className={cn('font-medium', isLight ? 'text-gray-900' : 'text-gray-100')}>{byLevel.struggling}</span>
          </div>
        </div>
      </div>

      {/* Top Languages */}
      <div className={cn('rounded-lg border p-4', isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800')}>
        <h4 className={cn('mb-2 text-xs font-semibold uppercase tracking-wide', isLight ? 'text-gray-600' : 'text-gray-400')}>
          Top Languages
        </h4>
        <div className="space-y-1">
          {languages.slice(0, 3).map(([lang, count]) => {
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={lang} className="flex items-center justify-between text-sm">
                <span className={cn('font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>{lang}</span>
                <span className={cn('font-medium', isLight ? 'text-gray-900' : 'text-gray-100')}>
                  {count} ({percentage}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

