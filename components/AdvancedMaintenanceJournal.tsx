import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Car as CarIcon, 
  Wrench, 
  Box, 
  BarChart3, 
  Calendar, 
  Plus, 
  Filter,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Download,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Gauge,
  Clock,
  X,
  PlusCircle,
  Briefcase,
  History,
  FileText,
  User,
  Settings as SettingsIcon,
  ChevronDown,
  Trash,
  Plus as PlusIcon,
  HardDrive,
  CreditCard
} from 'lucide-react';
import { 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';

// --- Interfaces ---

interface Part {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
}

interface Labor {
  id: string;
  description: string;
  hours: number;
  ratePerHour: number;
  totalLaborCost: number;
}

interface MaintenanceEntry {
  id: string;
  carId: string;
  title: string;
  date: string;
  mileage: number;
  description: string;
  master: string;
  parts: Part[];
  labor: Labor[];
  totalCost: number;
  currency: 'RUB' | 'USD' | 'EUR';
}

interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  plate: string;
  photoUrl: string;
  status: 'active' | 'service' | 'sold';
}

// --- Constants ---
const COLORS = ['#4f46e5', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

// --- Sub-Components ---

const StatBox = ({ label, value, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
    <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg`}>
      <Icon size={20} />
    </div>
    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{label}</p>
    <h4 className="text-xl font-black text-slate-900 tracking-tighter">{value}</h4>
  </div>
);

export const AdvancedMaintenanceJournal = ({ 
  cars = [], 
  onAddCar, 
  onDeleteCar 
}: { 
  cars: any[], 
  onAddCar?: (car: any) => void, 
  onDeleteCar?: (id: string) => void 
}) => {
  const [activeSubTab, setActiveSubTab] = useState('dashboard');
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  
  // Entries state (local for now, as requested "local version offline (optional)")
  const [entries, setEntries] = useState<MaintenanceEntry[]>([]);

  useEffect(() => {
    const savedEntries = localStorage.getItem('autoai_maintenance_entries');
    if (savedEntries) {
      try {
        setEntries(JSON.parse(savedEntries));
      } catch (e) {
        console.error("Failed to load entries", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('autoai_maintenance_entries', JSON.stringify(entries));
  }, [entries]);

  // Cleanup: Remove entries for cars that no longer exist
  useEffect(() => {
    const existingCarIds = new Set(cars.map(c => c.id));
    const filteredEntries = entries.filter(entry => existingCarIds.has(entry.carId));
    
    if (filteredEntries.length !== entries.length) {
      setEntries(filteredEntries);
    }
  }, [cars, entries.length]); // Track entries length too

  // Form States
  const [newEntry, setNewEntry] = useState<Partial<MaintenanceEntry>>({
    carId: '',
    date: new Date().toISOString().split('T')[0],
    parts: [],
    labor: [],
    currency: 'RUB'
  });

  // Automatically update selected carId when cars change if none selected or selected one deleted
  useEffect(() => {
    if (cars.length > 0) {
      const exists = cars.some(c => c.id === newEntry.carId);
      if (!exists) {
        setNewEntry(prev => ({ ...prev, carId: cars[0].id }));
      }
    } else {
      setNewEntry(prev => ({ ...prev, carId: '' }));
    }
  }, [cars, newEntry.carId]);

  // Calculations
  const totalStats = useMemo(() => {
    // Double check filtering for safety in calculations
    const existingCarIds = new Set(cars.map(c => c.id));
    const validEntries = entries.filter(e => existingCarIds.has(e.carId));
    
    const total = validEntries.reduce((acc, curr) => acc + (curr.totalCost || 0), 0);
    const partsTotal = validEntries.reduce((acc, curr) => 
      acc + (curr.parts?.reduce((pAcc, p) => pAcc + (p.totalPrice || 0), 0) || 0), 0
    );
    return { total, partsTotal, activeCars: cars.length, entryCount: validEntries.length };
  }, [entries, cars]);

  const chartData = useMemo(() => {
    const existingCarIds = new Set(cars.map(c => c.id));
    const validEntries = entries.filter(e => existingCarIds.has(e.carId));
    
    // Group by month for current year
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const currentMonth = new Date().getMonth();
    
    return months.slice(0, currentMonth + 1).map((name, index) => {
      const monthStr = (index + 1).toString().padStart(2, '0');
      const cost = validEntries.reduce((acc, e) => {
        return e.date.includes(`-${monthStr}-`) ? acc + (e.totalCost || 0) : acc;
      }, 0);
      return { name, cost };
    });
  }, [entries, cars]);

  // Export Logic
  const exportToCSV = () => {
    const headers = ['ID', 'Машина', 'Дата', 'Пробег', 'Название', 'Стоимость'];
    const rows = entries.map(e => {
      const car = cars.find(c => c.id === e.carId);
      return [e.id, `${car?.make} ${car?.model}`, e.date, e.mileage, e.title, e.totalCost];
    });
    
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "maintenance_report.csv");
    document.body.appendChild(link);
    link.click();
    toast.success("Отчет экспортирован в CSV");
  };

  const addPartRow = () => {
    const newPart: Part = { id: Date.now().toString(), name: '', sku: '', quantity: 1, pricePerUnit: 0, totalPrice: 0 };
    setNewEntry(prev => ({ ...prev, parts: [...(prev.parts || []), newPart] }));
  };

  const addLaborRow = () => {
    const newLabor: Labor = { id: Date.now().toString(), description: '', hours: 1, ratePerHour: 0, totalLaborCost: 0 };
    setNewEntry(prev => ({ ...prev, labor: [...(prev.labor || []), newLabor] }));
  };

  const saveEntry = () => {
    if (!newEntry.title || !newEntry.carId) {
      toast.error("Заполните обязательные поля");
      return;
    }
    const finalEntry = {
      ...newEntry,
      id: Date.now().toString(),
      totalCost: (newEntry.parts?.reduce((a, b) => a + b.totalPrice, 0) || 0) + 
                 (newEntry.labor?.reduce((a, b) => a + b.totalLaborCost, 0) || 0)
    } as MaintenanceEntry;
    
    setEntries(prev => [finalEntry, ...prev]);
    setShowAddEntryModal(false);
    toast.success("Запись успешно добавлена");
  };

  const navItems = [
    { id: 'dashboard', label: 'Рабочий стол', icon: LayoutDashboard },
    { id: 'cars', label: 'Мои машины', icon: CarIcon },
    { id: 'history', label: 'Журнал ТО', icon: History },
    { id: 'parts', label: 'Запчасти', icon: Box },
    { id: 'reports', label: 'Отчеты', icon: BarChart3 },
    { id: 'settings', label: 'Настройки', icon: SettingsIcon },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Sub Navigation */}
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSubTab(item.id)}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shrink-0 ${
              activeSubTab === item.id 
              ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-105' 
              : 'bg-white text-slate-400 border border-slate-100 hover:text-slate-900 shadow-sm'
            }`}
          >
            <item.icon size={14} />
            {item.label}
          </button>
        ))}
      </div>

      {/* View Switcher */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {activeSubTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatBox label="Всего затрат" value={`${totalStats.total.toLocaleString()} ₽`} icon={DollarSign} color="bg-indigo-600" />
                <StatBox label="Запчасти" value={`${totalStats.partsTotal.toLocaleString()} ₽`} icon={Package} color="bg-amber-500" />
                <StatBox label="Автомобилей" value={totalStats.activeCars} icon={CarIcon} color="bg-emerald-500" />
                <StatBox label="Записей ТО" value={totalStats.entryCount} icon={History} color="bg-rose-500" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Динамика расходов</h3>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Последние 4 месяца</p>
                    </div>
                    <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">
                      <Download size={14} /> Экспорт CSV
                    </button>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} />
                        <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }} />
                        <Area type="monotone" dataKey="cost" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorCost)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6">Ваши Автомобили</h3>
                  <div className="space-y-4 flex-1">
                    {cars.length > 0 ? cars.map(car => (
                      <div key={car.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl group hover:bg-white hover:shadow-md transition-all">
                        <div className="w-16 h-12 rounded-2xl overflow-hidden shrink-0 border border-white">
                          <ImageWithFallback src={car.photoUrl} alt={car.model} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-900 text-sm truncate uppercase tracking-tight">{car.make} {car.model}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{car.plate || 'Нет номера'}</p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                    )) : (
                      <div className="flex flex-col items-center justify-center py-10 opacity-40">
                        <CarIcon size={32} />
                        <p className="text-[10px] font-black uppercase tracking-widest mt-2">Нет машин</p>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => setActiveSubTab('cars')}
                    className="mt-6 w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-2"
                  >
                    Управление парком
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'cars' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {cars.map(car => (
                <div key={car.id} className="bg-white rounded-[40px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                  <div className="h-48 relative">
                    <ImageWithFallback src={car.photoUrl} alt={car.model} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-6 left-6 text-white">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{car.make}</p>
                      <h4 className="text-xl font-black uppercase tracking-tighter">{car.model}</h4>
                    </div>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-2xl">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Год</p>
                        <p className="font-black text-slate-900">{car.year}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Госномер</p>
                        <p className="font-black text-slate-900">{car.plate}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">VIN Номер</p>
                      <p className="font-black text-slate-900 text-xs tracking-widest">{car.vin}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setNewEntry(prev => ({ ...prev, carId: car.id }));
                          setShowAddEntryModal(true);
                        }}
                        className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all"
                      >
                        Добавить ТО
                      </button>
                      <button className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-100 transition-all">
                        <SettingsIcon size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {cars.length === 0 && (
                <div className="col-span-full py-20 bg-white rounded-[40px] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center px-10">
                  <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mb-6">
                    <CarIcon size={40} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Ваш парк пуст</h3>
                  <p className="text-sm text-slate-400 font-medium max-w-sm">Добавьте свой первый автомобиль в разделе «Мой гараж», чтобы начать вести детальный журнал обслуживания и следить за расходами.</p>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'history' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" placeholder="Поиск по истории..." className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 ring-indigo-500 outline-none transition-all" />
                </div>
                <button 
                  onClick={() => setShowAddEntryModal(true)}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center gap-2"
                >
                  <Plus size={14} /> Новая запись
                </button>
              </div>

              <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Запись / Машина</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Дата</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Пробег</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Итог</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {entries.map(entry => {
                        const car = cars.find(c => c.id === entry.carId);
                        return (
                          <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                  <Wrench size={18} />
                                </div>
                                <div>
                                  <p className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase text-sm tracking-tight">{entry.title}</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{car?.make} {car?.model}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-sm font-bold text-slate-500">{entry.date}</td>
                            <td className="px-8 py-6 font-black text-slate-700">{entry.mileage.toLocaleString()} км</td>
                            <td className="px-8 py-6 text-right">
                              <div className="inline-flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl text-indigo-600 font-black text-sm">
                                {entry.totalCost.toLocaleString()} ₽
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Fallback for other tabs */}
          {['parts', 'reports', 'settings'].includes(activeSubTab) && (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] border border-dashed border-slate-200 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
                <SettingsIcon size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Раздел в разработке</h3>
              <p className="text-sm font-bold text-slate-400 max-w-xs uppercase tracking-widest leading-relaxed">
                Этот функционал будет доступен в версии v5.0.0
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Advanced Add Entry Modal */}
      <AnimatePresence>
        {showAddEntryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddEntryModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              className="bg-white rounded-[40px] w-full max-w-4xl p-10 shadow-2xl relative z-10 overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="flex justify-between items-center mb-10 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                    <Wrench size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Оформить Обслуживание</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Заполните детали работ и запчастей</p>
                  </div>
                </div>
                <button onClick={() => setShowAddEntryModal(false)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Main Info */}
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Автомобиль</label>
                    <select 
                      value={newEntry.carId}
                      onChange={(e) => setNewEntry({ ...newEntry, carId: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none"
                    >
                      {cars.map(c => <option key={c.id} value={c.id}>{c.make} {c.model} ({c.plate})</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Название ТО / Ремонта</label>
                    <input 
                      type="text" 
                      placeholder="Например: Замена масла и фильтров"
                      value={newEntry.title || ''}
                      onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Дата</label>
                      <input 
                        type="date" 
                        value={newEntry.date}
                        onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                        className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Пробег (км)</label>
                      <input 
                        type="number" 
                        value={newEntry.mileage || ''}
                        onChange={(e) => setNewEntry({ ...newEntry, mileage: parseInt(e.target.value) })}
                        className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Мастер / СТО</label>
                    <input 
                      type="text" 
                      placeholder="Название сервиса"
                      value={newEntry.master || ''}
                      onChange={(e) => setNewEntry({ ...newEntry, master: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Описание работ</label>
                    <textarea 
                      rows={3}
                      placeholder="Дополнительные детали..."
                      value={newEntry.description || ''}
                      onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Parts and Labor */}
                <div className="space-y-8">
                  {/* Parts Section */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-[0.2em]">Запчасти / Расходники</h4>
                      <button onClick={addPartRow} className="text-indigo-600 hover:text-indigo-700 font-black text-[10px] uppercase flex items-center gap-1 transition-colors">
                        <PlusCircle size={14} /> Добавить позицию
                      </button>
                    </div>
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                      {newEntry.parts?.map((part, idx) => (
                        <div key={part.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-3 relative group">
                          <button 
                            onClick={() => setNewEntry(prev => ({ ...prev, parts: prev.parts?.filter(p => p.id !== part.id) }))}
                            className="absolute -top-2 -right-2 w-7 h-7 bg-rose-500 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                          >
                            <X size={14} />
                          </button>
                          <div className="grid grid-cols-2 gap-3">
                            <input 
                              placeholder="Наименование" 
                              className="bg-white border-none rounded-xl py-2 px-3 text-xs font-bold"
                              value={part.name}
                              onChange={(e) => {
                                const updatedParts = [...(newEntry.parts || [])];
                                updatedParts[idx].name = e.target.value;
                                setNewEntry({ ...newEntry, parts: updatedParts });
                              }}
                            />
                            <input 
                              placeholder="Артикул / SKU" 
                              className="bg-white border-none rounded-xl py-2 px-3 text-xs font-bold"
                              value={part.sku}
                              onChange={(e) => {
                                const updatedParts = [...(newEntry.parts || [])];
                                updatedParts[idx].sku = e.target.value;
                                setNewEntry({ ...newEntry, parts: updatedParts });
                              }}
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <input 
                              type="number" placeholder="Кол-во" className="bg-white border-none rounded-xl py-2 px-3 text-xs font-bold"
                              value={part.quantity}
                              onChange={(e) => {
                                const updatedParts = [...(newEntry.parts || [])];
                                updatedParts[idx].quantity = parseInt(e.target.value);
                                updatedParts[idx].totalPrice = updatedParts[idx].quantity * updatedParts[idx].pricePerUnit;
                                setNewEntry({ ...newEntry, parts: updatedParts });
                              }}
                            />
                            <input 
                              type="number" placeholder="Цена" className="bg-white border-none rounded-xl py-2 px-3 text-xs font-bold"
                              value={part.pricePerUnit}
                              onChange={(e) => {
                                const updatedParts = [...(newEntry.parts || [])];
                                updatedParts[idx].pricePerUnit = parseFloat(e.target.value);
                                updatedParts[idx].totalPrice = updatedParts[idx].quantity * updatedParts[idx].pricePerUnit;
                                setNewEntry({ ...newEntry, parts: updatedParts });
                              }}
                            />
                            <div className="bg-indigo-600 text-white rounded-xl py-2 px-3 text-[10px] font-black flex items-center justify-center">
                              {part.totalPrice.toLocaleString()} ₽
                            </div>
                          </div>
                        </div>
                      ))}
                      {newEntry.parts?.length === 0 && <p className="text-[10px] font-bold text-slate-300 uppercase text-center py-4 border-2 border-dashed border-slate-100 rounded-3xl tracking-widest">Нет добавленных запчастей</p>}
                    </div>
                  </div>

                  {/* Labor Section */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-[0.2em]">Работы / Ремонт</h4>
                      <button onClick={addLaborRow} className="text-indigo-600 hover:text-indigo-700 font-black text-[10px] uppercase flex items-center gap-1 transition-colors">
                        <PlusCircle size={14} /> Добавить работу
                      </button>
                    </div>
                    <div className="space-y-3">
                      {newEntry.labor?.map((lab, idx) => (
                        <div key={lab.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-3 relative group">
                          <button 
                            onClick={() => setNewEntry(prev => ({ ...prev, labor: prev.labor?.filter(l => l.id !== lab.id) }))}
                            className="absolute -top-2 -right-2 w-7 h-7 bg-rose-500 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                          >
                            <X size={14} />
                          </button>
                          <input 
                            placeholder="Вид работы (напр: Замена ГРМ)" 
                            className="bg-white border-none rounded-xl py-2 px-3 text-xs font-bold"
                            value={lab.description}
                            onChange={(e) => {
                              const updatedLabor = [...(newEntry.labor || [])];
                              updatedLabor[idx].description = e.target.value;
                              setNewEntry({ ...newEntry, labor: updatedLabor });
                            }}
                          />
                          <div className="grid grid-cols-3 gap-3">
                            <input 
                              type="number" placeholder="Часы" className="bg-white border-none rounded-xl py-2 px-3 text-xs font-bold"
                              value={lab.hours}
                              onChange={(e) => {
                                const updatedLabor = [...(newEntry.labor || [])];
                                updatedLabor[idx].hours = parseFloat(e.target.value);
                                updatedLabor[idx].totalLaborCost = updatedLabor[idx].hours * updatedLabor[idx].ratePerHour;
                                setNewEntry({ ...newEntry, labor: updatedLabor });
                              }}
                            />
                            <input 
                              type="number" placeholder="Ставка" className="bg-white border-none rounded-xl py-2 px-3 text-xs font-bold"
                              value={lab.ratePerHour}
                              onChange={(e) => {
                                const updatedLabor = [...(newEntry.labor || [])];
                                updatedLabor[idx].ratePerHour = parseFloat(e.target.value);
                                updatedLabor[idx].totalLaborCost = updatedLabor[idx].hours * updatedLabor[idx].ratePerHour;
                                setNewEntry({ ...newEntry, labor: updatedLabor });
                              }}
                            />
                            <div className="bg-slate-900 text-white rounded-xl py-2 px-3 text-[10px] font-black flex items-center justify-center">
                              {lab.totalLaborCost.toLocaleString()} ₽
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Footer */}
              <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex gap-10">
                  <div className="text-center">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Запчасти</p>
                    <p className="text-xl font-black text-slate-900">{newEntry.parts?.reduce((a, b) => a + b.totalPrice, 0).toLocaleString()} ₽</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Работы</p>
                    <p className="text-xl font-black text-slate-900">{newEntry.labor?.reduce((a, b) => a + b.totalLaborCost, 0).toLocaleString()} ₽</p>
                  </div>
                  <div className="text-center bg-indigo-50 px-6 py-2 rounded-2xl border border-indigo-100">
                    <p className="text-[9px] font-black uppercase text-indigo-400 tracking-widest mb-1">Итого к оплате</p>
                    <p className="text-xl font-black text-indigo-600">
                      {((newEntry.parts?.reduce((a, b) => a + b.totalPrice, 0) || 0) + 
                       (newEntry.labor?.reduce((a, b) => a + b.totalLaborCost, 0) || 0)).toLocaleString()} ₽
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                  <button 
                    onClick={() => setShowAddEntryModal(false)}
                    className="flex-1 md:flex-none px-10 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                  >
                    Отмена
                  </button>
                  <button 
                    onClick={saveEntry}
                    className="flex-1 md:flex-none px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                  >
                    Сохранить ТО
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
