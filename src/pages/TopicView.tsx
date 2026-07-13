// src/pages/TopicView.tsx
import { type Flashcard } from '../db';
import { ArrowLeft, Play, FolderOpen } from 'lucide-react';

interface TopicViewProps {
  topicName: string;
  cards: Flashcard[];
  onBack: () => void;
  onStudy: (cards: Flashcard[]) => void;
}

export default function TopicView({ topicName, cards, onBack, onStudy }: TopicViewProps) {
  const displayName = topicName === 'untagged' ? 'Uncategorized' : topicName;

  return (
    <div className="max-w-4xl mx-auto mt-6">
      {/* Navigation Header */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors mb-6"
      >
        <ArrowLeft size={20} /> Back to Decks
      </button>

      {/* Topic Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <h2 className="text-3xl font-bold text-zinc-100 flex items-center gap-3 capitalize">
          <FolderOpen className="text-indigo-500" size={28} />
          {displayName}
          <span className="text-lg font-medium text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
            {cards.length} cards
          </span>
        </h2>
        
        <button 
          onClick={() => onStudy(cards)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
        >
          <Play size={18} fill="currentColor" />
          Study this Deck
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(card => (
          <div key={card.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col gap-4 relative group">
            <div>
              <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1 block">Question</span>
              <p className="text-zinc-200 font-medium">{card.question}</p>
            </div>
            <div className="pt-4 border-t border-zinc-800/50">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Answer</span>
              <p className="text-zinc-400 text-sm">{card.answer}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}