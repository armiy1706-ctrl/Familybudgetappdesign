import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Car, 
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
  X
} from 'lucide-react';
import { 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';

// --- Sub-Components ---

const StatCard = ({ title, value, change, trend, icon: Icon, color }: any) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-5"
  >
    <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center text-white shadow-lg shrink-0`}>
      <Icon size={24} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{title}</p>
      <div className="flex items-end gap-2">
        <h4 className="text-2xl font-black text-slate-900 leading-none">{value}</h4>
        <span className={`text-[10px] font-bold flex items-center ${trend === 'up' ? 'text-rose-500' : 'text-emerald-500'}`}>
          {trend === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {change}
        </span>
      </div>
    </div>
  </motion.div>
);

const MaintenanceDashboard = () => {
  const lineData = [
    { name: 'Янв', costs: 4200 },
    { name: 'Фев', costs: 12000 },
    { name: 'Мар', costs: 8000 },
    { name: 'Апр', costs: 23000 },
    { name: 'Май', costs: 15000 },
    { name: 'Июн', costs: 18000 },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Общие расходы" value="23,500 ₽" change="12%" trend="up" icon={DollarSign} color="bg-indigo-600" />
        <StatCard title="Активные ТО" value="5" change="2" trend="up" icon={Wrench} color="bg-amber-500" />
        <StatCard title="Топ расходник" value="Масло" change="8%" trend="down" icon={Package} color="bg-emerald-500" />
        <StatCard title="Здоровье" value="94%" change="2%" trend="up" icon={CheckCircle2} color="bg-blue-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">График расходов</h3>
            <select className="bg-slate-50 border-none rounded-xl py-2 px-4 text-[10px] font-black uppercase text-slate-500 outline-none">
              <option>Полгода</option>
              <option>Год</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lineData}>
                <defs>
                  <linearGradient id="colorCosts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} />
                <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', fontWeight: 800 }} />
                <Area type="monotone" dataKey="costs" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorCosts)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6">Статус Активов</h3>
          <div className="space-y-4">
            {[
              { name: 'BMW X5', status: 'optimal', mileage: '45,200', color: 'bg-emerald-500' },
              { name: 'Mercedes GLE', status: 'warning', mileage: '88,100', color: 'bg-amber-500' },
              { name: 'Audi Q7', status: 'critical', mileage: '124,500', color: 'bg-rose-500' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${item.color}`} />
                  <div>
                    <p className="text-sm font-black text-slate-900">{item.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.mileage} км</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const AssetsList = () => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row justify-between gap-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input type="text" placeholder="Поиск актива..." className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold outline-none" />
      </div>
      <button className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center gap-2">
        <Plus size={14} /> Добавить актив
      </button>
    </div>
    <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Машина</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Пробег</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Посл. ТО</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">След. ТО</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {[
              { name: 'Tesla Model 3', mileage: '12,500 км', last: '10.01.24', next: '10.01.25' },
              { name: 'Audi RS6', mileage: '5,100 км', last: '01.02.24', next: '01.02.25' }
            ].map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-6 font-black text-slate-900">{row.name}</td>
                <td className="px-8 py-6 font-black text-slate-700">{row.mileage}</td>
                <td className="px-8 py-6 font-bold text-slate-400">{row.last}</td>
                <td className="px-8 py-6 font-bold text-slate-900">{row.next}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const ConsumablesCatalog = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[
      { name: 'Масло Motul 5W40', stock: 12, price: 6500 },
      { name: 'Фильтр MANN', stock: 3, price: 1200 },
      { name: 'Колодки Brembo', stock: 0, price: 4200 }
    ].map((item, idx) => (
      <div key={idx} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400"><Package size={20} /></div>
          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${item.stock > 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
            {item.stock > 0 ? `В наличии: ${item.stock}` : 'Нет'}
          </span>
        </div>
        <div>
          <h4 className="font-black text-slate-900">{item.name}</h4>
          <p className="text-xl font-black text-indigo-600 mt-2">{item.price} ₽</p>
        </div>
      </div>
    ))}
  </div>
);

