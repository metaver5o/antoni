import { create } from 'zustand';
import type { Gap, ParsedStory } from '../types';

export interface SavedBook {
  id: string;
  title: string;
  cleanStory: string;
  fullStory: string;
  gaps: Gap[];
  coverColor: string;
  coverEmoji: string;
  drawingDataUrl: string | null;
  childAudioUrl: string | null;
  createdAt: string;
}

interface BookshelfStore {
  books: SavedBook[];
  selectedBook: SavedBook | null;
  loadBooks: () => void;
  saveBook: (book: Omit<SavedBook, 'id' | 'createdAt'>) => SavedBook;
  deleteBook: (id: string) => void;
  selectBook: (book: SavedBook | null) => void;
}

const STORAGE_KEY = 'historias_do_tony_bookshelf_v1';

function getInitialBooks(): SavedBook[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to load bookshelf from localStorage:', err);
  }
  // Default first starter book for new kids
  return [
    {
      id: 'starter-1',
      title: 'O Cachorro no Parque',
      cleanStory: 'O [1] correu atras da [2] no [3].',
      fullStory: 'O CACHORRO correu atras da BOLA no PARQUE.',
      gaps: [
        { id: 1, word: 'CACHORRO', icon: 'paw-print' },
        { id: 2, word: 'BOLA', icon: 'circle' },
        { id: 3, word: 'PARQUE', icon: 'leaf' },
      ],
      coverColor: '#7C3AED',
      coverEmoji: '🐶',
      drawingDataUrl: null,
      childAudioUrl: null,
      createdAt: new Date().toLocaleDateString('pt-BR'),
    },
  ];
}

function persistBooks(books: SavedBook[]) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  } catch (err) {
    console.warn('Failed to persist bookshelf:', err);
  }
}

export const useBookshelfStore = create<BookshelfStore>((set, get) => ({
  books: getInitialBooks(),
  selectedBook: null,

  loadBooks: () => {
    set({ books: getInitialBooks() });
  },

  saveBook: (bookData) => {
    const newBook: SavedBook = {
      ...bookData,
      id: `book_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toLocaleDateString('pt-BR'),
    };
    const updated = [newBook, ...get().books];
    set({ books: updated, selectedBook: newBook });
    persistBooks(updated);
    return newBook;
  },

  deleteBook: (id) => {
    const updated = get().books.filter((b) => b.id !== id);
    set({
      books: updated,
      selectedBook: get().selectedBook?.id === id ? null : get().selectedBook,
    });
    persistBooks(updated);
  },

  selectBook: (selectedBook) => set({ selectedBook }),
}));
