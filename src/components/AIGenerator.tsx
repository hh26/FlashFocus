// src/components/AIGenerator.tsx
import { useState, useEffect, useRef } from 'react';
import { db } from '../db';
import { toast } from 'sonner';
import { Sparkles, Key, Info, X, ChevronDown, CheckCircle2, RefreshCw, Send, MessageSquare } from 'lucide-react';

type AgentId = 'gemini' | 'openai' | 'anthropic';

interface AgentInfo {
  id: AgentId;
  name: string;
  model: string;
  instructions: React.ReactNode;
}

const AGENTS: Record<AgentId, AgentInfo> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    model: 'gemini-3.1-flash-lite',
    instructions: (
      <ul className="list-disc pl-4 space-y-2 text-sm text-zinc-300">
        <li>Go to <strong>aistudio.google.com</strong> and sign in.</li>
        <li>Click <strong>Get API key</strong> in the top left menu.</li>
        <li>Click <strong>Create API key</strong> (use a new or existing project).</li>
      </ul>
    )
  },
  openai: {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    model: 'gpt-4o-mini',
    instructions: (
      <ul className="list-disc pl-4 space-y-2 text-sm text-zinc-300">
        <li>Go to <strong>platform.openai.com/api-keys</strong>.</li>
        <li>Sign in and click <strong>Create new secret key</strong>.</li>
      </ul>
    )
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    model: 'claude-3-haiku-20240307',
    instructions: (
      <ul className="list-disc pl-4 space-y-2 text-sm text-zinc-300">
        <li>Go to <strong>console.anthropic.com</strong>.</li>
        <li>Navigate to Settings &gt; <strong>API Keys</strong> and create a key.</li>
      </ul>
    )
  }
};

const USE_CASES = {
  language: {
    label: "🌎 Language Learning",
    prompt: (topic: string, difficulty: string) => 
      `You are a language tutor. Create flashcards for learning: "${topic}". Difficulty level: ${difficulty}. The "question" must be the phrase in English. The "answer" must be the translation in the target language.`
  },
  vocabulary: {
    label: "📖 Daily Vocabulary",
    prompt: (topic: string, difficulty: string) => 
      `You are a vocabulary builder. Provide synonyms or words related to: "${topic}". Difficulty level: ${difficulty}. The "question" must be the word. The "answer" must be a concise definition and one short example sentence.`
  },
  science: {
    label: "🔬 Scientific Definitions",
    prompt: (topic: string, difficulty: string) => 
      `You are a science professor teaching: "${topic}". Difficulty level: ${difficulty}. The "question" must be the scientific term or concept. The "answer" must be a clear, strictly factual definition.`
  },
  custom: {
    label: "✍️ Custom Prompt",
    prompt: (topic: string, difficulty: string) => 
      `Create flashcards based exactly on this request: "${topic}". Target difficulty: ${difficulty}. Keep answers concise and accurate.`
  }
};

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced", "Expert"];

// --- HELPER FUNCTION FOR API CALLS ---
async function fetchAIResponse(agent: AgentId, apiKey: string, fullPrompt: string) {
  if (agent === 'gemini') {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${AGENTS.gemini.model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature: 0.3 }
      })
    });
    if (!res.ok) throw new Error('Gemini API request failed. Check your key.');
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  } 
  
  if (agent === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: AGENTS.openai.model,
        messages: [{ role: 'user', content: fullPrompt }],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });
    if (!res.ok) throw new Error('OpenAI API request failed. Check your key.');
    const data = await res.json();
    return data.choices[0].message.content;
  }
  
  if (agent === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: AGENTS.anthropic.model,
        max_tokens: 1500,
        messages: [{ role: 'user', content: fullPrompt }],
        temperature: 0.3
      })
    });
    if (!res.ok) throw new Error('Anthropic API request failed. Check your key.');
    const data = await res.json();
    return data.content[0].text;
  }
  throw new Error('Invalid agent selected.');
}

import { v4 as uuidv4 } from 'uuid';

