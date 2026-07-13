// src/pages/CreateCard.tsx
import { useState } from 'react';
import { db } from '../db';
import { PlusCircle, CheckCircle2 } from 'lucide-react';

export default function CreateCard() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [tags, setTags] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim() || !answer.trim()) return;

    // Convert comma-separated string into an array of clean, lowercase tags
    const tagArray = tags
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);

    try {
      // Save to local IndexedDB
      await db.cards.add({
        question,
        answer,
        tags: tagArray,
        lastReviewed: new Date(),
      });

      // Reset form and show a quick success message
      setQuestion('');
      setAnswer('');
      setTags('');
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

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Question Input */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Question</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full bg-zinc-950 text-zinc-100 border border-zinc-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            rows={3}
            placeholder="What is the powerhouse of the cell?"
            required
          />
        </div>

        {/* Answer Input */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Answer</label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full bg-zinc-950 text-zinc-100 border border-zinc-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            rows={3}
            placeholder="Mitochondria"
            required
          />
        </div>

        {/* Tags Input */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Tags (comma separated)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full bg-zinc-950 text-zinc-100 border border-zinc-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            placeholder="biology, science, chapter-1"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors flex justify-center items-center gap-2"
        >
          {showSuccess ? (
            <>
              <CheckCircle2 size={20} />
              Saved!
            </>
          ) : (
            'Save Card'
          )}
        </button>
      </form>
    </div>
  );
}