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
      oilStatus: { lastDate: data.date, lastKm: Number(data.odometer), nextKm: Number(data.odometer) + Number(data.interval) }
    });
    toast.success('Обновлено');
    setShowOilModal(false);
  };

  const onBrakeSubmit = (data: ServiceFormData) => {
    setDashboardData({
      ...dashboardData,
      brakeStatus: { lastDate: data.date, lastKm: Number(data.odometer), nextKm: Number(data.odometer) + Number(data.interval) }
    });
    toast.success('Обновлено');
    setShowBrakeModal(false);
  };

  const onOdometerSubmit = (data: { odometer: number }) => {
    setDashboardData({ ...dashboardData, currentOdometer: Number(data.odometer) });
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
    <div className="space-y-8">
      {/* HUD Header */}
      <div className="flex justify-between items-center bg-white/5 p-5 rounded-[24px] border border-white/10 backdrop-blur-sm">
        <div>
          <h2 className="text-2xl font-black text-white leading-tight">
            {activeCar ? `${activeCar.make} ${activeCar.model}` : 'SYSTEM READY'}
          </h2>
          <p className="text-indigo-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-1">
            {activeCar ? `VIN: ${activeCar.vin || '• • • •'}` : 'WAITING FOR DATA'}
          </p>
        </div>
        <div className="flex gap-3">
          {activeCar && (
            <button onClick={() => onDeleteCar(activeCar.id)} className="p-3 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500/20 border border-rose-500/20 transition-all">
              <Trash2 size={20} />
            </button>
          )}
          <button className="p-3 bg-white/5 text-slate-400 rounded-xl border border-white/10">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Futuristic Health Panel */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-[40px] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-[40px] p-8 border border-white/10 flex items-center justify-between overflow-hidden">
          <div className="flex items-center gap-8 relative z-10">
            <div className="relative w-24 h-24">
              <svg className="w-full h-full transform -rotate-90 filter drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]">
                <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={263.8} strokeDashoffset={263.8 - (263.8 * healthScore) / 100} className="text-indigo-500 transition-all duration-1000" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-black text-2xl text-white">{healthScore}%</div>
            </div>
            <div>
              <h3 className="text-xl font-black text-white mb-1 uppercase tracking-tighter">System Health</h3>
              <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                Все системы в норме
              </p>
            </div>
          </div>
          <button onClick={() => onNavigate('diagnostics')} className="relative p-5 bg-indigo-500 text-white rounded-[28px] shadow-lg shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all overflow-hidden group/btn">
             <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
             <Sparkles size={28} />
          </button>
        </div>
      </div>

      {/* Grid HUD Tiles */}
      <div className="grid grid-cols-2 gap-5">
        <HUDTile label="Масло" icon={Droplets} value={oilPct !== null ? `${oilPct}%` : "0%"} color="text-amber-400" glow="shadow-amber-500/20" onClick={() => setShowOilModal(true)} isPulse={oilPct === null} />
        <HUDTile label="Тормоза" icon={Activity} value={brakePct !== null ? `${brakePct}%` : "0%"} color="text-rose-400" glow="shadow-rose-500/20" onClick={() => setShowBrakeModal(true)} isPulse={brakePct === null} />
        <HUDTile label="Заряд" icon={Zap} value="12.6V" color="text-cyan-400" glow="shadow-cyan-500/20" />
        <HUDTile label="Расход" icon={Fuel} value="8.4L" color="text-indigo-400" glow="shadow-indigo-500/20" />
      </div>

      {/* HUD Odometer */}
      <button onClick={() => setShowOdometerModal(true)} className="w-full bg-white/5 hover:bg-white/10 p-6 rounded-[32px] border border-white/10 backdrop-blur-sm flex items-center justify-between group transition-all">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-indigo-500/20 text-indigo-400 rounded-[22px] border border-indigo-500/30 group-hover:bg-indigo-500 group-hover:text-white transition-all">
            <Gauge size={24} />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Vehicle Mileage</p>
            <h4 className="text-2xl font-black text-white tabular-nums">{currentOdometer.toLocaleString()} <span className="text-sm font-bold text-slate-500">KM</span></h4>
          </div>
        </div>
        <div className="p-3 bg-white/5 rounded-xl opacity-40 group-hover:opacity-100 transition-opacity">
          <PencilLine size={20} className="text-white" />
        </div>
      </button>

      {/* HUD Modals */}
      <HUDModal isOpen={showOilModal} onClose={() => setShowOilModal(false)} title="Engine Oil Service" icon={Droplets} form={oilForm} onSubmit={onOilSubmit} />
      <HUDModal isOpen={showBrakeModal} onClose={() => setShowBrakeModal(false)} title="Brake Pad Service" icon={Activity} form={oilForm} onSubmit={onBrakeSubmit} />
      <OdometerModal isOpen={showOdometerModal} onClose={() => setShowOdometerModal(false)} currentOdometer={currentOdometer} onSubmit={onOdometerSubmit} />
    </div>
  );
};

