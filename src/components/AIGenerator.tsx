// src/components/AIGenerator.tsx
import { useState, useEffect } from 'react';
import { db } from '../db';
import { Sparkles, Key, Loader2, Info, X, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

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
        model: 'gemini-3.5-flash',
        instructions: (
            <ul className="list-disc pl-4 space-y-2 text-sm text-zinc-300">
                <li>Go to <strong>aistudio.google.com</strong> and sign in.</li>
                <li>Click <strong>Get API key</strong> in the top left menu.</li>
                <li>Click <strong>Create API key</strong> (use a new or existing project).</li>
                <li>Gemini 3.5 Flash is incredibly fast and has a generous free tier!</li>
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
                <li>Requires a funded billing account (costs are very low for the mini model).</li>
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
                <li>Note: Claude requires pre-purchased credits to generate responses.</li>
            </ul>
        )
    }
};

export default function AIGenerator() {
    const [selectedAgent, setSelectedAgent] = useState<AgentId>('gemini');
    const [apiKey, setApiKey] = useState('');
    const [topic, setTopic] = useState('');
    const [count, setCount] = useState(5);

    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const [showInstructions, setShowInstructions] = useState(false);

    // Load the correct saved API key when the agent changes
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
        setError('');

        try {
            // Updated prompt to enforce exactly ONE tag
            const prompt = `Create ${count} flashcards about "${topic}". 
      Respond ONLY with a valid JSON object. Do not include markdown formatting like \`\`\`json.
      The JSON object must have exactly two keys:
      1. "deck_tag": A single, short, hyphenated string representing the overall topic (e.g., "quantum-physics", "world-history").
      2. "cards": An array of objects, where each object has exactly two keys: "question" and "answer".`;

            let rawText = '';

            // --- GEMINI LOGIC ---
            if (selectedAgent === 'gemini') {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${AGENTS.gemini.model}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });
                if (!res.ok) throw new Error('Gemini API request failed. Check your key.');
                const data = await res.json();
                rawText = data.candidates[0].content.parts[0].text;
            }

            // --- OPENAI LOGIC ---
            else if (selectedAgent === 'openai') {
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: AGENTS.openai.model,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.7
                    })
                });
                if (!res.ok) throw new Error('OpenAI API request failed. Check your key and billing status.');
                const data = await res.json();
                rawText = data.choices[0].message.content;
            }

            // --- ANTHROPIC LOGIC ---
            else if (selectedAgent === 'anthropic') {
                const res = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                        'anthropic-dangerous-direct-browser-access': 'true' // Required for client-side PWA calls
                    },
                    body: JSON.stringify({
                        model: AGENTS.anthropic.model,
                        max_tokens: 1500,
                        messages: [{ role: 'user', content: prompt }]
                    })
                });
                if (!res.ok) throw new Error('Anthropic API request failed. Check your key and credits.');
                const data = await res.json();
                rawText = data.content[0].text;
            }

            // Parse JSON and map the single 'tag' string into the 'tags' array our DB expects
            const generatedData = JSON.parse(rawText.trim());
            const masterTag = generatedData.deck_tag.toLowerCase().replace(/[^a-z0-9-]/g, '');

            // Map through the cards and forcefully inject the exact same master tag into all of them
            const formattedCards = generatedData.cards.map((card: any) => ({
                question: card.question,
                answer: card.answer,
                tags: [masterTag],
                lastReviewed: new Date()
            }));

            await db.cards.bulkAdd(formattedCards);

            setTopic('');
            toast.success(`Generated ${formattedCards.length} cards under #${masterTag}!`);
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to generate cards.';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl mt-6 relative">
            <div className="flex items-center gap-2 mb-6">
                <Sparkles className="text-indigo-500" />
                <h3 className="text-lg font-bold text-zinc-100">AI Auto-Generate</h3>
            </div>

            <div className="space-y-4">

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
                                    <option key={agent.id} value={agent.id}>{agent.name} ({agent.model})</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                        </div>
                    </div>

                    <button
                        onClick={() => setShowInstructions(true)}
                        className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors flex items-center justify-center shrink-0"
                        title="How to get a key"
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

                {/* Topic & Count Inputs */}
                <div className="flex gap-3">
                    <div className="flex-1">
                        <label className="block text-sm text-zinc-400 mb-1">Topic</label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g., Quantum Physics"
                            className="w-full bg-zinc-950 text-zinc-100 border border-zinc-700 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none"
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

                {error && <p className="text-red-400 text-sm p-3 bg-red-400/10 rounded-lg border border-red-500/20">{error}</p>}

                <button
                    onClick={handleGenerate}
                    disabled={!apiKey || !topic || isGenerating}
                    className="w-full bg-indigo-600 disabled:bg-zinc-800 disabled:text-zinc-500 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors flex justify-center items-center gap-2"
                >
                    {isGenerating ? <><Loader2 className="animate-spin" size={18} /> Generating...</> : 'Generate Cards'}
                </button>
            </div>

            {/* INSTRUCTIONS MODAL */}
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
                                <strong>Privacy Note:</strong> Your key is stored securely in your browser's local storage. It is never sent to our servers, only directly to the AI provider you selected.
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