import Dexie, { type Table } from 'dexie';
export interface Flashcard {
  id?: number;
  question: string;
  answer: string;
  tags: string[]; // e.g., ['biology', 'chapter1']
  lastReviewed?: Date;
  easeScore?: number; // Useful if you add Spaced Repetition later
}

export class FlashcardDatabase extends Dexie {
  cards!: Table<Flashcard>;

  constructor() {
    super('FlashcardDB');
    // Define the database schema
    // 'id' is the primary key. '*tags' allows you to search/filter by tags.
    this.version(1).stores({
      cards: '++id, question, *tags' 
    });
  }
}

export const db = new FlashcardDatabase();