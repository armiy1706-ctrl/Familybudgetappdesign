import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Activity, 
  Calendar, 
  Settings, 
  AlertTriangle, 
  ShieldCheck, 
  ChevronRight, 
  Fuel, 
  Wrench, 
  Droplets, 
  X, 
  Gauge, 
  Zap, 
  Sparkles,
  PlusCircle,
  PencilLine,
  MousePointer2,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';

interface ServiceFormData {
  date: string;
  odometer: number;
  interval: number;
}

export const Dashboard = ({ onNavigate, activeCar, dashboardData, setDashboardData, onDeleteCar }: { 
  onNavigate: (tab: string) => void, 
  activeCar?: any,
  dashboardData: any,
  setDashboardData: (data: any) => void,
  onDeleteCar: (id: string) => void
}) => {
  const [showOilModal, setShowOilModal] = useState(false);
  const [showBrakeModal, setShowBrakeModal] = useState(false);
  const [showOdometerModal, setShowOdometerModal] = useState(false);
  
  const currentOdometer = Number(dashboardData?.currentOdometer) || 0;
  const oilStatus = dashboardData?.oilStatus;
  const brakeStatus = dashboardData?.brakeStatus;
  
  const oilForm = useForm<ServiceFormData>({
    defaultValues: {
      date: oilStatus?.lastDate || new Date().toISOString().split('T')[0],
      odometer: oilStatus?.lastKm || currentOdometer,
      interval: (oilStatus?.nextKm - oilStatus?.lastKm) || 10000
    }
  });

  const onOilSubmit = (data: ServiceFormData) => {
    setDashboardData({
      ...dashboardData,
      oilStatus: {
        lastDate: data.date,
        lastKm: Number(data.odometer),
        nextKm: Number(data.odometer) + Number(data.interval)
      }
    });
    toast.success('Данные о масле сохранены!');
    setShowOilModal(false);
  };

  const onBrakeSubmit = (data: ServiceFormData) => {
    setDashboardData({
      ...dashboardData,
      brakeStatus: {
        lastDate: data.date,
        lastKm: Number(data.odometer),
        nextKm: Number(data.odometer) + Number(data.interval)
      }
    });
    toast.success('Данные о тормозах сохранены!');
    setShowBrakeModal(false);
  };

  const onOdometerSubmit = (data: { odometer: number }) => {
    setDashboardData({
      ...dashboardData,
      currentOdometer: Number(data.odometer)
    });
    toast.success('Пробег обновлен!');
    setShowOdometerModal(false);
  };

  const getOilPercentage = () => {
    if (!oilStatus?.nextKm) return 100;
    const remaining = oilStatus.nextKm - currentOdometer;
    const total = oilStatus.nextKm - oilStatus.lastKm;
    return Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));
  };

  const getBrakePercentage = () => {
    if (!brakeStatus?.nextKm) return 100;
    const remaining = brakeStatus.nextKm - currentOdometer;
    const total = brakeStatus.nextKm - brakeStatus.lastKm;
    return Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));
  };

  const healthScore = Math.round((getOilPercentage() + getBrakePercentage()) / 2);

  return (
    <div className="space-y-8 h-full">
      {/* Автомобиль Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          {activeCar && (
            <button 
              onClick={() => onDeleteCar(activeCar.id)}
              className="p-3 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-colors active:scale-90 border border-rose-100 group shadow-sm"
              title="Удалить автомобиль"
            >
              <Trash2 size={20} className="group-hover:rotate-12 transition-transform" />
            </button>
          )}
          <div>
            <h2 className="text-2xl lg:text-3xl font-black text-slate-900 leading-none">
              {activeCar ? `${activeCar.make} ${activeCar.model}` : 'Гараж пуст'}
            </h2>
            <p className="text-slate-400 font-bold text-[10px] mt-2 uppercase tracking-widest">
              {activeCar ? `VIN: ${activeCar.vin || '• • •'} | ${activeCar.year} год` : 'Добавьте ваше первое авто'}
            </p>
          </div>
        </div>
        <button className="p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm text-slate-400 hover:text-indigo-600 transition-all active:scale-95">
          <Settings size={20} />
        </button>
      </div>

      {/* ГЛАВНЫЙ ВИДЖЕТ (Health Score) */}
      <div className="bg-indigo-600 rounded-[40px] p-6 lg:p-8 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden border-4 border-white/10">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-8">
            <div className="flex items-center gap-6">
              <div className="relative">
                <svg className="w-20 h-20 lg:w-24 lg:h-24 transform -rotate-90">
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * healthScore) / 100} className="text-white transition-all duration-1000" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-black text-xl lg:text-2xl">{healthScore}%</span>
              </div>
              <div>
                <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">Health Score</p>
                <h3 className="text-xl lg:text-2xl font-black">Состояние системы</h3>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => onNavigate('diagnostics')}
                className="bg-white text-indigo-600 px-6 lg:px-8 py-4 rounded-2xl font-black text-sm hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-3"
              >
                <Sparkles size={20} />
                ДИАГНОСТИКА ИИ
              </button>

              <button 
                onClick={() => setShowOdometerModal(true)}
                className="group bg-indigo-500/40 hover:bg-indigo-500/60 border-2 border-white/20 px-6 lg:px-8 py-4 rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center gap-4"
              >
                <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/40 transition-colors">
                  <Gauge size={18} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] opacity-60 leading-none mb-1 uppercase">Пробег</p>
                  <p className="leading-none">{currentOdometer.toLocaleString()} км</p>
                </div>
                <PencilLine size={16} className="opacity-40 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 gap-4">
            <BigHealthButton 
              label="МАСЛО" 
              icon={Droplets} 
              value={getOilPercentage()} 
              subValue={oilStatus ? `через ${oilStatus.nextKm - currentOdometer} км` : null}
              onClick={() => setShowOilModal(true)} 
              color="bg-amber-400"
            />
            <BigHealthButton 
              label="ТОРМОЗА" 
              icon={Activity} 
              value={getBrakePercentage()} 
              subValue={brakeStatus ? `через ${brakeStatus.nextKm - currentOdometer} км` : null}
              onClick={() => setShowBrakeModal(true)} 
              color="bg-rose-400"
            />
          </div>
        </div>
        
        {/* Декор фона */}
        <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
         <div className="bg-white p-6 lg:p-8 rounded-[32px] border-2 border-slate-50 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Zap size={20}/></div>
                <h4 className="font-black text-slate-900 uppercase text-xs tracking-wider">Электроника</h4>
              </div>
              <span className="text-emerald-500 font-black text-[10px]">OK</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 bg-slate-50 rounded-2xl"><p className="text-[10px] font-bold text-slate-400 mb-1 uppercase">АКБ</p><p className="font-black text-slate-900">12.6V</p></div>
               <div className="p-4 bg-slate-50 rounded-2xl"><p className="text-[10px] font-bold text-slate-400 mb-1 uppercase">ГЕНЕРАТОР</p><p className="font-black text-slate-900">14.2V</p></div>
            </div>
         </div>

         <div className="bg-white p-6 lg:p-8 rounded-[32px] border-2 border-slate-50 shadow-sm flex items-center justify-between group cursor-pointer hover:border-indigo-100 transition-colors">
            <div className="flex items-center gap-5">
               <div className="w-14 h-14 lg:w-16 lg:h-16 bg-slate-100 rounded-[20px] lg:rounded-[24px] flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Fuel size={28} />
               </div>
               <div>
                  <h4 className="font-black text-slate-900 uppercase text-xs tracking-wider">Расход топлива</h4>
                  <p className="text-slate-400 font-bold text-[10px] mt-1">Средний: 8.4 л / 100 км</p>
               </div>
            </div>
            <ChevronRight size={20} className="text-slate-200 group-hover:text-indigo-600 transition-colors" />
         </div>
      </div>

      <OdometerModal 
        isOpen={showOdometerModal} 
        onClose={() => setShowOdometerModal(false)} 
        currentOdometer={currentOdometer} 
        onSubmit={onOdometerSubmit} 
      />
      
      <ServiceModal 
        isOpen={showOilModal} 
        onClose={() => setShowOilModal(false)} 
        title="Замена масла" 
        icon={Droplets} 
        form={oilForm}
        onSubmit={onOilSubmit}
      />
      
      <ServiceModal 
        isOpen={showBrakeModal} 
        onClose={() => setShowBrakeModal(false)} 
        title="Замена колодок" 
        icon={Activity} 
        form={oilForm} 
        onSubmit={onBrakeSubmit}
      />
    </div>
  );
};

