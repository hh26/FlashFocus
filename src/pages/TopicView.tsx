// src/pages/TopicView.tsx
import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Flashcard } from '../db';
import { ArrowLeft, Play, FolderOpen, Pencil, Trash2, X, Save, AlertTriangle, Eye, EyeOff } from 'lucide-react';

interface TopicViewProps {
  topicName: string;
  onBack: () => void;
  onStudy: (cards: Flashcard[]) => void;
}

export default function TopicView({ topicName, onBack, onStudy }: TopicViewProps) {
  const isUntagged = topicName === 'untagged';
  const displayName = isUntagged ? 'Uncategorized' : topicName;

  // 1. Fetch LIVE data for this specific topic (Added .filter(c => !c.isDeleted) for soft-deletes)
  const cards = useLiveQuery(() => {
    if (isUntagged) return db.cards.filter(c => (!c.tags || c.tags.length === 0) && !c.isDeleted).toArray();
    return db.cards.where('tags').equals(topicName).filter(c => !c.isDeleted).toArray();
  }, [topicName]);

  // Masked Answers States
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set());
  const [isAllRevealed, setIsAllRevealed] = useState(false);

  // Modal States
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [editForm, setEditForm] = useState({ question: '', answer: '', tags: '' });
  
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState(topicName);
  
  const [isDeletingTopic, setIsDeletingTopic] = useState(false);

  // Auto-close if all cards are deleted
  useEffect(() => {
    if (cards !== undefined && cards.length === 0) onBack();
  }, [cards, onBack]);

  if (cards === undefined) return <div className="text-zinc-400 text-center mt-10">Loading deck...</div>;
  if (cards.length === 0) return null; // Will auto-redirect via useEffect

  // --- MASKING ACTIONS ---
  const toggleReveal = (cardId: number) => {
    setRevealedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) newSet.delete(cardId);
      else newSet.add(cardId);
      return newSet;
    });
  };

  const toggleAll = () => {
    if (isAllRevealed) {
      setRevealedCards(new Set());
    } else {
      setRevealedCards(new Set(cards.map(c => c.id!)));
    }
    setIsAllRevealed(!isAllRevealed);
  };

  // --- CARD ACTIONS ---
  const handleDeleteCard = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this card?")) {
      await db.cards.update(id, { isDeleted: true, updatedAt: Date.now() });
      window.dispatchEvent(new Event('local-data-changed'));
    }
  };

  const openEditCard = (card: Flashcard) => {
    setEditingCard(card);
    setEditForm({ question: card.question, answer: card.answer, tags: card.tags.join(', ') });
  };

  const handleSaveCard = async () => {
    if (!editingCard?.id) return;
    const updatedTags = editForm.tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
    
    await db.cards.update(editingCard.id, {
      question: editForm.question,
      answer: editForm.answer,
      tags: updatedTags,
      updatedAt: Date.now()
    });
    window.dispatchEvent(new Event('local-data-changed'));
    setEditingCard(null);
  };

  // --- TOPIC ACTIONS ---
  const handleRenameTopic = async () => {
    if (isUntagged || !newTopicName.trim() || newTopicName === topicName) {
      setIsEditingTopic(false);
      return;
    }
    const cleanNewName = newTopicName.trim().toLowerCase();
    
    const updatedCards = cards.map(card => ({
      ...card,
      tags: card.tags.map((t: string) => t === topicName ? cleanNewName : t),
      updatedAt: Date.now()
    }));
    
    await db.cards.bulkPut(updatedCards);
    window.dispatchEvent(new Event('local-data-changed'));
    setIsEditingTopic(false);
    onBack(); 
  };

  const handleDeleteTopicAndCards = async () => {
    // CRITICAL: We must use soft delete (bulkPut) instead of bulkDelete, otherwise they will re-sync from cloud!
    const updatedCards = cards.map(card => ({
      ...card,
      isDeleted: true,
      updatedAt: Date.now()
    }));
    await db.cards.bulkPut(updatedCards);
    window.dispatchEvent(new Event('local-data-changed'));
    setIsDeletingTopic(false);
    onBack();
  };

  return (
    <div className="max-w-4xl mx-auto mt-6 pb-10">
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors mb-6">
        <ArrowLeft size={20} /> Back to Decks
      </button>

      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-4 bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <FolderOpen className="text-indigo-500" size={28} />
            <h2 className="text-3xl font-bold text-zinc-100 capitalize">{displayName}</h2>
          </div>
          <p className="text-zinc-400">{cards.length} {cards.length === 1 ? 'card' : 'cards'} in this deck</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {!isUntagged && (
            <>
              <button onClick={() => setIsEditingTopic(true)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2.5 rounded-lg transition-colors">
                <Pencil size={18} />
              </button>
              <button onClick={() => setIsDeletingTopic(true)} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-2.5 rounded-lg transition-colors">
                <Trash2 size={18} />
              </button>
            </>
          )}
          <button onClick={() => onStudy(cards)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2">
            <Play size={18} fill="currentColor" /> Study
          </button>
        </div>
      </div>

      {/* Controls Area */}
      <div className="flex justify-end mb-4">
        <button 
          onClick={toggleAll}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800"
        >
          {isAllRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
          {isAllRevealed ? 'Hide All Answers' : 'Reveal All Answers'}
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map(card => {
          const isRevealed = revealedCards.has(card.id!);

          return (
            <div key={card.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col gap-4 relative group hover:border-zinc-700 transition-colors">
              
              {/* Card Action Buttons (Visible on hover) */}
              <div className="absolute top-3 right-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                <button onClick={() => openEditCard(card)} className="p-2 bg-zinc-800 hover:bg-indigo-600 text-zinc-300 hover:text-white rounded-md transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDeleteCard(card.id!)} className="p-2 bg-zinc-800 hover:bg-red-600 text-zinc-300 hover:text-white rounded-md transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Question */}
              <div>
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1 block">Question</span>
                <p className="text-zinc-200 font-medium pr-16">{card.question}</p>
              </div>
              
              {/* Masked Answer */}
              <div 
                className="pt-4 border-t border-zinc-800/50 cursor-pointer group/answer relative"
                onClick={() => toggleReveal(card.id!)}
                title="Tap to reveal answer"
              >
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Answer</span>
                
                <div className={`relative transition-all duration-300 ${isRevealed ? 'opacity-100' : 'opacity-80'}`}>
                  <p className={`text-sm sm:text-base transition-all duration-300 select-none ${
                    isRevealed 
                      ? 'text-zinc-300 blur-none' 
                      : 'text-zinc-400 blur-sm bg-zinc-800/50 rounded px-1'
                  }`}>
                    {card.answer}
                  </p>
                  
                  {/* Overlay prompt when hidden */}
                  {!isRevealed && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/answer:opacity-100 transition-opacity">
                      <span className="bg-zinc-800 text-zinc-300 text-xs font-medium px-2 py-1 rounded-md shadow-lg border border-zinc-700 flex items-center gap-1">
                        <Eye size={12} /> Tap to reveal
                      </span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* MODAL: Edit Card */}
      {editingCard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-zinc-100">Edit Card</h3>
              <button onClick={() => setEditingCard(null)} className="text-zinc-500 hover:text-zinc-300"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Question</label>
                <textarea value={editForm.question} onChange={e => setEditForm({...editForm, question: e.target.value})} className="w-full bg-zinc-950 text-zinc-100 border border-zinc-700 rounded-lg p-3" rows={2} />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Answer</label>
                <textarea value={editForm.answer} onChange={e => setEditForm({...editForm, answer: e.target.value})} className="w-full bg-zinc-950 text-zinc-100 border border-zinc-700 rounded-lg p-3" rows={2} />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Tags (comma separated)</label>
                <input type="text" value={editForm.tags} onChange={e => setEditForm({...editForm, tags: e.target.value})} className="w-full bg-zinc-950 text-zinc-100 border border-zinc-700 rounded-lg p-3" />
              </div>
              <button onClick={handleSaveCard} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg flex justify-center items-center gap-2 mt-2">
                <Save size={18} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Topic */}
      {isEditingTopic && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-zinc-100 mb-4">Rename Topic</h3>
            <input 
              type="text" value={newTopicName} onChange={e => setNewTopicName(e.target.value)}
              className="w-full bg-zinc-950 text-zinc-100 border border-zinc-700 rounded-lg p-3 mb-4" autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setIsEditingTopic(false)} className="flex-1 bg-zinc-800 text-zinc-300 py-2.5 rounded-lg">Cancel</button>
              <button onClick={handleRenameTopic} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg">Save Topic</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete Topic Alert */}
      {isDeletingTopic && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-red-900/50 p-6 rounded-xl w-full max-w-md shadow-2xl text-center">
            <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
            <h3 className="text-xl font-bold text-zinc-100 mb-2">Delete Entire Topic?</h3>
            <p className="text-zinc-400 mb-6">This will permanently delete the topic <strong>#{topicName}</strong> AND all <strong>{cards.length} cards</strong> inside it. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setIsDeletingTopic(false)} className="flex-1 bg-zinc-800 text-zinc-300 py-3 rounded-lg">Cancel</button>
              <button onClick={handleDeleteTopicAndCards} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium">Yes, Delete All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}