
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Vocab, Tab, SortMode } from './types';
import { LESSONS } from './constants';
import { TabButton } from './components/TabButton';
import { VocabItem } from './components/VocabItem';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  // --- AUTH STATE ---
  // If process.env.APP_PIN is defined, we require it. 
  // For local development or if not set, we bypass.
  const REQUIRED_PIN = process.env.APP_PIN || "";
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (!REQUIRED_PIN) return true;
    return localStorage.getItem('app-auth') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // --- APP STATE ---
  const [vocabs, setVocabs] = useState<Vocab[]>(() => {
    const saved = localStorage.getItem('latin-vocabs-v2');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTab, setActiveTab] = useState<Tab>('vocab');
  const [sortMode, setSortMode] = useState<SortMode>('date');
  const [inLatin, setInLatin] = useState('');
  const [inGerman, setInGerman] = useState('');
  const [showLessons, setShowLessons] = useState(false);
  const [loadingScan, setLoadingScan] = useState(false);

  // Quiz State
  const [quizItem, setQuizItem] = useState<Vocab | null>(null);
  const [quizInput, setQuizInput] = useState('');
  const [quizFeedback, setQuizFeedback] = useState<{ msg: string; color: string } | null>(null);

  // Translate State
  const [transInput, setTransInput] = useState('');
  const [transOutput, setTransOutput] = useState('');
  const [loadingTrans, setLoadingTrans] = useState(false);

  // --- EFFECTS ---
  useEffect(() => {
    localStorage.setItem('latin-vocabs-v2', JSON.stringify(vocabs));
  }, [vocabs]);

  // --- AUTH HANDLERS ---
  const handleLogin = () => {
    if (pinInput === REQUIRED_PIN) {
      setIsAuthenticated(true);
      localStorage.setItem('app-auth', 'true');
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('app-auth');
  };

  // --- APP HANDLERS ---
  const addVocabManual = () => {
    if (!inLatin || !inGerman) return;
    setVocabs(prev => [{ la: inLatin, de: inGerman }, ...prev]);
    setInLatin('');
    setInGerman('');
  };

  const deleteVocab = (index: number) => {
    setVocabs(prev => prev.filter((_, i) => i !== index));
  };

  const addLesson = (lessonId: number) => {
    const lesson = LESSONS.find(l => l.id === lessonId);
    if (!lesson) return;
    
    setVocabs(prev => {
      const existingKeys = new Set(prev.map(v => `${v.la}|${v.de}`));
      const newOnes = lesson.vocabs.filter(v => !existingKeys.has(`${v.la}|${v.de}`));
      return [...newOnes, ...prev];
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, mode: 'vocab' | 'text') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingScan(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        if (mode === 'vocab') {
          const extracted = await geminiService.extractVocabFromImage(base64);
          setVocabs(prev => {
             const existingKeys = new Set(prev.map(v => `${v.la}|${v.de}`));
             const newOnes = extracted.filter(v => !existingKeys.has(`${v.la}|${v.de}`));
             return [...newOnes, ...prev];
          });
        } else {
          const text = await geminiService.extractTextFromImage(base64);
          setTransInput(text);
        }
      } catch (err: any) {
        alert("Fehler beim Scannen: " + err.message);
      } finally {
        setLoadingScan(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTranslate = async () => {
    if (!transInput) return;
    setLoadingTrans(true);
    try {
      const result = await geminiService.translateLatinText(transInput, vocabs);
      setTransOutput(result);
    } catch (err: any) {
      alert("Übersetzungsfehler: " + err.message);
    } finally {
      setLoadingTrans(false);
    }
  };

  const startQuiz = () => {
    if (vocabs.length === 0) {
      alert("Bitte füge zuerst Vokabeln hinzu!");
      return;
    }
    const random = vocabs[Math.floor(Math.random() * vocabs.length)];
    setQuizItem(random);
    setQuizInput('');
    setQuizFeedback(null);
  };

  const checkQuizAnswer = () => {
    if (!quizItem) return;
    const isCorrect = quizInput.trim().toLowerCase() === quizItem.de.toLowerCase();
    setQuizFeedback({
      msg: isCorrect ? "Richtig! ✨" : `Falsch. Lösung: ${quizItem.de}`,
      color: isCorrect ? "text-emerald-400" : "text-red-400"
    });
  };

  const sortedVocabs = useMemo(() => {
    let list = [...vocabs];
    if (sortMode === 'alphabet') {
      list.sort((a, b) => a.la.localeCompare(b.la));
    }
    return list;
  }, [vocabs, sortMode]);

  // --- RENDER LOCK SCREEN ---
  if (!isAuthenticated && REQUIRED_PIN) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
        <div className="max-w-md w-full bg-slate-800 border border-purple-500/30 rounded-3xl p-10 shadow-2xl text-center">
          <div className="text-6xl mb-6">🔒</div>
          <h1 className="text-2xl font-bold mb-2">Zugriff geschützt</h1>
          <p className="text-slate-400 mb-8 text-sm">Bitte gib die PIN ein, um Translate Latin AI zu nutzen.</p>
          
          <input 
            type="password" 
            value={pinInput}
            onChange={e => setPinInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="PIN Code"
            className={`w-full p-4 bg-slate-700 rounded-xl text-center text-2xl tracking-widest outline-none border-2 transition-all ${pinError ? 'border-red-500 animate-shake' : 'border-transparent focus:border-purple-500'}`}
          />
          
          {pinError && <p className="text-red-400 text-xs mt-2 font-bold uppercase tracking-widest">Falsche PIN!</p>}
          
          <button 
            onClick={handleLogin}
            className="w-full mt-6 bg-purple-600 hover:bg-purple-500 py-4 rounded-xl font-bold text-lg shadow-lg shadow-purple-900/20 transition-all"
          >
            Entsperren
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER MAIN APP ---
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 pb-24">
      <header className="bg-slate-800 border border-purple-500/30 rounded-3xl p-8 text-center mb-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500"></div>
        <div className="flex justify-between items-start mb-2">
           <div className="w-10"></div>
           <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
            Translate Latin AI
          </h1>
          <button 
            onClick={handleLogout}
            className="text-slate-500 hover:text-slate-300 transition-colors text-xl"
            title="Abmelden"
          >
            🚪
          </button>
        </div>
        <p className="text-slate-400 mt-2 text-sm tracking-widest uppercase">Powered by Gemini 3</p>
      </header>

      <nav className="flex bg-slate-800 rounded-2xl overflow-hidden border border-purple-500/20 mb-8 sticky top-4 z-50 backdrop-blur-md bg-opacity-90 shadow-lg">
        <TabButton id="vocab" active={activeTab === 'vocab'} onClick={setActiveTab} label="Vokabeln" />
        <TabButton id="quiz" active={activeTab === 'quiz'} onClick={setActiveTab} label="Quiz" />
        <TabButton id="translate" active={activeTab === 'translate'} onClick={setActiveTab} label="Übersetzer" />
      </nav>

      {/* --- VOCAB TAB --- */}
      {activeTab === 'vocab' && (
        <section className="space-y-6 animate-fade-in">
          <div className="bg-slate-800 p-6 rounded-3xl border border-purple-500/20 shadow-xl">
            <h2 className="font-bold text-purple-300 mb-4 flex items-center gap-2">Vokabeln hinzufügen</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <input 
                type="text" 
                value={inLatin}
                onChange={e => setInLatin(e.target.value)}
                placeholder="Latein (z.B. amicus)" 
                className="p-4 bg-slate-700 rounded-xl outline-none focus:ring-2 ring-purple-500/50 transition-all" 
              />
              <input 
                type="text" 
                value={inGerman}
                onChange={e => setInGerman(e.target.value)}
                placeholder="Deutsch (z.B. Freund)" 
                className="p-4 bg-slate-700 rounded-xl outline-none focus:ring-2 ring-purple-500/50 transition-all" 
              />
            </div>
            <button 
              onClick={addVocabManual}
              className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-xl font-bold transition-colors mb-4 shadow-lg shadow-indigo-900/20"
            >
              Hinzufügen
            </button>
            
            <div className="space-y-3">
              <button 
                onClick={() => setShowLessons(!showLessons)} 
                className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-xl font-bold transition-all flex justify-center items-center gap-2"
              >
                <span>📚 Vokabel-Lektionen</span>
                <span className={`transform transition-transform ${showLessons ? 'rotate-180' : ''}`}>▼</span>
              </button>
              
              {showLessons && (
                <div className="bg-slate-700/40 rounded-2xl p-4 space-y-3 animate-fade-in">
                  {LESSONS.map(l => (
                    <div key={l.id} className="flex justify-between items-center bg-slate-700 p-3 rounded-xl">
                      <span className="font-semibold">{l.name}</span>
                      <button 
                        onClick={() => addLesson(l.id)}
                        className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                      >
                        Hinzufügen
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative">
                <input 
                  type="file" 
                  id="vocab-scan-input" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={e => handleFileChange(e, 'vocab')}
                  disabled={loadingScan}
                />
                <button 
                  onClick={() => document.getElementById('vocab-scan-input')?.click()}
                  disabled={loadingScan}
                  className={`w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold flex justify-center items-center gap-2 transition-all ${loadingScan ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span>{loadingScan ? '⏳ Scannen...' : '📷 Vokabeln scannen'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 p-6 rounded-3xl border border-purple-500/20 shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <h3 className="font-bold text-purple-300 text-xl">Deine Liste</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setSortMode('alphabet')} 
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${sortMode === 'alphabet' ? 'bg-purple-600' : 'bg-slate-700 hover:bg-slate-600 text-slate-400'}`}
                >
                  A-Z
                </button>
                <button 
                  onClick={() => setSortMode('date')} 
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${sortMode === 'date' ? 'bg-purple-600' : 'bg-slate-700 hover:bg-slate-600 text-slate-400'}`}
                >
                  Datum
                </button>
              </div>
            </div>
            
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {sortedVocabs.length === 0 ? (
                <div className="text-center py-12 text-slate-500 italic">
                  Noch keine Vokabeln vorhanden. Nutze die Lektionen oder scanne ein Buch!
                </div>
              ) : (
                sortedVocabs.map((v, i) => (
                  <VocabItem key={`${v.la}-${i}`} vocab={v} onDelete={() => deleteVocab(i)} />
                ))
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 text-right">
              <span className="text-sm text-slate-400 italic">Gesamt: {vocabs.length} Vokabeln</span>
            </div>
          </div>
        </section>
      )}

      {/* --- QUIZ TAB --- */}
      {activeTab === 'quiz' && (
        <section className="flex flex-col items-center justify-center py-10 animate-fade-in">
          {!quizItem ? (
            <div className="text-center space-y-6">
              <div className="bg-purple-500/10 p-8 rounded-full inline-block mb-4 shadow-inner">
                <span className="text-6xl">🎓</span>
              </div>
              <h2 className="text-3xl font-bold">Bist du bereit?</h2>
              <p className="text-slate-400 max-w-sm">Teste dein Wissen mit den Vokabeln aus deiner Liste.</p>
              <button 
                onClick={startQuiz}
                className="bg-purple-600 hover:bg-purple-500 px-12 py-5 rounded-2xl font-bold text-xl shadow-xl shadow-purple-900/30 transition-all hover:scale-105"
              >
                Quiz starten
              </button>
            </div>
          ) : (
            <div className="w-full max-w-md bg-slate-800 p-10 rounded-3xl border border-purple-500/20 shadow-2xl text-center">
              <p className="text-xs text-purple-400 uppercase tracking-widest mb-4">Was bedeutet:</p>
              <h2 className="text-5xl font-extrabold mb-10 text-white">{quizItem.la}</h2>
              
              <input 
                type="text" 
                autoFocus
                value={quizInput}
                onChange={e => setQuizInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (quizFeedback ? startQuiz() : checkQuizAnswer())}
                placeholder="Deine Antwort..." 
                className="w-full p-5 bg-slate-700 rounded-2xl text-center text-2xl mb-6 outline-none border-2 border-transparent focus:border-purple-500 transition-all" 
              />
              
              {quizFeedback && (
                <div className={`mb-6 p-4 rounded-xl bg-white/5 font-bold animate-bounce ${quizFeedback.color}`}>
                  {quizFeedback.msg}
                </div>
              )}
              
              <button 
                onClick={quizFeedback ? startQuiz : checkQuizAnswer}
                className={`w-full py-5 rounded-2xl font-bold text-lg transition-all ${quizFeedback ? 'bg-slate-700' : 'bg-indigo-600 hover:bg-indigo-500'}`}
              >
                {quizFeedback ? 'Nächste Frage' : 'Prüfen'}
              </button>
              
              <button 
                onClick={() => setQuizItem(null)}
                className="mt-6 text-slate-500 text-sm hover:text-slate-300 transition-colors"
              >
                Quiz beenden
              </button>
            </div>
          )}
        </section>
      )}

      {/* --- TRANSLATE TAB --- */}
      {activeTab === 'translate' && (
        <section className="space-y-6 animate-fade-in">
          <div className="bg-slate-800 p-6 rounded-3xl border border-purple-500/20 shadow-xl">
            <textarea 
              value={transInput}
              onChange={e => setTransInput(e.target.value)}
              className="w-full h-48 bg-slate-900/50 border border-purple-500/10 rounded-2xl p-6 outline-none focus:border-purple-500 transition-all resize-none text-lg" 
              placeholder="Lateinischen Text hier einfügen..."
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="relative">
                <input 
                  type="file" 
                  id="trans-scan-input" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={e => handleFileChange(e, 'text')}
                />
                <button 
                  onClick={() => document.getElementById('trans-scan-input')?.click()}
                  className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-bold flex justify-center items-center gap-2 transition-all shadow-lg shadow-blue-900/20"
                >
                  <span>📷 Text scannen</span>
                </button>
              </div>
              
              <button 
                onClick={handleTranslate}
                disabled={loadingTrans || !transInput}
                className={`w-full bg-orange-600 hover:bg-orange-500 py-4 rounded-2xl font-bold shadow-lg shadow-orange-900/20 transition-all flex justify-center items-center gap-2 ${loadingTrans || !transInput ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span>{loadingTrans ? '⏳ Übersetze...' : '⚡ Jetzt Übersetzen'}</span>
              </button>
            </div>
          </div>
          
          {transOutput && (
            <div className="bg-emerald-900/10 border border-emerald-500/30 p-8 rounded-3xl animate-fade-in shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-emerald-400 font-bold uppercase tracking-tighter">KI-Übersetzung:</h4>
                <button 
                  onClick={() => setTransOutput('')}
                  className="text-slate-500 hover:text-slate-300 text-xs"
                >
                  Leeren
                </button>
              </div>
              <p className="text-xl leading-relaxed text-slate-100">{transOutput}</p>
              <div className="mt-4 pt-4 border-t border-emerald-500/10 text-xs text-slate-500 italic">
                Hinweis: Unbekannte Wörter werden als [unbekannt] markiert.
              </div>
            </div>
          )}
        </section>
      )}
      
      <footer className="mt-12 text-center text-slate-500 text-sm">
        <p>&copy; 2024 Translate Latin AI - Secured via Environment Variables</p>
        <p className="mt-1">Design & Code von Henri Lange</p>
      </footer>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default App;
