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
  MousePointer2,
  AlertTriangle
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
    toast.success('Данные обновлены');
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
    toast.success('Данные обновлены');
    setShowBrakeModal(false);
  };

  const onOdometerSubmit = (data: { odometer: number }) => {
    setDashboardData({
      ...dashboardData,
      currentOdometer: Number(data.odometer)
    });
    toast.success('Пробег обновлен');
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
  const healthScore = oilPct !== null && brakePct !== null ? Math.round((oilPct + brakePct) / 2) : 100;

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex justify-between items-start px-2">
        <div>
          <h2 className="text-3xl font-black text-slate-900 leading-tight">
            {activeCar ? `${activeCar.make} ${activeCar.model}` : 'Гараж пуст'}
          </h2>
          <p className="text-slate-400 font-bold text-xs mt-1 uppercase tracking-widest">
            {activeCar ? `VIN: ${activeCar.vin || '• • •'}` : 'Добавьте авто'}
          </p>
        </div>
        <button className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-300">
          <Settings size={20} />
        </button>
      </div>

      {/* Main Health Card */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-5">
           <div className="relative w-16 h-16">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-slate-50" />
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="5" fill="transparent" strokeDasharray={175.8} strokeDashoffset={175.8 - (175.8 * healthScore) / 100} className="text-indigo-600 transition-all duration-1000" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-slate-900">{healthScore}%</div>
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Health Score</p>
              <h3 className="font-black text-slate-900">Системы в норме</h3>
           </div>
        </div>
        <button 
          onClick={() => onNavigate('diagnostics')}
          className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all"
        >
          <Sparkles size={20} />
        </button>
      </div>

      {/* 4 КВАДРАТА (Классический AutoAI) */}
      <div className="grid grid-cols-2 gap-4">
        <StatusSquare 
          label="Масло" 
          icon={Droplets} 
          value={oilPct !== null ? `${oilPct}%` : "—"} 
          subValue={oilPct !== null ? `${oilStatus.nextKm - currentOdometer} км` : "Ввод данных"}
          onClick={() => setShowOilModal(true)}
          color="text-amber-500"
          bgColor="bg-amber-50"
          isPulse={oilPct === null}
        />
        <StatusSquare 
          label="Тормоза" 
          icon={Activity} 
          value={brakePct !== null ? `${brakePct}%` : "—"} 
          subValue={brakePct !== null ? `${brakeStatus.nextKm - currentOdometer} км` : "Ввод данных"}
          onClick={() => setShowBrakeModal(true)}
          color="text-rose-500"
          bgColor="bg-rose-50"
          isPulse={brakePct === null}
        />
        <StatusSquare 
          label="Заряд" 
          icon={Zap} 
          value="12.6V" 
          subValue="Батарея OK"
          color="text-emerald-500"
          bgColor="bg-emerald-50"
        />
        <StatusSquare 
          label="Расход" 
          icon={Fuel} 
          value="8.4л" 
          subValue="Средний"
          color="text-indigo-500"
          bgColor="bg-indigo-50"
        />
      </div>

      {/* Пробег (Нижняя широкая плашка) */}
      <button 
        onClick={() => setShowOdometerModal(true)}
        className="w-full bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
            <Gauge size={22} />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Текущий пробег</p>
            <h4 className="text-xl font-black text-slate-900">{currentOdometer.toLocaleString()} км</h4>
          </div>
        </div>
        <PencilLine size={20} className="text-slate-200 group-hover:text-indigo-400 transition-colors" />
      </button>

      {/* Модалки */}
      <ServiceModal isOpen={showOilModal} onClose={() => setShowOilModal(false)} title="Замена масла" icon={Droplets} form={oilForm} onSubmit={onOilSubmit} />
      <ServiceModal isOpen={showBrakeModal} onClose={() => setShowBrakeModal(false)} title="Замена колодок" icon={Activity} form={oilForm} onSubmit={onBrakeSubmit} />
      <OdometerModal isOpen={showOdometerModal} onClose={() => setShowOdometerModal(false)} currentOdometer={currentOdometer} onSubmit={onOdometerSubmit} />
    </div>
  );
};

const StatusSquare = ({ label, icon: Icon, value, subValue, onClick, color, bgColor, isPulse }: any) => (
  <motion.button
    whileTap={onClick ? { scale: 0.95 } : {}}
    onClick={onClick}
    className={`bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm text-left flex flex-col justify-between min-h-[150px] transition-all ${onClick ? 'cursor-pointer hover:border-indigo-100' : 'cursor-default'}`}
  >
    <div className="flex justify-between items-start">
      <div className={`p-3 ${bgColor} ${color} rounded-2xl`}>
        <Icon size={20} />
      </div>
      {isPulse && (
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }} 
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-2 h-2 bg-indigo-500 rounded-full"
        />
      )}
    </div>
    <div>
      <h4 className="text-xl font-black text-slate-900 mb-0.5">{value}</h4>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{label}</p>
      <p className="text-[9px] font-bold text-slate-300 mt-2 uppercase truncate">{subValue}</p>
    </div>
  </motion.button>
);

const ServiceModal = ({ isOpen, onClose, title, icon: Icon, form, onSubmit }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl">
        <div className="flex justify-between items-center mb-8">
           <h3 className="text-lg font-black text-slate-900">{title}</h3>
           <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={24} /></button>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
           <InputGroup label="Пробег при замене" register={form.register('odometer')} />
           <InputGroup label="Интервал до следующей" register={form.register('interval')} />
           <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black shadow-lg shadow-indigo-100">СОХРАНИТЬ</button>
        </form>
      </motion.div>
    </div>
  );
};

const InputGroup = ({ label, register }: any) => (
  <div>
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{label}</label>
    <input type="number" {...register} className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-black text-lg outline-none focus:ring-2 ring-indigo-500/20" />
  </div>
);

const OdometerModal = ({ isOpen, onClose, currentOdometer, onSubmit }: any) => {
  const [val, setVal] = useState(currentOdometer);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[40px] p-10 w-full max-w-xs shadow-2xl">
        <h3 className="text-xl font-black text-center mb-6">Новый пробег</h3>
        <input 
          type="number" 
          value={val} 
          onChange={(e) => setVal(Number(e.target.value))} 
          className="w-full bg-slate-50 border-none rounded-3xl py-8 text-3xl font-black text-center outline-none mb-8"
        />
        <button 
          onClick={() => onSubmit({ odometer: val })}
          className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black shadow-lg shadow-indigo-100"
        >
          ОБНОВИТЬ
        </button>
        <button onClick={onClose} className="w-full text-slate-300 font-bold text-xs mt-4 uppercase">Отмена</button>
      </motion.div>
    </div>
  );
};
