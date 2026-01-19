
import React from 'react';
import { Vocab } from '../types';

interface VocabItemProps {
  vocab: Vocab;
  onDelete: () => void;
}

export const VocabItem: React.FC<VocabItemProps> = ({ vocab, onDelete }) => {
  return (
    <div className="flex justify-between bg-slate-800/50 p-3 rounded-xl border border-white/5 items-center group transition-colors hover:bg-slate-700/50">
      <div className="flex items-center gap-3">
        <span className="text-purple-400 font-bold text-lg">{vocab.la}</span>
        <span className="text-slate-500 text-sm">→</span>
        <span className="text-slate-200">{vocab.de}</span>
      </div>
      <button
        onClick={onDelete}
        className="text-red-400/50 group-hover:text-red-400 text-sm font-medium transition-colors"
      >
        Löschen
      </button>
    </div>
  );
};
