import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Wrench, 
  Droplets, 
  X, 
  Gauge, 
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';

interface MaintenanceRecord {
  id: string;
  date: string;
  mileage: number;
  intervalKm: number;
  intervalMonths: number;
  description: string;
  price: number;
  comment: string;
}

export const MaintenanceLog = ({ activeCar, dashboardData, setDashboardData }: { 
  activeCar?: any,
  dashboardData: any,
  setDashboardData: (data: any) => void
}) => {
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  
  const currentOdometer = Number(dashboardData?.currentOdometer) || (Number(activeCar?.mileage) || 0);
  const maintenanceRecords: MaintenanceRecord[] = dashboardData?.maintenanceRecords || [];
  
  const maintenanceForm = useForm<Omit<MaintenanceRecord, 'id'>>({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      mileage: currentOdometer,
      intervalKm: 10000,
      intervalMonths: 12,
      description: '',
      price: 0,
      comment: ''
    }
  });

  const onMaintenanceSubmit = (data: Omit<MaintenanceRecord, 'id'>) => {
    const newRecord: MaintenanceRecord = {
      ...data,
      id: Date.now().toString(),
      mileage: Number(data.mileage),
      intervalKm: Number(data.intervalKm),
      intervalMonths: Number(data.intervalMonths),
      price: Number(data.price)
    };
    
    const updatedRecords = [newRecord, ...maintenanceRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setDashboardData({
      ...dashboardData,
      maintenanceRecords: updatedRecords
    });
    
    toast.success('Запись о ТО добавлена!');
    setShowMaintenanceModal(false);
    maintenanceForm.reset();
  };

  const getNextMaintenanceInfo = () => {
    if (maintenanceRecords.length === 0) return null;
    
    const last = maintenanceRecords[0];
    const nextKm = last.mileage + last.intervalKm;
    const nextDate = new Date(last.date);
    nextDate.setMonth(nextDate.getMonth() + last.intervalMonths);
    
    const kmRemaining = nextKm - currentOdometer;
    const daysRemaining = Math.ceil((nextDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    const isOverdue = kmRemaining <= 0 || daysRemaining <= 0;
    const isWarning = kmRemaining < 1000 || daysRemaining < 30;
    
    let color = 'text-emerald-500';
    let bgColor = 'bg-emerald-50';
    let borderColor = 'border-emerald-100';
    
    if (isOverdue) {
      color = 'text-rose-500';
      bgColor = 'bg-rose-50';
      borderColor = 'border-rose-100';
    } else if (isWarning) {
      color = 'text-amber-500';
      bgColor = 'bg-amber-50';
      borderColor = 'border-amber-100';
    }
    
    const progress = Math.max(0, Math.min(100, (kmRemaining / last.intervalKm) * 100));

    return {
      nextKm,
      nextDate: nextDate.toLocaleDateString(),
      kmRemaining,
      daysRemaining,
      isOverdue,
      color,
      bgColor,
      borderColor,
      progress
    };
  };

  const nextTO = getNextMaintenanceInfo();

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex justify-between items-center">
        <div className="px-4 py-1.5 border-2 border-indigo-600 rounded-xl">
          <h3 className="text-xl font-black text-indigo-600 uppercase tracking-tight">Журнал ТО</h3>
        </div>
        <button 
          onClick={() => setShowMaintenanceModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
        >
          <Plus size={14} />
          Добавить запись
        </button>
      </div>

      {nextTO ? (
        <div className={`p-8 rounded-[40px] border ${nextTO.borderColor} ${nextTO.bgColor} transition-all shadow-sm`}>
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div className="space-y-6 flex-1">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${nextTO.isOverdue ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${nextTO.color}`}>
                  {nextTO.isOverdue ? 'Внимание: Обслуживание просрочено!' : 'Статус: Автомобиль в порядке'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Осталось км</p>
                  <p className={`text-4xl font-black ${nextTO.color}`}>{nextTO.kmRemaining.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Осталось дней</p>
                  <p className={`text-4xl font-black ${nextTO.color}`}>{nextTO.daysRemaining}</p>
                </div>
              </div>

              <div className="pt-4">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                  <span>Ресурс расходников</span>
                  <span>{Math.round(nextTO.progress)}%</span>
                </div>
                <div className="h-3 bg-white/50 rounded-full overflow-hidden border border-slate-100">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${nextTO.progress}%` }}
                    className={`h-full rounded-full ${nextTO.color.replace('text', 'bg')}`}
                  />
                </div>
              </div>
            </div>

            <div className="md:w-px md:h-32 bg-slate-200/30 hidden md:block" />

            <div className="md:w-64 space-y-6">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">План на дату</p>
                <p className="text-xl font-black text-slate-900">{nextTO.nextDate}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">План на пробеге</p>
                <p className="text-xl font-black text-slate-900">{nextTO.nextKm.toLocaleString()} км</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 rounded-[40px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-6 bg-white/50 backdrop-blur-sm">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-200 rounded-3xl flex items-center justify-center shadow-inner">
            <Calendar size={40} />
          </div>
          <div className="max-w-xs">
            <p className="font-black text-slate-900 text-lg">История обслуживания пуста</p>
            <p className="text-slate-500 text-xs mt-1 leading-relaxed font-medium">Добавьте данные о последнем ТО, чтобы мы начали отслеживать состояние систем вашего автомобиля.</p>
          </div>
          <button 
            onClick={() => setShowMaintenanceModal(true)}
            className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all"
          >
            Настроить ТО
          </button>
        </div>
      )}

      {/* История ТО */}
      <div className="space-y-4">
        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest px-2">История обслуживания</h4>
        
        {maintenanceRecords.length > 0 ? (
          <div className="space-y-3">
            {maintenanceRecords.map((record) => (
              <motion.div 
                layout
                key={record.id} 
                className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-600 rounded-2xl flex items-center justify-center transition-colors">
                      <Wrench size={20} />
                    </div>
                    <div>
                      <p className="font-black text-slate-900">{record.description || 'Плановое обслуживание'}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        <Calendar size={10} />
                        {new Date(record.date).toLocaleDateString()}
                        <span className="opacity-30">•</span>
                        <Gauge size={10} />
                        {record.mileage.toLocaleString()} км
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-indigo-600 text-lg leading-none">{record.price.toLocaleString()} ₽</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Итого</p>
                  </div>
                </div>
                {record.comment && (
                  <div className="pl-16">
                    <div className="bg-slate-50/50 rounded-2xl p-4">
                      <p className="text-xs text-slate-500 leading-relaxed font-medium italic">
                        <span className="text-indigo-300 mr-1 opacity-50 font-black text-lg leading-none">“</span>
                        {record.comment}
                        <span className="text-indigo-300 ml-1 opacity-50 font-black text-lg leading-none">”</span>
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 opacity-30">
            <p className="text-xs font-bold uppercase tracking-widest">Здесь будут отображаться ваши записи</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showMaintenanceModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowMaintenanceModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[40px] w-full max-w-md p-10 shadow-2xl relative z-10 overflow-y-auto max-h-[90vh]">
              <button onClick={() => setShowMaintenanceModal(false)} className="absolute top-8 right-8 p-2 text-slate-300 hover:text-slate-600 transition-colors"><X size={24} /></button>
              
              <div className="mb-8">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm"><Sparkles size={28} /></div>
                <h3 className="text-2xl font-black text-slate-900">Новое обслуживание</h3>
                <p className="text-slate-500 text-sm mt-1 font-medium">Введите детали проведенных работ</p>
              </div>

              <form onSubmit={maintenanceForm.handleSubmit(onMaintenanceSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Дата ТО</label>
                    <input {...maintenanceForm.register('date', { required: true })} type="date" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none transition-all shadow-inner" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Пробег (км)</label>
                    <input {...maintenanceForm.register('mileage', { required: true, valueAsNumber: true })} type="number" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none transition-all shadow-inner" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Интервал (км)</label>
                    <input {...maintenanceForm.register('intervalKm', { required: true, valueAsNumber: true })} type="number" placeholder="10000" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none transition-all shadow-inner" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Интервал (мес)</label>
                    <input {...maintenanceForm.register('intervalMonths', { required: true, valueAsNumber: true })} type="number" placeholder="12" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none transition-all shadow-inner" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Что заменено / Описание</label>
                  <input {...maintenanceForm.register('description')} type="text" placeholder="Масло, фильтры, колодки..." className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none transition-all shadow-inner" />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Стоимость (₽)</label>
                  <input {...maintenanceForm.register('price', { valueAsNumber: true })} type="number" placeholder="0" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none transition-all shadow-inner" />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Комментарий</label>
                  <textarea {...maintenanceForm.register('comment')} rows={3} placeholder="Дополнительные заметки..." className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none transition-all resize-none shadow-inner" />
                </div>

                <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-sm uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-[0.98] mt-4">
                  Сохранить запись
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
