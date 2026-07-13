// src/components/TopicSelector.tsx
import { Check } from 'lucide-react';

interface TopicSelectorProps {
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}

export default function TopicSelector({ allTags, selectedTags, onToggleTag }: TopicSelectorProps) {
  if (allTags.length === 0) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl mb-6">
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        Filter by Topics ({selectedTags.length} selected)
      </h3>
      <div className="flex flex-wrap gap-2">
        {allTags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => onToggleTag(tag)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                isSelected
                  ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400 shadow-md shadow-indigo-500/5'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              {isSelected && <Check size={14} />}
              #{tag}
            </button>
          );
        })}
      </div>
      {selectedTags.length > 0 && (
        <p className="text-xs text-zinc-500 mt-3">
          Leaving tags unselected includes all cards, or click tags to mix specific topics.
        </p>
      )}
    </div>
  );
}