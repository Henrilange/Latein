
export interface Vocab {
  la: string;
  de: string;
}

export type Tab = 'vocab' | 'quiz' | 'translate';

export interface Lesson {
  id: number;
  name: string;
  vocabs: Vocab[];
}

export type SortMode = 'alphabet' | 'date';
