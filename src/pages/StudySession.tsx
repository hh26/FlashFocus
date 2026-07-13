import { useState, useEffect } from 'react';
import { type Flashcard } from '../db';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, RotateCw, CheckCircle } from 'lucide-react';

interface StudySessionProps {
  deckCards: Flashcard[]; // Accept pre-filtered cards from Home
  onExit: () => void;
}

export default function StudySession({ deckCards, onExit }: StudySessionProps) {
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Shuffle whatever cards were passed down
  useEffect(() => {
    if (deckCards && deckCards.length > 0) {
      const shuffled = [...deckCards].sort(() => Math.random() - 0.5);
      setDeck(shuffled);
    }
  }, [deckCards]);

  if (deckCards.length === 0) return <div className="text-center mt-20 text-zinc-400">No cards selected to study!</div>;

  const currentCard = deck[currentIndex];
  const isFinished = currentIndex >= deck.length;

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => prev + 1), 150); // slight delay for flip reset
  };

  if (isFinished) {
    return (
      <div className="max-w-xl mx-auto mt-20 text-center bg-zinc-900 border border-zinc-800 p-10 rounded-2xl shadow-2xl">
        <CheckCircle className="mx-auto h-16 w-16 text-indigo-500 mb-4" />
        <h2 className="text-3xl font-bold text-zinc-100 mb-2">Deck Completed!</h2>
        <p className="text-zinc-400 mb-8">Great job reviewing {deck.length} cards today.</p>
        <button 
          onClick={onExit}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 flex flex-col items-center">
      
      {/* Header / Progress */}
      <div className="w-full flex justify-between items-center mb-8 px-4">
        <button onClick={onExit} className="text-zinc-400 hover:text-zinc-100 flex items-center gap-1 transition-colors">
          <ArrowLeft size={20} /> Exit
        </button>
        <span className="text-zinc-400 font-medium">
          {currentIndex + 1} / {deck.length}
        </span>
      </div>

      {/* The Flashcard */}
      <div 
        className="relative w-full aspect-[4/3] md:aspect-[16/9] perspective-1000 cursor-pointer group"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <motion.div
          className="w-full h-full relative preserve-3d"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front of Card (Question) */}
          <div className="absolute inset-0 backface-hidden bg-zinc-900 border border-zinc-700 rounded-2xl shadow-xl flex flex-col justify-center items-center p-8 text-center group-hover:border-indigo-500/50 transition-colors">
            <span className="absolute top-4 left-4 text-xs font-bold text-indigo-500 uppercase tracking-wider">Question</span>
            <h3 className="text-2xl md:text-3xl font-medium text-zinc-100">{currentCard?.question}</h3>
            <div className="absolute bottom-4 text-zinc-500 flex items-center gap-2 text-sm">
              <RotateCw size={16} /> Tap to flip
            </div>
          </div>

          {/* Back of Card (Answer) */}
          <div 
            className="absolute inset-0 backface-hidden bg-indigo-950 border border-indigo-800 rounded-2xl shadow-xl flex flex-col justify-center items-center p-8 text-center"
            style={{ transform: 'rotateY(180deg)' }}
          >
            <span className="absolute top-4 left-4 text-xs font-bold text-indigo-400 uppercase tracking-wider">Answer</span>
            <h3 className="text-2xl md:text-3xl font-medium text-indigo-100">{currentCard?.answer}</h3>
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="mt-12 flex gap-4 w-full px-4">
        <button 
          onClick={() => setIsFlipped(!isFlipped)}
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 py-4 rounded-xl font-medium transition-colors"
        >
          {isFlipped ? 'Show Question' : 'Show Answer'}
        </button>
        <button 
          onClick={handleNext}
          disabled={!isFlipped}
          className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-medium transition-colors ${
            isFlipped 
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer' 
              : 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
          }`}
        >
          Next Card <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}