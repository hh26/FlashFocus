// src/pages/Home.tsx
import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Flashcard } from '../db';
import { Layers, Play, Inbox, Search, Folder, CheckSquare, Square, ChevronRight } from 'lucide-react';

interface HomeProps {
  onStudy: (filteredCards: Flashcard[]) => void;
  onViewTopic: (topicName: string, cards: Flashcard[]) => void; // New prop!
}

export default function Home({ onStudy, onViewTopic }: HomeProps) {
  const cards = useLiveQuery(() => db.cards.toArray());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const groupedDecks = useMemo(() => {
    if (!cards) return {};
    const groups: Record<string, Flashcard[]> = {};
    
    cards.forEach(card => {
      if (!card.tags || card.tags.length === 0) {
        if (!groups['untagged']) groups['untagged'] = [];
        groups['untagged'].push(card);
      } else {
        card.tags.forEach(tag => {
          if (!groups[tag]) groups[tag] = [];
          groups[tag].push(card);
        });
      }
    });
    return groups;
  }, [cards]);

  if (cards === undefined) return <div className="text-zinc-400 text-center mt-10">Loading decks...</div>;

  const filteredTopics = Object.keys(groupedDecks)
    .filter(topic => topic.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort();

  const cardsToStudy = selectedTopics.length === 0 
    ? [] 
    : cards.filter(card => 
        card.tags.some(tag => selectedTopics.includes(tag)) || 
        (selectedTopics.includes('untagged') && card.tags.length === 0)
      );

  const toggleTopicSelection = (topic: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    setSelectedTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);
  };

  return (
    <div className="max-w-4xl mx-auto mt-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <Layers className="text-indigo-500" /> Your Decks
        </h2>
        
        <button 
          onClick={() => onStudy(cardsToStudy)}
          disabled={cardsToStudy.length === 0}
          className={`px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 justify-center ${
            cardsToStudy.length > 0 
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20' 
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          }`}
        >
          <Play size={18} fill={cardsToStudy.length > 0 ? "currentColor" : "none"} />
          Study Selected ({cardsToStudy.length})
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input 
          type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search topics..."
          className="w-full bg-zinc-950 text-zinc-100 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      {cards.length === 0 && (
        <div className="text-center py-20 bg-zinc-900 border border-zinc-800 rounded-xl">
          <Inbox className="mx-auto h-12 w-12 text-zinc-500 mb-4" />
          <h3 className="text-lg font-medium text-zinc-300">Your collection is empty</h3>
        </div>
      )}

      <div className="space-y-3">
        {filteredTopics.map(topic => {
          const isSelected = selectedTopics.includes(topic);
          const topicCards = groupedDecks[topic];

          return (
            <div 
              key={topic} 
              onClick={() => onViewTopic(topic, topicCards)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-zinc-700 hover:bg-zinc-800/50 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <button onClick={(e) => toggleTopicSelection(topic, e)} className="text-zinc-400 hover:text-indigo-400 transition-colors">
                  {isSelected ? <CheckSquare size={22} className="text-indigo-500" /> : <Square size={22} />}
                </button>
                <div className="flex items-center gap-2">
                  <Folder size={18} className="text-indigo-500" />
                  <span className="font-semibold text-zinc-100 capitalize">
                    {topic === 'untagged' ? 'Uncategorized' : topic}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-500 font-medium">
                  {topicCards.length} {topicCards.length === 1 ? 'card' : 'cards'}
                </span>
                <ChevronRight size={18} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}