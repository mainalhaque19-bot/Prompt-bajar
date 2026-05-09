import React, { useState, useEffect } from 'react';
import { Home, Quote, Heart, User, Search, Share2, Copy, Trash2, Moon, Sun, Plus, X, MessageCircle, Github, Instagram, Send, Youtube, Sparkles, Wand2, Eye, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, loginWithGoogle, logout } from './lib/firebase';
import { GoogleGenAI } from "@google/genai";
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, getDocs, where, limit, orderBy, updateDoc, increment } from 'firebase/firestore';
import { AIPrompt, Shayari, Like } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const LoadingScreen = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-zinc-950"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
        className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/20 mb-6"
      >
        <Plus className="w-12 h-12 text-white" />
      </motion.div>
      <motion.h1 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-bold tracking-tighter"
      >
        AI Prompt
      </motion.h1>
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: 120 }}
        transition={{ delay: 0.5, duration: 1.5 }}
        className="h-1 bg-primary rounded-full mt-4"
      />
    </motion.div>
  );
};

// --- Main App Component ---

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('home');

  // Handle Tab history for back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab) {
        setActiveTab(event.state.tab);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    window.history.pushState({ tab }, '');
  };

  const [darkMode, setDarkMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [shayari, setShayari] = useState<Shayari[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Real-time data
    const unsubPrompts = onSnapshot(query(collection(db, 'prompts'), orderBy('createdAt', 'desc'), limit(50)), (snap) => {
      setPrompts(snap.docs.map(d => ({ id: d.id, ...d.data() } as AIPrompt)));
    });

    const unsubShayari = onSnapshot(query(collection(db, 'shayari'), orderBy('createdAt', 'desc'), limit(50)), (snap) => {
      setShayari(snap.docs.map(d => ({ id: d.id, ...d.data() } as Shayari)));
    });

    return () => {
      unsubAuth();
      unsubPrompts();
      unsubShayari();
    };
  }, [darkMode]);

  useEffect(() => {
    if (user) {
      const unsubLikes = onSnapshot(collection(db, 'users', user.uid, 'likes'), (snap) => {
        setLikes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Like)));
      });
      return () => unsubLikes();
    } else {
      setLikes([]);
    }
  }, [user]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  if (loading) return <LoadingScreen onComplete={() => setLoading(false)} />;

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto relative overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 max-w-md mx-auto px-4 py-4 flex flex-col gap-4 glass">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center">
              <Sparkles className="text-zinc-950 w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold leading-none flex items-center gap-1.5 font-display">
                PROMPT <span className="text-primary tracking-wide">BAJAR</span>
              </h1>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-[0.2em] leading-none mt-1.5 opacity-80">AI Art Discovery</p>
            </div>
          </div>
          <button onClick={toggleDarkMode} className="p-2 rounded-full bg-zinc-200 dark:bg-zinc-800 text-gray-500">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* Search Bar - Pill Style */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search prompt" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-100 dark:bg-zinc-900 pl-11 pr-4 py-3 rounded-full text-sm outline-none border border-white/5 focus:border-primary/50 transition-all font-medium"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="mt-36 px-4">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <HomePage key="home" prompts={prompts} likes={likes} user={user} search={searchQuery} />
          )}
          {activeTab === 'shayari' && (
            <ShayariPage key="shayari" shayari={shayari} likes={likes} user={user} />
          )}
          {activeTab === 'favorites' && (
            <FavoritesPage key="favorites" prompts={prompts} shayari={shayari} likes={likes} user={user} />
          )}
          {activeTab === 'profile' && (
            <ProfilePage 
              key="profile" 
              user={user} 
              prompts={prompts}
              likes={likes}
              onLogin={loginWithGoogle} 
              onLogout={logout} 
              onSeed={seedData} 
            />
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto px-4 py-3 bg-zinc-950/90 backdrop-blur-2xl border-t border-white/5 flex justify-around items-center rounded-t-[32px] shadow-2xl">
        <NavButton icon={<Sparkles size={24} />} label="Prompts" active={activeTab === 'home'} onClick={() => handleTabChange('home')} />
        <NavButton icon={<Youtube size={24} />} label="Featured" active={activeTab === 'favorites'} onClick={() => handleTabChange('favorites')} />
        <NavButton icon={<User size={24} />} label="Profile" active={activeTab === 'profile'} onClick={() => handleTabChange('profile')} />
      </nav>
    </div>
  );

  async function seedData() {
    if (!user) return loginWithGoogle();
    const pSnap = await getDocs(query(collection(db, 'prompts'), limit(1)));
    if (pSnap.empty) {
      await addDoc(collection(db, 'prompts'), {
        title: 'Cyberpunk Ninja',
        prompt: 'Futuristic ninja standing on a neon-lit rooftop, rain falling, intricate cybernetic armor, cinematic lighting, 8k resolution',
        imageUrl: 'https://picsum.photos/seed/cyber/800/1200',
        category: 'Cyberpunk',
        likesCount: 12,
        viewsCount: 156,
        copiesCount: 23,
        createdAt: serverTimestamp()
      });
      await addDoc(collection(db, 'prompts'), {
        title: 'Mystic Forest',
        prompt: 'A magical forest with glowing plants and floating islands, ethereal fog, fantasy art style, hyper-detailed',
        imageUrl: 'https://picsum.photos/seed/forest/800/1200',
        category: 'Fantasy',
        likesCount: 8,
        viewsCount: 89,
        copiesCount: 12,
        createdAt: serverTimestamp()
      });
    }
    const sSnap = await getDocs(query(collection(db, 'shayari'), limit(1)));
    if (sSnap.empty) {
      await addDoc(collection(db, 'shayari'), {
        content: 'Tere bina kaise jiyein, dil rota hai har pal.\nTu na ho toh zindagi, ek bikhra hua sapya.',
        category: 'Love',
        likesCount: 45,
        createdAt: serverTimestamp()
      });
      await addDoc(collection(db, 'shayari'), {
        content: 'Apni manzil khud chunna sikh lo,\nDuniya toh bas bher chaal chalti hai.',
        category: 'Attitude',
        likesCount: 67,
        createdAt: serverTimestamp()
      });
    }
  }
}