const BigHealthButton = ({ label, icon: Icon, value, subValue, onClick, color }: any) => (
  <motion.button
    whileHover={{ y: -5, scale: 1.02 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className="group relative bg-white/10 backdrop-blur-xl border-2 border-white/20 p-4 lg:p-5 rounded-[28px] flex flex-col items-start gap-4 transition-all hover:bg-white/20 hover:border-white/40 text-left overflow-hidden h-full"
  >
    {!subValue && (
      <div className="absolute top-3 right-3">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} 
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]"
        />
      </div>
    )}

    <div className={`p-2.5 lg:p-3 rounded-2xl ${color} text-white shadow-lg`}>
      <Icon size={20} />
    </div>

    <div className="min-h-[60px]">
      <p className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-xl lg:text-2xl font-black">{value}%</span>
      </div>
      <p className="text-[8px] lg:text-[9px] font-bold text-white/40 mt-1 uppercase group-hover:text-white/80 transition-colors">
        {subValue || "Нажмите для ввода"}
      </p>
    </div>

    {!subValue && (
      <div className="mt-auto pt-2 flex items-center gap-1 text-[8px] font-black text-white/20 group-hover:text-white/60 uppercase transition-colors">
        <MousePointer2 size={10} />
        Кликните здесь
      </div>
    )}
  </motion.button>
);

