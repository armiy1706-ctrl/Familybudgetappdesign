import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Activity, 
  Settings, 
  Droplets, 
  X, 
  Gauge, 
  Zap, 
  Sparkles,
  PencilLine,
  Trash2,
  Fuel
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
    toast.success('Обновлено');
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
    toast.success('Обновлено');
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
    <div className="space-y-6">
      {/* Header v74: С кнопкой удаления */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 leading-tight">
            {activeCar ? `${activeCar.make} ${activeCar.model}` : 'Добавить авто'}
          </h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">
            {activeCar ? `VIN: ${activeCar.vin || 'НЕ УКАЗАН'}` : 'Гараж пуст'}
          </p>
        </div>
        <div className="flex gap-2">
          {activeCar && (
            <button 
              onClick={() => onDeleteCar(activeCar.id)}
              className="p-3 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-colors"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Health Card v74 */}
      <div className="bg-indigo-600 rounded-[32px] p-6 text-white shadow-xl shadow-indigo-100 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="40" cy="40" r="35" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-indigo-400/30" />
              <circle cx="40" cy="40" r="35" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={219.8} strokeDashoffset={219.8 - (219.8 * healthScore) / 100} className="text-white transition-all duration-1000" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-black text-xl">{healthScore}%</div>
          </div>
          <div>
            <h3 className="text-lg font-black leading-tight mb-1">Состояние систем</h3>
            <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider">Все показатели в норме</p>
          </div>
        </div>
        <button 
          onClick={() => onNavigate('diagnostics')}
          className="p-4 bg-white/20 hover:bg-white/30 rounded-2xl transition-all"
        >
          <Sparkles size={24} />
        </button>
      </div>

      {/* Grid 4 Squares v74 */}
      <div className="grid grid-cols-2 gap-4">
        <StatusTile 
          label="Масло" 
          icon={Droplets} 
          value={oilPct !== null ? `${oilPct}%` : "—"} 
          color="bg-amber-500" 
          onClick={() => setShowOilModal(true)}
          isPulse={oilPct === null}
        />
        <StatusTile 
          label="Тормоза" 
          icon={Activity} 
          value={brakePct !== null ? `${brakePct}%` : "—"} 
          color="bg-rose-500" 
          onClick={() => setShowBrakeModal(true)}
          isPulse={brakePct === null}
        />
        <StatusTile 
          label="Заряд" 
          icon={Zap} 
          value="12.6V" 
          color="bg-emerald-500" 
        />
        <StatusTile 
          label="Расход" 
          icon={Fuel} 
          value="8.4L" 
          color="bg-indigo-500" 
        />
      </div>

      {/* Odometer v74 */}
      <button 
        onClick={() => setShowOdometerModal(true)}
        className="w-full bg-slate-50 p-6 rounded-[32px] flex items-center justify-between group active:scale-[0.98] transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white text-indigo-600 rounded-2xl shadow-sm">
            <Gauge size={24} />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Пробег авто</p>
            <h4 className="text-xl font-black text-slate-900">{currentOdometer.toLocaleString()} км</h4>
          </div>
        </div>
        <PencilLine size={20} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
      </button>

      {/* Modals */}
      <ServiceModal isOpen={showOilModal} onClose={() => setShowOilModal(false)} title="Замена масла" icon={Droplets} form={oilForm} onSubmit={onOilSubmit} />
      <ServiceModal isOpen={showBrakeModal} onClose={() => setShowBrakeModal(false)} title="Замена колодок" icon={Activity} form={oilForm} onSubmit={onBrakeSubmit} />
      <OdometerModal isOpen={showOdometerModal} onClose={() => setShowOdometerModal(false)} currentOdometer={currentOdometer} onSubmit={onOdometerSubmit} />
    </div>
  );
};

const StatusTile = ({ label, icon: Icon, value, color, onClick, isPulse }: any) => (
  <motion.button
    whileTap={onClick ? { scale: 0.95 } : {}}
    onClick={onClick}
    className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-4 text-left relative overflow-hidden"
  >
    <div className={`w-12 h-12 ${color} text-white rounded-2xl flex items-center justify-center shadow-lg shadow-black/5`}>
      <Icon size={24} />
    </div>
    <div>
      <h4 className="text-xl font-black text-slate-900">{value}</h4>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    </div>
    {isPulse && (
      <div className="absolute top-4 right-4">
        <motion.div 
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }} 
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-2 h-2 bg-indigo-500 rounded-full"
        />
      </div>
    )}
  </motion.button>
);

const ServiceModal = ({ isOpen, onClose, title, icon: Icon, form, onSubmit }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl">
        <div className="flex justify-between items-center mb-8">
           <h3 className="text-lg font-black">{title}</h3>
           <button onClick={onClose} className="text-slate-300"><X size={24} /></button>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Текущий пробег (км)</label>
              <input type="number" {...form.register('odometer')} className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-black text-lg" />
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Интервал до следующей</label>
              <input type="number" {...form.register('interval')} className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-black text-lg" />
           </div>
           <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black">СОХРАНИТЬ</button>
        </form>
      </motion.div>
    </div>
  );
};

const OdometerModal = ({ isOpen, onClose, currentOdometer, onSubmit }: any) => {
  const [val, setVal] = useState(currentOdometer);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[32px] p-10 w-full max-w-xs shadow-2xl text-center">
        <h3 className="text-xl font-black mb-6">Новый пробег</h3>
        <input type="number" value={val} onChange={(e) => setVal(Number(e.target.value))} className="w-full bg-slate-50 border-none rounded-2xl py-6 text-3xl font-black text-center mb-8 outline-none" />
        <button onClick={() => onSubmit({ odometer: val })} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black">ОБНОВИТЬ</button>
        <button onClick={onClose} className="w-full text-slate-300 font-bold text-xs mt-4 uppercase">Отмена</button>
      </motion.div>
    </div>
  );
};
