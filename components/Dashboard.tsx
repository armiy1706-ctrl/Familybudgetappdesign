import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Settings, 
  ChevronRight, 
  Fuel, 
  Droplets, 
  X, 
  Gauge, 
  Zap, 
  Sparkles,
  PencilLine,
  MousePointer2
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';

interface ServiceFormData {
  date: string;
  odometer: number;
  interval: number;
}

export const Dashboard = ({ onNavigate, activeCar, dashboardData, setDashboardData }: { 
  onNavigate: (tab: string) => void, 
  activeCar?: any,
  dashboardData: any,
  setDashboardData: (data: any) => void
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

  const getPercentage = (status: any) => {
    if (!status?.nextKm) return null;
    const remaining = status.nextKm - currentOdometer;
    const total = status.nextKm - status.lastKm;
    return Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));
  };

  const oilPct = getPercentage(oilStatus);
  const brakePct = getPercentage(brakeStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-2xl font-black text-slate-900 leading-tight">
            {activeCar ? `${activeCar.make} ${activeCar.model}` : 'Гараж пуст'}
          </h2>
          <div className="flex items-center gap-2 mt-1">
             <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase tracking-wider">
               {activeCar?.year || '0000'}
             </span>
             <span className="text-slate-300 text-[10px] font-bold">
               {activeCar?.vin || 'VIN не указан'}
             </span>
          </div>
        </div>
        <button className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400">
          <Settings size={18} />
        </button>
      </div>

      {/* Пробег и Быстрая кнопка */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => setShowOdometerModal(true)}
          className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm text-left group active:scale-95 transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Gauge size={18}/></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Пробег</span>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-xl font-black text-slate-900">{currentOdometer.toLocaleString()} <span className="text-xs text-slate-400">км</span></span>
            <PencilLine size={14} className="text-slate-200 group-hover:text-indigo-400" />
          </div>
        </button>

        <button 
          onClick={() => onNavigate('diagnostics')}
          className="bg-indigo-600 p-5 rounded-[28px] shadow-lg shadow-indigo-100 text-left relative overflow-hidden active:scale-95 transition-all"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 text-white rounded-xl"><Sparkles size={18}/></div>
              <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">OpenAI</span>
            </div>
            <span className="text-sm font-black text-white">ДИАГНОСТИКА</span>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10 text-white"><Activity size={80} /></div>
        </button>
      </div>

      {/* СЕТКА ИЗ 4 КВАДРАТОВ */}
      <div className="grid grid-cols-2 gap-4">
        {/* Квадрат 1: Масло */}
        <DashboardSquare 
          label="МАСЛО" 
          icon={Droplets} 
          value={oilPct !== null ? `${oilPct}%` : "НЕТ ДАННЫХ"} 
          subText={oilPct !== null ? `через ${oilStatus.nextKm - currentOdometer} км` : "Нажмите для ввода"}
          color="text-amber-500"
          bgColor="bg-amber-50"
          onClick={() => setShowOilModal(true)}
          isAlert={oilPct !== null && oilPct < 20}
        />

        {/* Квадрат 2: Тормоза */}
        <DashboardSquare 
          label="ТОРМОЗА" 
          icon={Activity} 
          value={brakePct !== null ? `${brakePct}%` : "НЕТ ДАННЫХ"} 
          subText={brakePct !== null ? `через ${brakeStatus.nextKm - currentOdometer} км` : "Нажмите для ввода"}
          color="text-rose-500"
          bgColor="bg-rose-50"
          onClick={() => setShowBrakeModal(true)}
          isAlert={brakePct !== null && brakePct < 15}
        />

        {/* Квадрат 3: Электроника */}
        <DashboardSquare 
          label="ЗАРЯД" 
          icon={Zap} 
          value="12.6V" 
          subText="Состояние: OK"
          color="text-emerald-500"
          bgColor="bg-emerald-50"
        />

        {/* Квадрат 4: Расход */}
        <DashboardSquare 
          label="РАСХОД" 
          icon={Fuel} 
          value="8.4л" 
          subText="Средний на 100км"
          color="text-indigo-500"
          bgColor="bg-indigo-50"
        />
      </div>

      {/* Модалки */}
      <ServiceModal isOpen={showOilModal} onClose={() => setShowOilModal(false)} title="Замена масла" icon={Droplets} form={oilForm} onSubmit={onOilSubmit} />
      <ServiceModal isOpen={showBrakeModal} onClose={() => setShowBrakeModal(false)} title="Замена колодок" icon={Activity} form={oilForm} onSubmit={onBrakeSubmit} />
      <OdometerModal isOpen={showOdometerModal} onClose={() => setShowOdometerModal(false)} currentOdometer={currentOdometer} onSubmit={onOdometerSubmit} />
    </div>
  );
};

const DashboardSquare = ({ label, icon: Icon, value, subText, color, bgColor, onClick, isAlert }: any) => (
  <motion.button
    whileTap={onClick ? { scale: 0.96 } : {}}
    onClick={onClick}
    className={`bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm text-left flex flex-col justify-between min-h-[160px] relative overflow-hidden group ${onClick ? 'cursor-pointer hover:border-slate-200' : 'cursor-default'}`}
  >
    <div className="flex justify-between items-start relative z-10">
      <div className={`p-3 ${bgColor} ${color} rounded-2xl`}>
        <Icon size={20} />
      </div>
      {isAlert && <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />}
      {!subText.includes('км') && onClick && (
        <div className="p-1 bg-slate-50 rounded-md">
           <MousePointer2 size={10} className="text-slate-300" />
        </div>
      )}
    </div>

    <div className="relative z-10">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{label}</p>
      <h4 className={`text-xl font-black ${isAlert ? 'text-rose-600' : 'text-slate-900'}`}>{value}</h4>
      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase leading-tight truncate">
        {subText}
      </p>
    </div>

    {/* Декоративный фон для активных кнопок */}
    {onClick && <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-slate-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />}
  </motion.button>
);

// Модалки
const ServiceModal = ({ isOpen, onClose, title, icon: Icon, form, onSubmit }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl">
        <div className="flex justify-between items-center mb-8">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Icon size={20} /></div>
              <h3 className="text-lg font-black">{title}</h3>
           </div>
           <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={24} /></button>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
           <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Пробег при замене</label>
              <input {...form.register('odometer')} type="number" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-black text-lg outline-none focus:ring-2 ring-indigo-500/20 transition-all" />
           </div>
           <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Интервал (км)</label>
              <input {...form.register('interval')} type="number" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-black text-lg outline-none focus:ring-2 ring-indigo-500/20 transition-all" />
           </div>
           <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all">СОХРАНИТЬ</button>
        </form>
      </motion.div>
    </div>
  );
};

const OdometerModal = ({ isOpen, onClose, currentOdometer, onSubmit }: any) => {
  const [val, setVal] = useState(currentOdometer);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[40px] p-10 w-full max-w-xs shadow-2xl">
        <h3 className="text-xl font-black text-center mb-6">Текущий пробег</h3>
        <input 
          type="number" 
          value={val} 
          onChange={(e) => setVal(Number(e.target.value))} 
          className="w-full bg-slate-50 border-none rounded-3xl py-8 text-3xl font-black text-center outline-none mb-8"
        />
        <button 
          onClick={() => onSubmit({ odometer: val })}
          className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all"
        >
          ОБНОВИТЬ
        </button>
        <button onClick={onClose} className="w-full text-slate-300 font-bold text-xs mt-4">ОТМЕНА</button>
      </motion.div>
    </div>
  );
};
