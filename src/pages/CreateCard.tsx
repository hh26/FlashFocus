// src/pages/CreateCard.tsx
import { useState } from 'react';
import { db } from '../db';
import { toast } from 'sonner';
import { PlusCircle, PenTool, UploadCloud, Sparkles, Save } from 'lucide-react';
import ImportDeck from '../components/ImportDeck';
import AIGenerator from '../components/AIGenerator';
import { v4 as uuidv4 } from 'uuid'; // ADD THIS IMPORT

type Tab = 'manual' | 'import' | 'ai';

export default function CreateCard() {
  const [activeTab, setActiveTab] = useState<Tab>('manual');

  // Manual Form State
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [tags, setTags] = useState('');

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;

    const tagArray = tags
      .split(',')
      .map((tag: string) => tag.trim().toLowerCase())
      .filter((tag: string) => tag.length > 0);

    try {
      await db.cards.add({
        id: uuidv4(), // NEW: Generate unique ID string
        question: question.trim(),
        answer: answer.trim(),
        tags: tagArray,
        lastReviewed: new Date(),
        updatedAt: Date.now(), // NEW: Timestamp for sync conflicts
        isDeleted: false       // NEW: Required for sync
      });

      toast.success('Card created successfully!');
      setQuestion('');
      setAnswer('');
      document.getElementById('questionInput')?.focus();
    } catch (err) {
      toast.error('Failed to save the card.');
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-6 pb-20 px-4 sm:px-0">

      {/* ---------------------------------------------------- */}
      {/* TAB NAVIGATION (Segmented Control) */}
      {/* ---------------------------------------------------- */}
      <div className="flex p-1 bg-zinc-900 border border-zinc-800 rounded-xl mb-6 shadow-sm">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'manual'
              ? 'bg-zinc-800 text-zinc-100 shadow-md border border-zinc-700/50'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
        >
          <PenTool size={16} /> <span className="hidden sm:inline">Manual</span>
        </button>

        <button
          onClick={() => setActiveTab('import')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'import'
              ? 'bg-zinc-800 text-zinc-100 shadow-md border border-zinc-700/50'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
        >
          <UploadCloud size={16} /> <span className="hidden sm:inline">Import</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'ai'
              ? 'bg-indigo-900/40 text-indigo-300 shadow-md border border-indigo-700/50'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
        >
          <Sparkles size={16} /> <span className="hidden sm:inline">AI Generate</span>
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB CONTENT */}
      {/* ---------------------------------------------------- */}

      {/* 1. MANUAL TAB */}
      {activeTab === 'manual' && (
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h2 className="text-xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
            <PlusCircle className="text-indigo-500" size={20} />
            Create Flashcard
          </h2>

          <form onSubmit={handleManualSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Question</label>
              <textarea
                id="questionInput"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full bg-zinc-950 text-zinc-100 border border-zinc-700 rounded-lg p-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                rows={3}
                placeholder="What is the powerhouse of the cell?"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Answer</label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full bg-zinc-950 text-zinc-100 border border-zinc-700 rounded-lg p-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                rows={3}
                placeholder="Mitochondria"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Tags (comma separated)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full bg-zinc-950 text-zinc-100 border border-zinc-700 rounded-lg p-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                placeholder="biology, science"
              />
              <p className="text-xs text-zinc-500 mt-2">Tags help you group cards into decks automatically.</p>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition-colors flex justify-center items-center gap-2 mt-4 shadow-lg shadow-indigo-600/20"
            >
              <Save size={18} />
              Save Card
            </button>
          </form>
        </div>
      )}

      {/* 2. IMPORT TAB */}
      {activeTab === 'import' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <ImportDeck />
        </div>
      )}

      {/* 3. AI GENERATOR TAB */}
      {activeTab === 'ai' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* We wrap AIGenerator to handle spacing since we removed its top margin in this layout */}
          <div className="mt-6">
            <AIGenerator />
          </div>
        </div>
      )}

    </div>
  );
}