export default function AIGenerator() {
  const [selectedAgent, setSelectedAgent] = useState<AgentId>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  
  const [selectedUseCase, setSelectedUseCase] = useState<keyof typeof USE_CASES>('custom');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [chatInput, setChatInput] = useState('');
  
  const [draftCards, setDraftCards] = useState<{question: string, answer: string}[]>([]);
  const [draftTag, setDraftTag] = useState<string>('');

  // NEW: Ref to handle automatic scrolling
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem(`ai_api_key_${selectedAgent}`);
    setApiKey(savedKey || '');
  }, [selectedAgent]);

  // NEW: Scroll into view when draft cards are ready
  useEffect(() => {
    if (draftCards.length > 0 && !isGenerating && !isRefining && previewRef.current) {
      previewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [draftCards, isGenerating, isRefining]);

  const saveKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem(`ai_api_key_${selectedAgent}`, key);
  };

  const getFormatInstructions = (expectedCount: number) => `
    Respond ONLY with a valid JSON object. Do not include markdown formatting like \`\`\`json.
    The JSON object must have exactly two keys:
    1. "deck_tag": A single, short, hyphenated string representing the overall topic.
    2. "cards": An array of exactly ${expectedCount} objects, each with "question" and "answer" string keys.`;

  const handleGenerate = async () => {
    if (!apiKey || !topic) return;
    setIsGenerating(true);
    setDraftCards([]);
    setChatInput('');

    try {
      const basePrompt = USE_CASES[selectedUseCase].prompt(topic, difficulty);
      const fullPrompt = `${basePrompt}\n${getFormatInstructions(count)}`;
      
      const rawText = await fetchAIResponse(selectedAgent, apiKey, fullPrompt);
      const generatedData = JSON.parse(rawText.trim());
      
      setDraftTag(generatedData.deck_tag.toLowerCase().replace(/[^a-z0-9-]/g, ''));
      setDraftCards(generatedData.cards);
      toast.success('Cards drafted successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate cards.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!chatInput.trim() || !apiKey) return;
    setIsRefining(true);

    try {
      const fullPrompt = `
      You are modifying an existing deck of flashcards based on user feedback.
      Original Topic: ${topic}
      Current Draft Cards: ${JSON.stringify(draftCards)}
      
      User Feedback/Instruction: "${chatInput}"
      
      Apply the feedback and ${getFormatInstructions(draftCards.length)}
      Keep the deck_tag as "${draftTag}".
      `;

      const rawText = await fetchAIResponse(selectedAgent, apiKey, fullPrompt);
      const generatedData = JSON.parse(rawText.trim());
      
      setDraftCards(generatedData.cards);
      setChatInput('');
      toast.success('Deck updated based on your feedback!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to refine cards.');
    } finally {
      setIsRefining(false);
    }
  };

  const handleSaveToDeck = async () => {
    if (draftCards.length === 0) return;
    const formattedCards = draftCards.map(card => ({
      ...card,
      id: uuidv4(),
      tags: [draftTag],
      lastReviewed: new Date(),
      updatedAt: Date.now(),
      isDeleted: false
    }));

    try {
      await db.cards.bulkAdd(formattedCards);
      toast.success(`Saved ${formattedCards.length} cards to #${draftTag}!`);
      setTopic('');
      setDraftCards([]);
      setDraftTag('');
    } catch (err) {
      toast.error('Failed to save cards to your deck.');
    }
  };

  const isLoading = isGenerating || isRefining;

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl mt-6 relative">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="text-indigo-500" />
        <h3 className="text-lg font-bold text-zinc-100">AI Auto-Generate</h3>
      </div>

      <div className="space-y-5">
        {/* Agent Selection */}
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm text-zinc-400 mb-1">Select AI Provider</label>
            <div className="relative">
              <select 
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value as AgentId)}
                className="w-full appearance-none bg-zinc-950 text-zinc-100 border border-zinc-700 rounded-lg p-3 pr-10 focus:border-indigo-500 outline-none"
              >
                {Object.values(AGENTS).map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>
          </div>
          <button onClick={() => setShowInstructions(true)} className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors">
            <Info size={20} />
          </button>
        </div>

        {/* API Key */}
        <div>
          <label className="flex items-center gap-2 text-sm text-zinc-400 mb-1"><Key size={14} /> Your {AGENTS[selectedAgent].name} API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => saveKey(e.target.value)}
            placeholder="Paste your secret key here..."
            className="w-full bg-zinc-950 text-zinc-100 border border-zinc-700 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none"
          />
        </div>

        {/* Configuration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">I want to study...</label>
            <div className="relative">
              <select 
                value={selectedUseCase}
                onChange={(e) => setSelectedUseCase(e.target.value as any)}
                className="w-full appearance-none bg-zinc-950 text-zinc-100 border border-zinc-700 rounded-lg p-3 pr-10 outline-none focus:border-indigo-500"
              >
                {Object.entries(USE_CASES).map(([key, data]) => <option key={key} value={key}>{data.label}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Difficulty</label>
            <div className="relative">
              <select 
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full appearance-none bg-zinc-950 text-zinc-100 border border-zinc-700 rounded-lg p-3 pr-10 outline-none focus:border-indigo-500"
              >
                {DIFFICULTIES.map(level => <option key={level} value={level}>{level}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Topic Input */}
        <div className="flex gap-3 items-start">
          <div className="flex-1">
            <label className="block text-sm text-zinc-400 mb-1">Topic or Request</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder='e.g., "Spanish words for ordering at a restaurant"'
              className="w-full bg-zinc-950 text-zinc-100 border border-zinc-700 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none resize-none"
              rows={2}
            />
          </div>
          <div className="w-24 shrink-0">
            <label className="block text-sm text-zinc-400 mb-1">Count</label>
            <input
              type="number"
              min={1} max={20}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full bg-zinc-950 text-zinc-100 border border-zinc-700 rounded-lg p-3 text-sm focus:border-indigo-500 text-center outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!apiKey || !topic || isLoading}
          className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 border border-zinc-700 text-zinc-200 font-semibold py-3 rounded-lg transition-colors flex justify-center items-center gap-2"
        >
          <RefreshCw size={18} className={isGenerating ? "animate-spin" : ""} /> 
          {isGenerating ? 'Generating Draft...' : 'Generate New Draft'}
        </button>
      </div>

      {/* SHIMMERING SKELETON LOADER */}
      {isLoading && (
        <div className="mt-8 pt-8 border-t border-zinc-800 animate-pulse">
          <div className="h-6 bg-zinc-800 rounded w-48 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
                <div className="h-4 bg-zinc-800 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-zinc-800 rounded w-5/6"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* PREVIEW UI (Upgraded for Mobile) */}
      {/* ---------------------------------------------------- */}
      {!isLoading && draftCards.length > 0 && (
        <div ref={previewRef} className="mt-8 pt-8 border-t border-zinc-800 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <h4 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <MessageSquare size={18} className="text-indigo-500" /> Preview & Refine
            </h4>
            <span className="self-start sm:self-auto bg-indigo-900/30 text-indigo-400 px-3 py-1 rounded-full text-xs border border-indigo-700/50 font-medium">
              #{draftTag}
            </span>
          </div>
          
          <div className="space-y-4 mb-6 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            {draftCards.map((card, idx) => (
              <div key={idx} className="bg-zinc-950/80 border border-zinc-700/50 p-4 rounded-xl shadow-sm relative overflow-hidden">
                {/* Visual accent line for the card */}
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50 rounded-l-xl"></div>
                
                <p className="text-sm sm:text-base font-semibold text-zinc-100 mb-2 mt-1 pl-1">
                  <span className="text-indigo-400 mr-2 text-xs uppercase tracking-wider font-bold">Q:</span>
                  {card.question}
                </p>
                
                <div className="h-px w-full bg-zinc-800/50 my-3"></div>
                
                <p className="text-sm sm:text-base text-zinc-300 pl-1">
                  <span className="text-zinc-500 mr-2 text-xs uppercase tracking-wider font-bold">A:</span>
                  {card.answer}
                </p>
              </div>
            ))}
          </div>

          {/* Feedback Chat Input */}
          <div className="flex gap-2 mb-6">
            <input 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
              placeholder="e.g., Make answers shorter..."
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none"
            />
            <button 
              onClick={handleRefine}
              disabled={!chatInput.trim()}
              className="bg-zinc-800 hover:bg-indigo-600 disabled:bg-zinc-900 disabled:text-zinc-600 text-zinc-200 px-4 py-3 rounded-lg transition-colors flex items-center justify-center shrink-0"
            >
              <Send size={20} />
            </button>
          </div>

          {/* Action Buttons (Stacked on very small screens, side-by-side on sm+) */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => { setDraftCards([]); setTopic(''); }} 
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3.5 rounded-lg transition-colors font-medium text-sm order-2 sm:order-1"
            >
              Discard
            </button>
            <button 
              onClick={handleSaveToDeck} 
              className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 order-1 sm:order-2"
            >
              <CheckCircle2 size={18} /> Save to Deck
            </button>
          </div>
        </div>
      )}

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
              <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <Info className="text-indigo-500" size={20} /> Get your {AGENTS[selectedAgent].name} Key
              </h3>
              <button onClick={() => setShowInstructions(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6">
              {AGENTS[selectedAgent].instructions}
              <div className="mt-6 pt-4 border-t border-zinc-800 text-xs text-zinc-500">
                <strong>Privacy Note:</strong> Your key is stored securely in your browser's local storage.
              </div>
              <button onClick={() => setShowInstructions(false)} className="w-full mt-6 bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-lg transition-colors font-medium">Got it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}