export const AdvancedMaintenanceJournal = () => {
  const [subTab, setSubTab] = useState('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);

  const menu = [
    { id: 'dashboard', label: 'Обзор', icon: LayoutDashboard },
    { id: 'assets', label: 'Активы', icon: Car },
    { id: 'catalog', label: 'Каталог', icon: Box },
    { id: 'reports', label: 'Отчеты', icon: BarChart3 },
    { id: 'calendar', label: 'Календарь', icon: Calendar },
  ];

  return (
    <div className="space-y-8 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide w-full md:w-auto">
          {menu.map((item) => (
            <button
              key={item.id}
              onClick={() => setSubTab(item.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all shrink-0 ${
                subTab === item.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                : 'bg-white text-slate-400 border border-slate-100 hover:text-slate-900 shadow-sm'
              }`}
            >
              <item.icon size={12} />
              {item.label}
            </button>
          ))}
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="w-full md:w-auto px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={14} />
          Новая запись
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={subTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {subTab === 'dashboard' && <MaintenanceDashboard />}
          {subTab === 'assets' && <AssetsList />}
          {subTab === 'catalog' && <ConsumablesCatalog />}
          {subTab === 'reports' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                 <h4 className="text-sm font-black uppercase text-slate-900 mb-6">Расходы по категориям</h4>
                 <div className="h-64 bg-slate-50 rounded-3xl flex items-center justify-center">
                    <PieChart width={200} height={200}>
                       <Pie data={[{v:40},{v:30},{v:20},{v:10}]} dataKey="v" innerRadius={60} outerRadius={80} paddingAngle={5}>
                          <Cell fill="#4f46e5" /><Cell fill="#818cf8" /><Cell fill="#c7d2fe" /><Cell fill="#e0e7ff" />
                       </Pie>
                    </PieChart>
                 </div>
               </div>
               <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                 <h4 className="text-sm font-black uppercase text-slate-900 mb-6">Динамика пробега</h4>
                 <div className="h-64 bg-slate-50 rounded-3xl flex items-center justify-center">
                    <LineChart width={300} height={200} data={[{m:'Янв',v:1200},{m:'Фев',v:2400},{m:'Мар',v:1800}]}>
                       <Line type="monotone" dataKey="v" stroke="#4f46e5" strokeWidth={3} dot={false} />
                    </LineChart>
                 </div>
               </div>
            </div>
          )}
          {subTab === 'calendar' && (
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm min-h-[400px] flex flex-col items-center justify-center text-center">
               <Calendar size={48} className="text-indigo-100 mb-4" />
               <p className="font-black text-slate-900 uppercase">Ближайшие записи</p>
               <p className="text-xs font-bold text-slate-400 mt-2">15 Марта — Замена масла (BMW X5)</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Modal - Новое ТО */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[40px] w-full max-w-2xl p-10 shadow-2xl relative z-10 overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Новое обслуживание</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"><X size={20} /></button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Выберите актив</label>
                     <select className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none">
                        <option>BMW X5 (A777AA77)</option>
                        <option>Tesla Model 3</option>
                     </select>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Дата</label>
                        <input type="date" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Пробег</label>
                        <input type="number" placeholder="125000" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none" />
                      </div>
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Исполнитель</label>
                      <input type="text" placeholder="Официальный дилер" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none" />
                   </div>
                </div>
                
                <div className="space-y-4">
                   <label className="text-[10px] font-black uppercase text-slate-900 tracking-widest px-1">Чек-лист работ</label>
                   <div className="space-y-2">
                      {['Замена масла', 'Фильтр масляный', 'Фильтр воздушный', 'Проверка тормозов'].map((job, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                           <span className="text-xs font-bold text-slate-700">{job}</span>
                           <input type="checkbox" className="w-5 h-5 accent-indigo-600 rounded-lg" />
                        </div>
                      ))}
                   </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100 flex justify-end gap-4">
                 <button onClick={() => setShowAddModal(false)} className="px-8 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all">Отмена</button>
                 <button className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Сохранить ТО</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
