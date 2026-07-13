// src/App.tsx
import { useState } from 'react';
import CreateCard from './pages/CreateCard';
import Home from './pages/Home';
import StudySession from './pages/StudySession';
import { type Flashcard } from './db';
import { Library, PlusSquare } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState<'home' | 'create' | 'study'>('home');
  // State to hold cards explicitly selected for the study loop
  const [activeDeck, setActiveDeck] = useState<Flashcard[]>([]);

  const startStudySession = (selectedCards: Flashcard[]) => {
    setActiveDeck(selectedCards);
    setCurrentView('study');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-20">
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Flash<span className="text-indigo-500">Focus</span>
          </h1>
          
          <nav className="hidden sm:flex gap-4">
            <button 
              onClick={() => setCurrentView('home')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${currentView === 'home' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <Library size={18} />
              My Deck
            </button>
            <button 
              onClick={() => setCurrentView('create')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${currentView === 'create' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <PlusSquare size={18} />
              Create
            </button>
          </nav>
        </div>
      </header>
      
      <main className="px-4">
        {currentView === 'home' && <Home onStudy={startStudySession} />}
        {currentView === 'create' && <CreateCard />}
        {currentView === 'study' && <StudySession deckCards={activeDeck} onExit={() => setCurrentView('home')} />}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 flex justify-around p-3 z-10 pb-safe">
        <button 
          onClick={() => setCurrentView('home')}
          className={`flex flex-col items-center gap-1 p-2 ${currentView === 'home' ? 'text-indigo-500' : 'text-zinc-500'}`}
        >
          <Library size={24} />
          <span className="text-xs font-medium">Deck</span>
        </button>
        <button 
          onClick={() => setCurrentView('create')}
          className={`flex flex-col items-center gap-1 p-2 ${currentView === 'create' ? 'text-indigo-500' : 'text-zinc-500'}`}
        >
          <PlusSquare size={24} />
          <span className="text-xs font-medium">Create</span>
        </button>
      </nav>
    </div>
  );
}

export default App;