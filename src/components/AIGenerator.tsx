// src/components/AIGenerator.tsx
import { useState, useEffect } from 'react';
import { db } from '../db';
import { toast } from 'sonner';
import { Sparkles, Key, Loader2, Info, X, ChevronDown, CheckCircle2, RefreshCw } from 'lucide-react';

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
    // Using 1.5-flash for real-world compatibility, but you can change this to 3.5 when it releases!
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

export default function AIGenerator() {
  // Config State
  const [selectedAgent, setSelectedAgent] = useState<AgentId>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  
  // Prompt State
  const [selectedUseCase, setSelectedUseCase] = useState<keyof typeof USE_CASES>('custom');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  
  // App State
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Draft State (The Preview Loop)
  const [draftCards, setDraftCards] = useState<{question: string, answer: string}[]>([]);
  const [draftTag, setDraftTag] = useState<string>('');

  // Load API key from local storage when agent switches
  useEffect(() => {
    const savedKey = localStorage.getItem(`ai_api_key_${selectedAgent}`);
    setApiKey(savedKey || '');
  }, [selectedAgent]);

  const saveKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem(`ai_api_key_${selectedAgent}`, key);
  };

  const handleGenerate = async () => {
    if (!apiKey || !topic) return;
    setIsGenerating(true);
    setDraftCards([]); // Clear previous drafts

    try {
      const basePrompt = USE_CASES[selectedUseCase].prompt(topic, difficulty);
      const fullPrompt = `${basePrompt}
      
      Respond ONLY with a valid JSON object. Do not include markdown formatting like \`\`\`json.
      The JSON object must have exactly two keys:
      1. "deck_tag": A single, short, hyphenated string representing the overall topic (e.g., "quantum-physics").
      2. "cards": An array of exactly ${count} objects, where each object has exactly two keys: "question" and "answer".`;

      let rawText = '';

      if (selectedAgent === 'gemini') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${AGENTS.gemini.model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            contents: [{ parts: [{ text: fullPrompt }] }],
            // Low temperature ensures strict JSON compliance and faster generation
            generationConfig: { temperature: 0.3 }
          })
        });
        if (!res.ok) throw new Error('Gemini API request failed. Check your key.');
        const data = await res.json();
        rawText = data.candidates[0].content.parts[0].text;
      } 
      else if (selectedAgent === 'openai') {
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
        if (!res.ok) throw new Error('OpenAI API request failed. Check your key and billing status.');
        const data = await res.json();
        rawText = data.choices[0].message.content;
      }
      else if (selectedAgent === 'anthropic') {
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
        if (!res.ok) throw new Error('Anthropic API request failed. Check your key and credits.');
        const data = await res.json();
        rawText = data.content[0].text;
      }

      const generatedData = JSON.parse(rawText.trim());
      
      // Send the data to the Draft state for preview, rather than directly to DB
      setDraftTag(generatedData.deck_tag.toLowerCase().replace(/[^a-z0-9-]/g, ''));
      setDraftCards(generatedData.cards);
      
      toast.success('Cards drafted successfully! Review them below.');

    } catch (err: any) {
      toast.error(err.message || 'Failed to generate cards. The AI returned invalid formatting.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Officially save the reviewed cards to IndexedDB
  const handleSaveToDeck = async () => {
    if (draftCards.length === 0) return;
    
    const formattedCards = draftCards.map(card => ({
      ...card,
      tags: [draftTag],
      lastReviewed: new Date()
    }));

    try {
      await db.cards.bulkAdd(formattedCards);
      toast.success(`Saved ${formattedCards.length} cards to #${draftTag}!`);
      
      // Reset the form and clear the draft
      setTopic('');
      setDraftCards([]);
      setDraftTag('');
    } catch (err) {
      toast.error('Failed to save cards to your deck.');
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl mt-6 relative">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="text-indigo-500" />
        <h3 className="text-lg font-bold text-zinc-100">AI Auto-Generate</h3>
      </div>

      <div className="space-y-5">
        
        {/* Agent Selection & Info Button */}
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
          
          <button 
            onClick={() => setShowInstructions(true)}
            className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors flex items-center justify-center shrink-0"
          >
            <Info size={20} />
          </button>
        </div>

        {/* API Key Input */}
        <div>
          <label className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
            <Key size={14} /> Your {AGENTS[selectedAgent].name} API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => saveKey(e.target.value)}
            placeholder="Paste your secret key here..."
            className="w-full bg-zinc-950 text-zinc-100 border border-zinc-700 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none"
          />
        </div>

        {/* Use Case & Difficulty */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">I want to study...</label>
            <div className="relative">
              <select 
                value={selectedUseCase}
                onChange={(e) => setSelectedUseCase(e.target.value as any)}
                className="w-full appearance-none bg-zinc-950 text-zinc-100 border border-zinc-700 rounded-lg p-3 pr-10 outline-none focus:border-indigo-500"
              >
                {Object.entries(USE_CASES).map(([key, data]) => (
                  <option key={key} value={key}>{data.label}</option>
                ))}
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
                {DIFFICULTIES.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
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

        {/* Main Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!apiKey || !topic || isGenerating}
          className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 border border-zinc-700 text-zinc-200 font-semibold py-3 rounded-lg transition-colors flex justify-center items-center gap-2"
        >
          {isGenerating ? <><Loader2 className="animate-spin" size={18} /> Generating Draft...</> : <><RefreshCw size={18} /> Generate Draft</>}
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* PREVIEW UI: Shows up only when cards are generated */}
      {/* ---------------------------------------------------- */}
      
      {draftCards.length > 0 && (
        <div className="mt-8 pt-8 border-t border-zinc-800">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-bold text-zinc-100">Review Draft Cards</h4>
            <span className="bg-indigo-900/30 text-indigo-400 px-3 py-1 rounded-full text-xs border border-indigo-700/50">
              #{draftTag}
            </span>
          </div>
          
          <div className="space-y-3 mb-6 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {draftCards.map((card, idx) => (
              <div key={idx} className="bg-zinc-950 border border-zinc-800 p-4 rounded-lg">
                <p className="text-sm font-medium text-zinc-200 mb-2"><span className="text-zinc-500 mr-2">Q:</span>{card.question}</p>
                <p className="text-sm text-zinc-400"><span className="text-zinc-600 mr-2">A:</span>{card.answer}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setDraftCards([])} 
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-lg transition-colors font-medium text-sm"
            >
              Discard Draft
            </button>
            <button 
              onClick={handleSaveToDeck} 
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              <CheckCircle2 size={18} /> Save to Deck
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-4 text-center">
            Not happy? Tweak your topic or difficulty above and hit Generate Draft again.
          </p>
        </div>
      )}

      {/* Instructions Modal (Unchanged) */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
              <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <Info className="text-indigo-500" size={20} />
                Get your {AGENTS[selectedAgent].name} Key
              </h3>
              <button onClick={() => setShowInstructions(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              {AGENTS[selectedAgent].instructions}
              <div className="mt-6 pt-4 border-t border-zinc-800 text-xs text-zinc-500">
                <strong>Privacy Note:</strong> Your key is stored securely in your browser's local storage. It is never sent to our servers.
              </div>
              <button 
                onClick={() => setShowInstructions(false)}
                className="w-full mt-6 bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-lg transition-colors font-medium"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}