import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  MessageSquareCode, 
  Activity, 
  BookOpen, 
  User, 
  LogOut, 
  Bell, 
  Search,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Wrench
} from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from 'sonner';
import { Dashboard } from './components/Dashboard';
import { DiagnosticChat } from './components/DiagnosticChat';
import { AdvancedMaintenanceJournal } from './components/AdvancedMaintenanceJournal';
import { OBDScanner } from './components/OBDScanner';
import { KnowledgeBase } from './components/KnowledgeBase';
import { Profile } from './components/Profile';
import { Auth } from './components/Auth';
import { supabase } from './utils/supabase/client';
import { projectId, publicAnonKey } from './utils/supabase/info';
import { ImageWithFallback } from './components/figma/ImageWithFallback';

type Tab = 'dashboard' | 'diagnostics' | 'obd' | 'knowledge' | 'profile' | 'maintenance';

declare global {
  interface Window {
    Telegram: any;
  }
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAutoAuthenticating, setIsAutoAuthenticating] = useState(false);
  const [cars, setCars] = useState<any[]>([]);
  const [activeCarIndex, setActiveCarIndex] = useState(0);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Chat state persistence
  const [chatMessages, setChatMessages] = useState<any[]>([
    { id: '1', role: 'assistant', content: 'Здравствуйте! Я ваш ИИ-автомеханик. Опишите симптомы неисправности или введите коды ошибок OBD-II.' }
  ]);

  const BUILD_VERSION = "4.2.11-ai-fix";

  const safeParse = (str: string | null, fallback: any) => {
    if (!str) return fallback;
    try {
      return JSON.parse(str.trim());
    } catch (e) {
      return fallback;
    }
  };

  useEffect(() => {
    try {
      const savedCarsStr = localStorage.getItem('autoai_cars');
      const parsedCars = safeParse(savedCarsStr, []);
      setCars(parsedCars);

      const savedCarIndex = localStorage.getItem('autoai_active_car_index');
      if (savedCarIndex !== null) {
        const idx = parseInt(savedCarIndex);
        if (!isNaN(idx)) setActiveCarIndex(idx);
      }

      const savedChat = localStorage.getItem('autoai_chat_history');
      if (savedChat) {
        const parsedChat = safeParse(savedChat, null);
        if (Array.isArray(parsedChat)) setChatMessages(parsedChat);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('autoai_cars', JSON.stringify(cars));
  }, [cars]);

  useEffect(() => {
    localStorage.setItem('autoai_active_car_index', activeCarIndex.toString());
  }, [activeCarIndex]);

  useEffect(() => {
    if (chatMessages.length > 1) {
      localStorage.setItem('autoai_chat_history', JSON.stringify(chatMessages));
    }
  }, [chatMessages]);

  const fetchUserData = async (user: any) => {
    try {
      const tgId = user.user_metadata?.telegram_id;
      if (tgId) {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac2bdc5c/user-data?tgId=${tgId}`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.cars && Array.isArray(data.cars)) setCars(data.cars);
          if (data.profile) setUserProfile(data.profile);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addCar = (car: any) => {
    setCars(prev => {
      const newCar = { 
        ...car, 
        id: Date.now().toString(), 
        dashboardData: { 
          currentOdometer: Number(car.mileage) || 0,
          oilStatus: null,
          brakeStatus: null
        } 
      };
      const newCars = [...prev, newCar];
      if (prev.length === 0) setActiveCarIndex(0);
      syncCarsWithServer(newCars);
      return newCars;
    });
  };

  const updateDashboardData = (newData: any) => {
    setCars(prev => {
      const newCars = [...prev];
      if (newCars[activeCarIndex]) {
        newCars[activeCarIndex] = { ...newCars[activeCarIndex], dashboardData: newData };
      }
      syncCarsWithServer(newCars);
      return newCars;
    });
  };

  const deleteCar = (id: string) => {
    if (!window.confirm("Удалить автомобиль?")) return;
    setCars(prev => {
      const newCars = prev.filter(c => c.id !== id);
      const newIndex = Math.max(0, Math.min(activeCarIndex, newCars.length - 1));
      setActiveCarIndex(newIndex);
      syncCarsWithServer(newCars);
      return newCars;
    });
    toast.success("Автомобиль удален");
  };

  const syncCarsWithServer = (currentCars: any[]) => {
    const tgId = session?.user?.user_metadata?.telegram_id;
    if (tgId) {
      fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac2bdc5c/save-cars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ tgId, cars: currentCars })
      });
    }
  };

  const switchCar = (index: number) => {
    setActiveCarIndex(index);
    setActiveTab('dashboard');
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-web-app.js';
    script.async = true;
    script.onload = () => {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) { tg.ready(); tg.expand(); }
    };
    document.body.appendChild(script);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) handleTelegramAutoAuth();
      else fetchUserData(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserData(session.user);
    });

    return () => {
      subscription.unsubscribe();
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  const handleTelegramAutoAuth = async () => {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg && tg.initData) {
        setIsAutoAuthenticating(true);
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac2bdc5c/telegram-auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ initData: tg.initData })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.email && data.password) {
            await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAutoAuthenticating(false);
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Вы вышли из системы');
  };

  if (isLoading || isAutoAuthenticating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return <><Auth /><Toaster position="bottom-right" richColors /></>;

  const navItems = [
    { id: 'dashboard', label: 'Ра��очий стол', icon: LayoutDashboard },
    { id: 'maintenance', label: 'Журнал ТО', icon: Wrench },
    { id: 'diagnostics', label: 'ИИ Диагностика', icon: MessageSquareCode },
    { id: 'obd', label: 'OBD-II Сканер', icon: Activity },
    { id: 'knowledge', label: 'База знаний', icon: BookOpen },
    { id: 'profile', label: 'Мой профиль', icon: User },
  ];

  const bottomNavItems = [
    { id: 'dashboard', label: 'Рабочий стол', icon: LayoutDashboard },
    { id: 'maintenance', label: 'Журнал ТО', icon: Wrench },
    { id: 'profile', label: 'Профиль', icon: User },
  ];

  const activeCar = cars[activeCarIndex] || null;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden relative">
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.03] pointer-events-none overflow-hidden">
        <ImageWithFallback 
          src="https://images.unsplash.com/photo-1688748807457-d8926e351596?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
          className="w-[120%] h-auto rotate-12"
        />
      </div>

      <aside className={`hidden lg:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 relative z-20 ${isSidebarOpen ? 'w-72' : 'w-24'}`}>
        <div className="p-8 flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100">
            <Activity size={24} className="text-white" />
          </div>
          {isSidebarOpen && <span className="font-black text-2xl tracking-tight text-slate-900">AutoAI</span>}
        </div>

        <nav className="flex-1 px-4 space-y-2 py-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
            >
              <item.icon size={22} className="shrink-0" />
              {isSidebarOpen && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-full flex items-center justify-center p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-slate-600 transition-all">
            {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
          <div className="mt-4 p-4 bg-slate-50 rounded-2xl flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-600 shrink-0 capitalize">
              {session?.user?.email?.[0] || 'A'}
            </div>
            {isSidebarOpen && (
              <div className="truncate">
                <p className="text-xs font-black text-slate-900 truncate">{session?.user?.user_metadata?.full_name || 'User'}</p>
                <p className="text-[10px] text-slate-400 truncate">{session?.user?.email}</p>
              </div>
            )}
            {isSidebarOpen && <LogOut onClick={handleLogout} size={16} className="text-slate-300 ml-auto cursor-pointer hover:text-rose-500 transition-colors" />}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <header className="h-20 bg-white border-b border-slate-200/50 px-4 lg:px-12 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-2 lg:gap-4 flex-1">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"><Menu size={24} /></button>
            <div className="max-w-[200px] w-full relative hidden xl:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input type="text" placeholder="Поиск..." className="w-full bg-slate-50 border-none rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:ring-2 ring-indigo-500 outline-none transition-all" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 lg:gap-3 flex-1">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-indigo-600 rounded-xl lg:rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100"><Activity size={20} className="text-white lg:scale-110" /></div>
            <span className="font-black text-xl lg:text-2xl tracking-tight text-slate-900">AutoAI</span>
          </div>

          <div className="flex items-center justify-end gap-2 md:gap-4 flex-1">
            <button className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl relative transition-all"><Bell size={18} /><span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-rose-500 rounded-full border-2 border-white"></span></button>
            <div className="hidden sm:flex flex-col items-end">
              <p className="text-[10px] font-black uppercase text-slate-900 leading-none mb-1">{session?.user?.user_metadata?.full_name?.split(' ')[0] || 'User'}</p>
              <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest leading-none">Online</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-12 pb-32 lg:pb-12">
          <div className="max-w-6xl mx-auto h-full">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="h-full">
                <div className="mb-8">
                  <h1 className="text-sm font-black text-indigo-600 uppercase tracking-[0.3em] mb-1">{navItems.find(i => i.id === activeTab)?.label}</h1>
                  <p className="text-slate-400 text-xs font-medium">AutoAI v{BUILD_VERSION} • Профессиональная диагностика и мониторинг</p>
                </div>
                {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} activeCar={activeCar} dashboardData={activeCar?.dashboardData} setDashboardData={updateDashboardData} onDeleteCar={deleteCar} />}
                {activeTab === 'maintenance' && (
                  <AdvancedMaintenanceJournal 
                    cars={cars} 
                    onAddCar={addCar} 
                    onDeleteCar={deleteCar} 
                  />
                )}
                {activeTab === 'diagnostics' && <DiagnosticChat messages={chatMessages} setMessages={setChatMessages} activeCar={activeCar} />}
                {activeTab === 'obd' && <OBDScanner />}
                {activeTab === 'knowledge' && <KnowledgeBase />}
                {activeTab === 'profile' && <Profile session={session} userProfile={userProfile} cars={cars} onAddCar={addCar} onDeleteCar={deleteCar} activeCarIndex={activeCarIndex} onSwitchCar={switchCar} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        <nav className="lg:hidden fixed bottom-6 left-6 right-6 h-20 bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-[32px] flex items-center justify-around px-6 z-50">
          {bottomNavItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as Tab)} className="relative flex flex-col items-center justify-center gap-1 group">
              <div className={`p-3 rounded-2xl transition-all duration-300 ${activeTab === item.id ? 'bg-indigo-600 text-white -translate-y-2 shadow-lg shadow-indigo-200' : 'text-slate-400 hover:text-slate-600'}`}><item.icon size={22} /></div>
              {activeTab === item.id && <motion.span layoutId="bottom-label" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{item.label}</motion.span>}
            </button>
          ))}
        </nav>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} className="absolute left-0 top-0 bottom-0 w-80 bg-white p-8 flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-12">
                <div className="flex items-center gap-3"><div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"><Activity size={24} className="text-white" /></div><span className="font-black text-2xl tracking-tight">AutoAI</span></div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-900"><X size={24} /></button>
              </div>
              <nav className="flex-1 space-y-2">
                {navItems.map((item) => (
                  <button key={item.id} onClick={() => { setActiveTab(item.id as Tab); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><item.icon size={22} /><span>{item.label}</span></button>
                ))}
              </nav>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