// --- Sub-Pages & Components ---

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn(
      "flex flex-col items-center gap-1 transition-all flex-1",
      active ? "text-primary scale-105" : "text-zinc-500 dark:text-zinc-500 opacity-60"
    )}>
      <div className={cn("transition-transform", active ? "scale-110" : "")}>{icon}</div>
      <span className="text-[10px] font-bold tracking-tight uppercase">{label}</span>
    </button>
  );
}

// 1. Home Page
function HomePage({ prompts, likes, user, search }: { prompts: AIPrompt[], likes: Like[], user: any, search: string, key?: any }) {
  const [category, setCategory] = useState('All');
  const [selectedPrompt, setSelectedPrompt] = useState<AIPrompt | null>(null);

  // Handle Android Back Button
  useEffect(() => {
    if (selectedPrompt) {
      window.history.pushState({ modal: 'prompt' }, '');
      
      // Increment views
      const incrementViews = async () => {
        try {
          const promptRef = doc(db, 'prompts', selectedPrompt.id);
          await updateDoc(promptRef, {
            viewsCount: increment(1)
          });
        } catch (e) {
          console.error("Error updating views:", e);
        }
      };
      incrementViews();
      
      const handlePopState = () => {
        setSelectedPrompt(null);
      };
      
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [selectedPrompt]);

  const categories = ['Trending', 'All', 'Fantasy', 'Cyberpunk', 'Nature', 'Anime', 'Realistic', 'Abstract'];
  
  const filtered = prompts
    .filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.prompt.toLowerCase().includes(search.toLowerCase());
      const matchesCat = category === 'All' || category === 'Trending' || p.category === category;
      return matchesSearch && matchesCat;
    })
    .sort((a, b) => {
      if (category === 'Trending') {
        return (b.likesCount || 0) - (a.likesCount || 0);
      }
      return 0; // Maintain default Firebase order (createdAt desc)
    });

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              "px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all",
              category === cat 
                ? "bg-zinc-800 text-white" 
                : "bg-zinc-900/50 text-gray-500 border border-white/5"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map(prompt => (
          <PromptCard 
            key={prompt.id} 
            prompt={prompt} 
            liked={likes.some(l => l.itemId === prompt.id)}
            onOpen={() => setSelectedPrompt(prompt)}
            user={user}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          No prompts found matching your criteria.
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedPrompt && (
          <PromptDetailModal 
            prompt={selectedPrompt} 
            liked={likes.some(l => l.itemId === selectedPrompt.id)}
            onClose={() => setSelectedPrompt(null)}
            user={user}
            allPrompts={prompts}
            onSelect={(p) => setSelectedPrompt(p)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- Home Page ---

// 2. Shayari Page
function ShayariPage({ shayari, likes, user }: { shayari: Shayari[], likes: Like[], user: any, key?: any }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const categories = ['All', 'Love', 'Sad', 'Inspirational', 'Attitude', 'Friendship'];
  
  const filtered = shayari.filter(s => {
    const matchesSearch = s.content.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === 'All' || s.category === category;
    return matchesSearch && matchesCat;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Search shayari..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              category === cat 
                ? "bg-primary text-white" 
                : "bg-zinc-100 dark:bg-zinc-900"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {filtered.map(s => (
          <ShayariCard 
            key={s.id} 
            shayari={s} 
            liked={likes.some(l => l.itemId === s.id)}
            user={user}
          />
        ))}
      </div>
    </motion.div>
  );
}

// 3. Favorites Page
function FavoritesPage({ prompts, shayari, likes, user }: { prompts: AIPrompt[], shayari: Shayari[], likes: Like[], user: any, key?: any }) {
  const likedPrompts = prompts.filter(p => likes.some(l => l.itemId === p.id && l.type === 'prompt'));
  const likedShayari = shayari.filter(s => likes.some(l => l.itemId === s.id && l.type === 'shayari'));

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <Heart size={48} className="text-gray-300" />
        <p className="text-gray-500">Log in to see your favorites</p>
        <button onClick={loginWithGoogle} className="px-6 py-2 bg-primary text-white rounded-full">Login</button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-8"
    >
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 font-display">
          <Heart size={18} className="text-red-500 fill-red-500" /> Liked Prompts
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {likedPrompts.map(p => <PromptCard key={p.id} prompt={p} liked={true} user={user} onOpen={() => {}} />)}
          {likedPrompts.length === 0 && <p className="col-span-2 text-center text-sm text-zinc-500 py-4 opacity-60">No liked prompts yet</p>}
        </div>
      </section>
    </motion.div>
  );
}

// 4. Profile Page
function ProfilePage({ user, prompts, likes, onLogin, onLogout, onSeed }: { user: any, prompts: AIPrompt[], likes: Like[], onLogin: () => void, onLogout: () => void, onSeed: () => void, key?: any }) {
  const totalLikes = likes.filter(l => l.type === 'prompt').length;
  const totalViews = prompts.reduce((acc, p) => acc + (p.viewsCount || 0), 0);
  const totalCopies = prompts.reduce((acc, p) => acc + (p.copiesCount || 0), 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center py-10 space-y-8 bg-zinc-50 dark:bg-[#030303] min-h-screen -mx-4 px-8"
    >
      <div className="w-full flex justify-center mb-4">
        <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/30">
          <Sparkles className="text-zinc-950 w-10 h-10" />
        </div>
      </div>

      <div className="relative group">
        <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-primary via-accent to-pink-500">
          <div className="w-full h-full rounded-full bg-white dark:bg-zinc-950 p-1">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="User" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <User size={48} className="text-zinc-400" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-black font-display tracking-tight text-zinc-900 dark:text-white">{user?.displayName || 'Guest User'}</h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest mt-1 opacity-90">{user?.email || 'Login to sync data'}</p>
      </div>

      {/* Stats Grid */}
      <div className="w-full grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-zinc-900/50 p-4 rounded-3xl border border-zinc-200 dark:border-white/5 flex flex-col items-center">
          <span className="text-xl font-black text-zinc-900 dark:text-white">{totalLikes}</span>
          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Likes</span>
        </div>
        <div className="bg-white dark:bg-zinc-900/50 p-4 rounded-3xl border border-zinc-200 dark:border-white/5 flex flex-col items-center">
          <span className="text-xl font-black text-zinc-900 dark:text-white">{totalViews}</span>
          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Views</span>
        </div>
        <div className="bg-white dark:bg-zinc-900/50 p-4 rounded-3xl border border-zinc-200 dark:border-white/5 flex flex-col items-center">
          <span className="text-xl font-black text-zinc-900 dark:text-white">{totalCopies}</span>
          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Copies</span>
        </div>
      </div>

      <div className="w-full grid grid-cols-1 gap-3">
        <SocialLink icon={<Instagram size={20} className="text-pink-500" />} label="Instagram" href="https://www.instagram.com/mainal_offical?igsh=YzdtaDZ1dmNpenlv" />
        <SocialLink icon={<Youtube size={20} className="text-red-500" />} label="YouTube" href="https://www.youtube.com/@Tbanglasong-y7h" />
      </div>

      {user ? (
        <div className="w-full space-y-3">
          <button onClick={onLogout} className="w-full py-4 border border-red-500/30 text-red-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-500/5 transition-all">
            Logout Account
          </button>
          <button onClick={onSeed} className="w-full py-2 text-xs text-zinc-500 dark:text-zinc-400 hover:text-primary transition-all underline opacity-70">
            Refresh / Seed Dummy Data
          </button>
        </div>
      ) : (
        <button onClick={onLogin} className="w-full py-4 bg-primary text-zinc-950 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/20 transition-all mt-4">
          Sign in with Google
        </button>
      )}
    </motion.div>
  );
}

// --- Component UI Helpers ---

function PromptCard({ prompt, liked, onOpen, user }: { prompt: AIPrompt, liked: boolean, onOpen: () => void, user: any, key?: any }) {
  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return loginWithGoogle();
    
    if (liked) {
      const q = query(collection(db, 'users', user.uid, 'likes'), where('itemId', '==', prompt.id));
      const snap = await getDocs(q);
      snap.forEach(d => deleteDoc(d.ref));
    } else {
      await addDoc(collection(db, 'users', user.uid, 'likes'), {
        itemId: prompt.id,
        type: 'prompt',
        addedAt: serverTimestamp()
      });
    }
  };

  return (
    <motion.div 
      layout
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      className="bg-zinc-900 rounded-[24px] overflow-hidden cursor-pointer group relative shadow-2xl border border-white/5"
    >
      <div className="aspect-[3/4] relative overflow-hidden">
        <img 
          src={prompt.imageUrl} 
          alt={prompt.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        
        {/* Overlay Badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
          <Eye size={12} className="text-white" />
          <span className="text-[10px] font-bold text-white tracking-tight">{prompt.viewsCount || 0}</span>
        </div>

        <div className="absolute top-2 left-[52px] flex items-center gap-1.5 px-2.5 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
          <Copy size={10} className="text-white" />
          <span className="text-[10px] font-bold text-white tracking-tight">{prompt.copiesCount || 0}</span>
        </div>

        <button 
          onClick={toggleLike}
          className="absolute top-2 right-2 p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-black/60 transition-colors"
        >
          <Heart size={14} className={cn(liked ? "fill-primary text-primary" : "text-white")} />
        </button>

        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
          <p className="text-[11px] font-bold text-white leading-tight line-clamp-1 opacity-90">{prompt.title}</p>
        </div>
      </div>
    </motion.div>
  );
}

function ShayariCard({ shayari, liked, user }: { shayari: Shayari, liked: boolean, user: any, key?: any }) {
  const toggleLike = async () => {
    if (!user) return loginWithGoogle();
    if (liked) {
      const q = query(collection(db, 'users', user.uid, 'likes'), where('itemId', '==', shayari.id));
      const snap = await getDocs(q);
      snap.forEach(d => deleteDoc(d.ref));
    } else {
      await addDoc(collection(db, 'users', user.uid, 'likes'), {
        itemId: shayari.id,
        type: 'shayari',
        addedAt: serverTimestamp()
      });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shayari.content);
    // Could add a toast here
  };

  const share = () => {
    if (navigator.share) {
      navigator.share({ text: shayari.content });
    }
  };

  return (
    <motion.div layout className="bg-zinc-100 dark:bg-zinc-900 p-6 rounded-3xl space-y-4 shadow-xl shadow-black/5 border border-white/5">
      <div className="aspect-video bg-zinc-200 dark:bg-zinc-800 rounded-xl flex items-center justify-center p-6 relative overflow-hidden group">
        <p className="text-lg italic font-serif leading-relaxed text-center relative z-10 break-words">{shayari.content}</p>
        <Quote className="absolute top-2 left-2 text-primary/10 w-20 h-20 -rotate-12" />
        <div className="absolute bottom-2 right-2 text-[10px] uppercase tracking-widest text-primary font-bold">{shayari.category}</div>
      </div>
      <div className="flex justify-between items-center px-2">
        <div className="flex gap-4">
          <button onClick={toggleLike} className="flex items-center gap-1.5 text-gray-500 hover:text-red-500 transition-colors">
            <Heart size={20} className={cn(liked && "fill-red-500 text-red-500")} />
          </button>
          <button onClick={share} className="flex items-center gap-1.5 text-gray-500 hover:text-primary transition-colors">
            <Share2 size={20} />
          </button>
        </div>
        <button onClick={copyToClipboard} className="text-gray-500 hover:text-primary transition-colors p-2 rounded-lg bg-zinc-200/50 dark:bg-zinc-800/50">
          <Copy size={18} />
        </button>
      </div>
    </motion.div>
  );
}

function SocialLink({ icon, label, href }: { icon: React.ReactNode, label: string, href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-zinc-100 dark:bg-zinc-900 border border-transparent dark:border-white/5 rounded-2xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all">
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-bold text-zinc-800 dark:text-zinc-200">{label}</span>
      </div>
      <Plus size={16} className="rotate-45 text-zinc-500" />
    </a>
  );
}

// --- Modals ---

function PromptDetailModal({ prompt, liked, onClose, user, allPrompts, onSelect }: { prompt: AIPrompt, liked: boolean, onClose: () => void, user: any, allPrompts: AIPrompt[], onSelect: (p: AIPrompt) => void }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const relatedPrompts = allPrompts.filter(p => p.id !== prompt.id && p.category === prompt.category).slice(0, 4);

  const handleGenerateClick = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setShowPrompt(true);
    }, 1500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-zinc-950 overflow-hidden"
    >
      {/* Detail Header */}
      <header className="px-4 py-4 flex justify-between items-center bg-zinc-950 border-b border-white/5">
        <button 
          onClick={() => {
            if (window.history.state?.modal) window.history.back();
            else onClose();
          }} 
          className="p-2 text-white hover:bg-white/5 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center">
            <Sparkles className="text-zinc-950 w-5 h-5" />
          </div>
          <h1 className="text-sm font-black leading-none flex items-center gap-1 font-display tracking-tight text-white uppercase">
            PROMPT <span className="text-primary italic">Bajar</span>
          </h1>
        </div>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-10 space-y-8">
        {/* Large Image Card */}
        <div className="relative group mt-4">
          <div className="aspect-square rounded-[40px] overflow-hidden bg-zinc-900 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] relative border border-white/5">
            <img src={prompt.imageUrl} alt={prompt.title} className="w-full h-full object-cover" />
            
            {/* Nav Arrows */}
            <button className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/40 backdrop-blur-2xl rounded-full text-white border border-white/10 active:scale-90 transition-transform">
              <ChevronLeft size={24} />
            </button>
            <button className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/40 backdrop-blur-2xl rounded-full text-white border border-white/10 active:scale-90 transition-transform">
              <ChevronRight size={24} />
            </button>

            {/* Pagination Dots */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <div className="w-6 h-1.5 rounded-full bg-primary shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            </div>
          </div>
        </div>

        {/* Generate Button / Result */}
        <div className="space-y-4 px-2">
          <AnimatePresence mode="wait">
            {!showPrompt ? (
              <motion.button 
                key="btn"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                onClick={handleGenerateClick}
                disabled={isGenerating}
                className="w-full py-5 bg-primary text-zinc-950 rounded-[24px] font-black text-lg shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)] flex items-center justify-center gap-3 active:scale-[0.97] transition-all font-display uppercase tracking-wider"
              >
                {isGenerating ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Wand2 size={24} />
                  </motion.div>
                ) : <Sparkles size={24} />}
                {isGenerating ? "Magic in progress..." : "Generate Magic Prompt"}
              </motion.button>
            ) : (
              <motion.div 
                key="prompt"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-zinc-900 border border-primary/20 p-6 rounded-[32px] relative shadow-2xl overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 bg-primary/5 rounded-full blur-3xl -mr-8 -mt-8" />
                <div className="absolute -top-3 left-8 px-4 py-1.5 bg-primary text-zinc-950 text-[10px] font-black uppercase rounded-full shadow-lg font-display tracking-widest">Prompt Ready</div>
                
                <div className="absolute top-3 right-8 flex items-center gap-3">
                  <div className="flex items-center gap-1 opacity-60">
                    <Eye size={12} className="text-zinc-400" />
                    <span className="text-[10px] font-bold text-zinc-400">{(prompt.viewsCount || 0) + 1}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-60">
                    <Copy size={10} className="text-zinc-400" />
                    <span className="text-[10px] font-bold text-zinc-400">{prompt.copiesCount || 0}</span>
                  </div>
                </div>

                <p className="text-sm italic text-zinc-200 leading-relaxed pr-10 break-words font-medium mt-2">{prompt.prompt}</p>
                <button 
                  onClick={async () => {
                    navigator.clipboard.writeText(prompt.prompt);
                    try {
                      await updateDoc(doc(db, 'prompts', prompt.id), {
                        copiesCount: increment(1)
                      });
                    } catch (e) {
                      console.error("Error updating copies:", e);
                    }
                  }}
                  className="absolute bottom-5 right-5 p-2.5 bg-zinc-800 rounded-xl text-zinc-400 hover:text-primary transition-all active:scale-90 border border-white/5"
                >
                  <Copy size={18} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Suggested Section */}
        <div className="pt-6">
          <div className="flex justify-between items-center mb-5 px-1">
            <h4 className="text-xl font-black font-display text-white tracking-tight uppercase">Suggested <span className="text-primary/60">For You</span></h4>
            <button className="text-primary text-[10px] font-black uppercase tracking-[0.2em] opacity-80">See all items</button>
          </div>
          <div className="grid grid-cols-2 gap-5">
            {relatedPrompts.map(p => (
              <button 
                key={p.id} 
                onClick={() => {
                  onSelect(p);
                  setShowPrompt(false);
                }}
                className="aspect-[3/4.5] rounded-[28px] overflow-hidden bg-zinc-900 border border-white/5 shadow-xl text-left transition-transform active:scale-95"
              >
                <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity duration-500" />
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* AD Placeholder Bottom */}
      <div className="bg-zinc-900/50 py-2 border-t border-white/5 text-center">
        <p className="text-[10px] text-gray-600 font-bold tracking-widest uppercase flex items-center justify-center gap-1">
          <X size={10} /> Advertisement
        </p>
      </div>
    </motion.div>
  );
}

// --- Navigation Component ---
