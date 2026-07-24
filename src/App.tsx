// src/App.tsx
import { useState, useEffect } from 'react';
import CreateCard from './pages/CreateCard';
import Home from './pages/Home';
import StudySession from './pages/StudySession';
import TopicView from './pages/TopicView';
import { type Flashcard } from './db';
import { Library, PlusSquare, RefreshCw, LogOut } from 'lucide-react';
import { Toaster, toast } from 'sonner';

import { supabase } from './supabase';
import { type Session } from '@supabase/supabase-js';
import Auth from './components/Auth';
import { syncDatabase } from './sync';

// Define a 5-minute cooldown for automatic background syncs
const SYNC_COOLDOWN_MS = 5 * 60 * 1000; 

function App() {
  const [currentView, setCurrentView] = useState<'home' | 'create' | 'study' | 'topic'>('home');
  const [activeDeck, setActiveDeck] = useState<Flashcard[]>([]);
  const [viewingTopicName, setViewingTopicName] = useState<string>('');

  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    // 1. Initial Load Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitializing(false);
      if (session) handleSync(false); // Background sync
    });

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN' && session) {
        handleSync(false); // Background sync (respects cooldown if it's just a tab focus)
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSync = async (isManual = false, bypassCooldown = false) => {
    const lastSync = parseInt(localStorage.getItem('flashfocus_last_sync') || '0', 10);
    const now = Date.now();

    // Abort if it's a standard background check and we are in cooldown
    if (!isManual && !bypassCooldown && (now - lastSync < SYNC_COOLDOWN_MS)) {
      return; 
    }

    setIsSyncing(true);
    try {
      const { pushed, pulled } = await syncDatabase();
      
      localStorage.setItem('flashfocus_last_sync', now.toString());
      
      if (pushed > 0 || pulled > 0) {
        toast.success(`Sync complete: ${pushed} pushed, ${pulled} pulled.`);
      } else if (isManual) {
        toast.info('Everything is up to date.');
      }
    } catch (error) {
      if (isManual) toast.error('Failed to sync. You may be offline.');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!session) return;

    // Trigger A: Pull data when you switch back to this tab/device
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleSync(false, false); // Respects the 5-minute cooldown
      }
    };

    // Trigger B: Push data instantly when you make a change locally
    const handleLocalDataChange = () => {
      handleSync(false, true); // Silent, but bypasses the cooldown!
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('local-data-changed', handleLocalDataChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('local-data-changed', handleLocalDataChange);
    };
  }, [session]);

  const startStudySession = (selectedCards: Flashcard[]) => {
    setActiveDeck(selectedCards);
    setCurrentView('study');
  };

  const openTopicView = (topicName: string) => {
    setViewingTopicName(topicName);
    setCurrentView('topic');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">
        <RefreshCw className="animate-spin mr-2" size={20} /> Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-20">
      <Toaster theme="dark" position="top-center" richColors />
      
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-white cursor-pointer" onClick={() => setCurrentView('home')}>
            Flash<span className="text-indigo-500">Focus</span>
          </h1>
          
          <div className="flex items-center gap-4">
            {session && (
              <nav className="hidden sm:flex gap-2 mr-2 pr-4 border-r border-zinc-800">
                <button 
                  onClick={() => setCurrentView('home')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${currentView === 'home' || currentView === 'topic' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  <Library size={18} />
                  My Decks
                </button>
                <button 
                  onClick={() => setCurrentView('create')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${currentView === 'create' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  <PlusSquare size={18} />
                  Create
                </button>
              </nav>
            )}

            {session && (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleSync(true)} // Manual sync bypasses cooldown
                  disabled={isSyncing}
                  className="text-zinc-400 hover:text-indigo-400 transition-colors flex items-center gap-2 text-sm bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isSyncing ? "animate-spin text-indigo-400" : ""} />
                  <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
                </button>
                <button 
                  onClick={() => setShowLogoutModal(true)} 
                  className="text-zinc-500 hover:text-red-400 transition-colors bg-zinc-900/50 p-2 rounded-full"
                  title="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="px-4">
        {!session ? (
          <Auth />
        ) : (
          <>
            {currentView === 'home' && <Home onStudy={startStudySession} onViewTopic={openTopicView} />}
            {currentView === 'create' && <CreateCard />}
            {currentView === 'study' && <StudySession deckCards={activeDeck} onExit={() => setCurrentView('home')} />}
            {currentView === 'topic' && (
              <TopicView 
                topicName={viewingTopicName} 
                onBack={() => setCurrentView('home')} 
                onStudy={startStudySession} 
              />
            )}
          </>
        )}
      </main>

      {session && (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-800 flex justify-around p-3 z-10 pb-safe">
          <button 
            onClick={() => setCurrentView('home')}
            className={`flex flex-col items-center gap-1 p-2 w-full transition-colors ${currentView === 'home' || currentView === 'topic' ? 'text-indigo-500' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Library size={24} />
            <span className="text-xs font-medium">Decks</span>
          </button>
          <button 
            onClick={() => setCurrentView('create')}
            className={`flex flex-col items-center gap-1 p-2 w-full transition-colors ${currentView === 'create' ? 'text-indigo-500' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <PlusSquare size={24} />
            <span className="text-xs font-medium">Create</span>
          </button>
        </nav>
      )}
      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2">Sign Out</h3>
            <p className="text-sm text-zinc-400 mb-6">Are you sure you want to sign out? Make sure your cards are fully synced.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowLogoutModal(false)} 
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowLogoutModal(false);
                  localStorage.removeItem('flashfocus_last_sync');
                  supabase.auth.signOut();
                }} 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg transition-colors font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;