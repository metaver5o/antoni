export interface Gap {
  id: number;
  word: string;
  icon: string;
}

export interface ParsedStory {
  cleanStory: string; // "O [1] correu atras da [2] no [3]."
  gaps: Gap[];
}

export type AppScreen = 'RECORDER' | 'PROCESSING' | 'GAME' | 'BOOKSHELF';

export interface SlotLayout {
  pageX: number;
  pageY: number;
  width: number;
  height: number;
}

export type StorySegment =
  | { type: 'text'; content: string }
  | { type: 'gap'; id: number };