const HUDTile = ({ label, icon: Icon, value, color, glow, onClick, isPulse }: any) => (
  <motion.button
    whileHover={onClick ? { y: -4, backgroundColor: 'rgba(255,255,255,0.08)' } : {}}
    whileTap={onClick ? { scale: 0.95 } : {}}
    onClick={onClick}
    className={`bg-white/5 p-6 rounded-[32px] border border-white/10 shadow-lg ${glow} backdrop-blur-md flex flex-col gap-5 text-left relative overflow-hidden group transition-all`}
  >
    <div className={`w-14 h-14 bg-slate-900/50 ${color} rounded-[20px] flex items-center justify-center border border-white/5 shadow-inner`}>
      <Icon size={28} className="drop-shadow-[0_0_8px_currentColor]" />
    </div>
    <div>
      <h4 className="text-2xl font-black text-white mb-0.5">{value}</h4>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">{label}</p>
    </div>
    {isPulse && (
       <div className="absolute top-4 right-4 flex items-center gap-1">
          <span className="text-[8px] font-black text-indigo-400 animate-pulse uppercase">Required</span>
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
       </div>
    )}
  </motion.button>
);

const HUDModal = ({ isOpen, onClose, title, icon: Icon, form, onSubmit }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900 border border-white/10 rounded-[40px] p-8 w-full max-w-sm shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-cyan-500" />
        <div className="flex justify-between items-center mb-8 pt-2">
           <h3 className="text-lg font-black text-white uppercase tracking-tight">{title}</h3>
           <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={24} /></button>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Current Odometer (KM)</label>
              <input type="number" {...form.register('odometer')} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 font-black text-white text-lg focus:ring-2 ring-indigo-500/50 outline-none transition-all" />
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Service Interval (KM)</label>
              <input type="number" {...form.register('interval')} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 font-black text-white text-lg focus:ring-2 ring-indigo-500/50 outline-none transition-all" />
           </div>
           <button type="submit" className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[24px] font-black shadow-lg shadow-indigo-500/20 transition-all active:scale-95">СИНХРОНИЗИРОВАТЬ</button>
        </form>
      </motion.div>
    </div>
  );
};

const OdometerModal = ({ isOpen, onClose, currentOdometer, onSubmit }: any) => {
  const [val, setVal] = useState(currentOdometer);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900 border border-white/10 rounded-[40px] p-10 w-full max-w-xs shadow-2xl text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500" />
        <h3 className="text-xl font-black text-white uppercase mb-6">Update Mileage</h3>
        <input type="number" value={val} onChange={(e) => setVal(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-3xl py-8 text-4xl font-black text-center text-white outline-none mb-8 focus:ring-2 ring-indigo-500/50" />
        <button onClick={() => onSubmit({ odometer: val })} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black shadow-lg active:scale-95 transition-all">ОБНОВИТЬ ДАННЫЕ</button>
        <button onClick={onClose} className="w-full text-slate-500 font-bold text-xs mt-6 uppercase tracking-widest hover:text-white transition-colors">Cancel</button>
      </motion.div>
    </div>
  );
};