const ServiceModal = ({ isOpen, onClose, title, icon: Icon, form, onSubmit }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[40px] p-6 lg:p-8 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-8">
           <div className="flex items-center gap-4">
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><Icon size={24} /></div>
              <h3 className="text-xl font-black">{title}</h3>
           </div>
           <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-600"><X size={24} /></button>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
           <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Пробег при замене (км)</label>
              <input {...form.register('odometer')} type="number" className="w-full bg-slate-50 border-none rounded-2xl py-5 px-6 text-xl font-black text-center focus:ring-4 ring-indigo-500/10 transition-all outline-none" />
           </div>
           <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Интервал до следующей (км)</label>
              <input {...form.register('interval')} type="number" className="w-full bg-slate-50 border-none rounded-2xl py-5 px-6 text-xl font-black text-center focus:ring-4 ring-indigo-500/10 transition-all outline-none" />
           </div>
           <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 active:scale-95 transition-all">СОХРАНИТЬ ДАННЫЕ</button>
        </form>
      </motion.div>
    </div>
  );
};

const OdometerModal = ({ isOpen, onClose, currentOdometer, onSubmit }: any) => {
  const [val, setVal] = useState(currentOdometer);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[40px] p-8 lg:p-10 w-full max-w-sm shadow-2xl">
        <h3 className="text-2xl font-black text-center mb-2">Новый пробег</h3>
        <p className="text-slate-400 text-center text-sm mb-8 font-medium">Введите текущие данные прибора</p>
        <div className="space-y-8">
          <input 
            type="number" 
            value={val} 
            onChange={(e) => setVal(Number(e.target.value))} 
            className="w-full bg-slate-50 border-none rounded-[32px] py-8 text-4xl font-black text-center focus:ring-4 ring-indigo-500/10 transition-all outline-none"
          />
          <button 
            onClick={() => onSubmit({ odometer: val })}
            className="w-full py-6 bg-indigo-600 text-white rounded-[24px] font-black text-lg shadow-xl shadow-indigo-200 active:scale-95 transition-all"
          >
            ОБНОВИТЬ
          </button>
          <button onClick={onClose} className="w-full text-slate-300 font-bold text-sm">ОТМЕНА</button>
        </div>
      </motion.div>
    </div>
  );
};
