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
  importBooks: (books: SavedBook[]) => Promise<number>;
}

const DB_NAME = 'antoni_bookshelf_db';
const DB_VERSION = 1;
const STORE_NAME = 'books';
const LOCAL_STORAGE_KEY = 'historias_do_tony_bookshelf_v1';

const STARTER_BOOK: SavedBook = {
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
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not available'));
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllBooksFromDB(): Promise<SavedBook[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const res = (req.result as SavedBook[]) || [];
        // Sort newest first
        resolve(res.reverse());
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

async function saveBookToDB(book: SavedBook): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(book);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('saveBookToDB error:', err);
  }
}

async function deleteBookFromDB(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('deleteBookFromDB error:', err);
  }
}

async function initBooks(): Promise<SavedBook[]> {
  const dbBooks = await getAllBooksFromDB();
  if (dbBooks && dbBooks.length > 0) {
    return dbBooks;
  }

  // Check legacy localStorage
  let legacyBooks: SavedBook[] = [];
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) legacyBooks = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Legacy localStorage read error:', err);
  }

  if (legacyBooks && legacyBooks.length > 0) {
    for (const b of legacyBooks) {
      await saveBookToDB(b);
    }
    return legacyBooks;
  }

  // Default starter book
  await saveBookToDB(STARTER_BOOK);
  return [STARTER_BOOK];
}

export const useBookshelfStore = create<BookshelfStore>((set, get) => {
  // Asynchronously load all infinite books from IndexedDB on startup
  if (typeof window !== 'undefined') {
    initBooks().then((books) => {
      set({ books });
    });
  }

  return {
    books: [STARTER_BOOK],
    selectedBook: null,

    loadBooks: () => {
      initBooks().then((books) => set({ books }));
    },

    saveBook: (bookData) => {
      const newBook: SavedBook = {
        ...bookData,
        id: `book_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        createdAt: new Date().toLocaleDateString('pt-BR'),
      };
      const updated = [newBook, ...get().books.filter((b) => b.id !== newBook.id)];
      set({ books: updated, selectedBook: newBook });
      saveBookToDB(newBook);
      return newBook;
    },

    deleteBook: (id) => {
      const updated = get().books.filter((b) => b.id !== id);
      set({
        books: updated,
        selectedBook: get().selectedBook?.id === id ? null : get().selectedBook,
      });
      deleteBookFromDB(id);
    },

    selectBook: (selectedBook) => set({ selectedBook }),

    importBooks: async (importedList: SavedBook[]) => {
      const current = get().books;
      const currentIds = new Set(current.map((b) => b.id));
      const newItems = importedList.filter((b) => b && b.title && !currentIds.has(b.id));

      if (newItems.length > 0) {
        const merged = [...newItems, ...current];
        set({ books: merged });
        for (const b of newItems) {
          await saveBookToDB(b);
        }
      }
      return newItems.length;
    },
  };
});
