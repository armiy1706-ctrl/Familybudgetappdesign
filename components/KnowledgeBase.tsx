import React from 'react';
import { motion } from 'motion/react';
import { Book, Shield, Zap, Droplets, Gauge, Search, ChevronRight } from 'lucide-react';

const articles = [
  { id: 1, title: 'Как подготовить авто к лету', category: 'Обслуживание', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: 2, title: 'Замена масла: Полный гид', category: 'Двигатель', icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 3, title: 'Диагностика тормозной системы', category: 'Безопасность', icon: Shield, color: 'text-rose-500', bg: 'bg-rose-50' },
  { id: 4, title: 'Коды ошибок OBD-II: Справочник', category: 'Электроника', icon: Gauge, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { id: 5, title: 'Экономия топлива: 10 советов', category: 'Советы', icon: Book, color: 'text-emerald-500', bg: 'bg-emerald-50' },
];

export const KnowledgeBase = () => {
  return (
    <div className="space-y-8">
      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
        <input 
          type="text" 
          placeholder="Поиск статей, видео и руководств..." 
          className="w-full bg-white border border-slate-200 rounded-3xl py-5 pl-16 pr-6 shadow-sm focus:ring-2 ring-indigo-500 outline-none transition-all text-slate-700 font-medium"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((art, idx) => (
          <motion.div
            key={art.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
          >
            <div className={`w-14 h-14 ${art.bg} ${art.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              <art.icon size={28} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{art.category}</p>
            <h4 className="text-xl font-bold text-slate-900 leading-tight mb-4">{art.title}</h4>
            <div className="flex items-center text-indigo-600 font-bold text-sm">
              Читать далее <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-[40px] p-10 text-white flex flex-col md:flex-row justify-between items-center gap-10 overflow-hidden relative">
        <div className="relative z-10 space-y-6 md:max-w-md text-center md:text-left">
          <h3 className="text-3xl font-black leading-tight">Подпишитесь на Pro-аккаунт</h3>
          <p className="text-slate-400 font-medium">Получите доступ к эксклюзивным видео-инструкциям, приоритетной поддержке ИИ и скидкам у партнеров.</p>
          <button className="px-10 py-5 bg-white text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-100 transition-colors shadow-xl">
            Попробовать бесплатно
          </button>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-4">
          <div className="w-24 h-24 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center text-indigo-400">
            <Zap size={40} />
          </div>
          <div className="w-24 h-24 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center text-emerald-400">
            <Shield size={40} />
          </div>
          <div className="w-24 h-24 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center text-amber-400">
            <Droplets size={40} />
          </div>
          <div className="w-24 h-24 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center text-blue-400">
            <Gauge size={40} />
          </div>
        </div>
        <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 pointer-events-none">
          <Book size={300} />
        </div>
      </div>
    </div>
  );
};
