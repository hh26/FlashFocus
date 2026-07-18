import Dexie, { type Table } from 'dexie';
export interface Flashcard {
  id: string; // Changed to string UUID
  question: string;
  answer: string;
  tags: string[];
  lastReviewed: Date;
  updatedAt: number; // Used to check which device has the newest edit
  isDeleted: boolean; // Soft deletes for sync
}

export class FlashFocusDB extends Dexie {
  cards!: Table;

  constructor() {
    super('FlashFocusDB');
    this.version(2).stores({
      cards: 'id, question, answer, *tags, lastReviewed, updatedAt, isDeleted'
    });
  }
}

export const db = new FlashFocusDB();