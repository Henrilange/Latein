
import React from 'react';
import { Tab } from '../types';

interface TabButtonProps {
  id: Tab;
  active: boolean;
  onClick: (id: Tab) => void;
  label: string;
}

export const TabButton: React.FC<TabButtonProps> = ({ id, active, onClick, label }) => {
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex-1 py-4 font-bold transition-all duration-300 ${
        active 
          ? 'border-b-4 border-purple-500 text-purple-200 bg-purple-500/10' 
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
      }`}
    >
      {label}
    </button>
  );
};
