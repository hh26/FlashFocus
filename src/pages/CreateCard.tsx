// src/pages/CreateCard.tsx
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { PlusCircle, CheckCircle2, ChevronDown, Check, X } from 'lucide-react';

export default function CreateCard() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  
  // State for the new tag dropdown system
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch existing tags to populate the dropdown
  const cards = useLiveQuery(() => db.cards.toArray());
  const existingTags = Array.from(
    new Set(cards?.flatMap(card => card.tags) || [])
  ).sort();

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleAddNewTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    // If it's a keyboard event, only trigger on Enter
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    
    const cleanTag = newTagInput.trim().toLowerCase();
    if (cleanTag && !selectedTags.includes(cleanTag)) {
      setSelectedTags([...selectedTags, cleanTag]);
    }
    setNewTagInput('');
    setIsDropdownOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim() || selectedTags.length === 0) return;

    try {
      await db.cards.add({
        question,
        answer,
        tags: selectedTags,
        lastReviewed: new Date(),
      });

      setQuestion('');
      setAnswer('');
      setSelectedTags([]); // Reset tags
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to add card:', error);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl mt-10">
      <h2 className="text-2xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
        <PlusCircle className="text-indigo-500" />
        Create New Card
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Question</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full bg-zinc-950 text-zinc-100 border border-zinc-700 rounded-lg p-3 focus:outline-none focus:border-indigo-500 transition-colors"
            rows={3} required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Answer</label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full bg-zinc-950 text-zinc-100 border border-zinc-700 rounded-lg p-3 focus:outline-none focus:border-indigo-500 transition-colors"
            rows={3} required
          />
        </div>

        {/* The New Tag Dropdown Area */}
        <div className="relative">
          <label className="block text-sm font-medium text-zinc-400 mb-1">Topics</label>
          
          <div 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full bg-zinc-950 text-zinc-100 border border-zinc-700 rounded-lg p-3 flex justify-between items-center cursor-pointer hover:border-zinc-600 transition-colors"
          >
            <span className="text-zinc-500">Select or create topics...</span>
            <ChevronDown size={18} className={`text-zinc-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </div>

          {isDropdownOpen && <div className="fixed inset-0 z-30" onClick={() => setIsDropdownOpen(false)} />}

          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-40 max-h-64 overflow-y-auto overflow-hidden">
              {/* Input to create a new tag inside the dropdown */}
              <div className="p-2 border-b border-zinc-800 flex gap-2">
                <input 
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={handleAddNewTag}
                  placeholder="Type new topic and hit Enter..."
                  className="w-full bg-zinc-950 text-zinc-100 border border-zinc-800 rounded p-2 text-sm focus:outline-none focus:border-indigo-500"
                />
                <button type="button" onClick={handleAddNewTag} className="bg-indigo-600 text-white px-3 rounded text-sm hover:bg-indigo-700">Add</button>
              </div>

              {/* List existing tags to choose from */}
              {existingTags.length > 0 ? (
                existingTags.map(tag => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag} type="button" onClick={() => toggleTag(tag)}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-zinc-800 transition-colors text-left"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-zinc-600'}`}>
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                      <span className="text-zinc-200">#{tag}</span>
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-sm text-zinc-500 text-center">No existing topics found. Create one above!</div>
              )}
            </div>
          )}

          {/* Render chosen tags as chips */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedTags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-zinc-800 text-zinc-200 text-xs px-2 py-1 rounded-md border border-zinc-700">
                  #{tag}
                  <button type="button" onClick={() => toggleTag(tag)} className="hover:text-red-400 ml-1">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={selectedTags.length === 0}
          className="w-full bg-indigo-600 disabled:bg-zinc-800 disabled:text-zinc-500 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors flex justify-center items-center gap-2 mt-4"
        >
          {showSuccess ? <><CheckCircle2 size={20} /> Saved!</> : 'Save Card'}
        </button>
      </form>
    </div>
  );
}