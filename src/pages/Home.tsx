// src/pages/Home.tsx
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Flashcard } from '../db';
import { Layers, Play, Inbox } from 'lucide-react';
import TopicSelector from '../components/TopicSelector';

interface HomeProps {
  onStudy: (filteredCards: Flashcard[]) => void;
}

export default function Home({ onStudy }: HomeProps) {
  const cards = useLiveQuery(() => db.cards.toArray());
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  if (cards === undefined) {
    return <div className="text-zinc-400 text-center mt-10">Loading deck...</div>;
  }

  // Extract all unique tags across all existing cards
  const allTags = Array.from(
    new Set(cards.flatMap((card) => card.tags))
  ).sort();

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Filter cards based on selected tags. If none selected, default to all cards.
  const filteredCards = selectedTags.length === 0
    ? cards
    : cards.filter((card) => card.tags.some((tag) => selectedTags.includes(tag)));

  return (
    <div className="max-w-4xl mx-auto mt-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <Layers className="text-indigo-500" />
          Your Deck
        </h2>
        {cards.length > 0 && (
          <button 
            onClick={() => onStudy(filteredCards)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <Play size={18} fill="currentColor" />
            Study Selected ({filteredCards.length})
          </button>
        )}
      </div>

      {/* Topic Filter Selector Component */}
      <TopicSelector 
        allTags={allTags}
        selectedTags={selectedTags}
        onToggleTag={handleToggleTag}
      />

      {/* Empty State */}
      {cards.length === 0 && (
        <div className="text-center py-20 bg-zinc-900 border border-zinc-800 rounded-xl">
          <Inbox className="mx-auto h-12 w-12 text-zinc-500 mb-4" />
          <h3 className="text-lg font-medium text-zinc-300">Your deck is empty</h3>
          <p className="text-zinc-500 mt-2">Go to the Create tab to add your first flashcard.</p>
        </div>
      )}

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div 
            key={card.id} 
            className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl hover:border-zinc-700 transition-colors flex flex-col justify-between"
          >
            <div>
              <p className="text-zinc-100 font-medium line-clamp-3 mb-4">
                {card.question}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-zinc-800/50">
              {card.tags.map((tag) => (
                <span 
                  key={tag} 
                  className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded-md"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}