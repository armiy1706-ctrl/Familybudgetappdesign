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
  PencilLine
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
  
  const currentOdometer = dashboardData.currentOdometer;
  const oilStatus = dashboardData.oilStatus;
  const brakeStatus = dashboardData.brakeStatus;
  
  const oilForm = useForm<ServiceFormData>({
    defaultValues: {
      date: oilStatus?.lastDate || '2026-02-13',
      odometer: oilStatus?.lastKm || 10000,
      interval: (oilStatus?.nextKm - oilStatus?.lastKm) || 10000
    }
  });

  const brakeForm = useForm<ServiceFormData>({
    defaultValues: {
      date: brakeStatus?.lastDate || '2026-02-13',
      odometer: brakeStatus?.lastKm || 5000,
      interval: (brakeStatus?.nextKm - brakeStatus?.lastKm) || 30000
    }
  });

  const odometerForm = useForm<{ odometer: number }>({
    defaultValues: {
      odometer: currentOdometer
    }
  });

  const watchOilOdometer = oilForm.watch('odometer');
  const watchOilInterval = oilForm.watch('interval');
  const nextOilServiceKm = Number(watchOilOdometer || 0) + Number(watchOilInterval || 0);

  const watchBrakeOdometer = brakeForm.watch('odometer');
  const watchBrakeInterval = brakeForm.watch('interval');
  const nextBrakeServiceKm = Number(watchBrakeOdometer || 0) + Number(watchBrakeInterval || 0);

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
    toast.success('Текущий пробег обновлен!');
    setShowOdometerModal(false);
  };

  const getOilPercentage = () => {
    if (!oilStatus || !oilStatus.nextKm || !oilStatus.lastKm) return 100;
    const totalDistance = oilStatus.nextKm - oilStatus.lastKm;
    if (totalDistance <= 0) return 100;
    const remaining = oilStatus.nextKm - (currentOdometer || 0);
    const percentage = Math.max(0, Math.min(100, (remaining / totalDistance) * 100));
    return Math.round(percentage);
  };

  const getBrakePercentage = () => {
    if (!brakeStatus || !brakeStatus.nextKm || !brakeStatus.lastKm) return 100;
    const totalDistance = brakeStatus.nextKm - brakeStatus.lastKm;
    if (totalDistance <= 0) return 100;
    const remaining = brakeStatus.nextKm - (currentOdometer || 0);
    const percentage = Math.max(0, Math.min(100, (remaining / totalDistance) * 100));
    return Math.round(percentage);
  };

  const getHealthScore = () => {
    const oil = getOilPercentage();
    const brake = getBrakePercentage();
    const score = Math.round((oil * 0.5) + (brake * 0.5));
    return score;
  };

  const getHealthStatus = (score: number) => {
    if (score > 85) return { label: 'Отличное', color: 'text-emerald-400', icon: ShieldCheck };
    if (score > 60) return { label: 'Хорошее', color: 'text-amber-400', icon: Activity };
    return { label: 'Требует внимания', color: 'text-rose-400', icon: AlertTriangle };
  };

  const healthScore = getHealthScore();
  const healthStatus = getHealthStatus(healthScore);

  return (
    <div className="space-y-8 relative">
      {/* Header Info */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            {activeCar ? `${activeCar.make} ${activeCar.model}` : 'Добавьте автомобиль'}
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-slate-500 font-medium">
              {activeCar ? `VIN: ${activeCar.vin || '************'} • ${activeCar.year} г.в.` : 'Гараж пуст'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-600 shadow-sm transition-all">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Health Score Hero */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[32px] p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-100">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-6 text-center md:text-left">
            <div>
              <p className="text-indigo-200 text-xs font-black uppercase tracking-[0.2em] mb-2">Общее состояние (Health Score)</p>
              <div className="flex items-center justify-center md:justify-start gap-4">
                <span className="text-7xl font-black">{healthScore}</span>
                <div className="h-12 w-1 bg-white/20 rounded-full"></div>
                <div>
                  <div className={`flex items-center gap-1 ${healthStatus.color} font-bold`}>
                    <healthStatus.icon size={18} />
                    <span>{healthStatus.label}</span>
                  </div>
                  <p className="text-indigo-200 text-sm">Прогноз на 6 мес: {healthScore > 80 ? 'Стабильно' : 'Снижение'}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center md:items-start gap-3">
              <button 
                onClick={() => onNavigate('diagnostics')}
                className="group relative w-full md:w-auto bg-white text-indigo-700 px-6 py-4 rounded-2xl font-black text-[11px] sm:text-sm hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] active:scale-95 overflow-hidden border border-white/50"
              >
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/60 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                <Sparkles size={18} className="text-indigo-400 group-hover:rotate-12 group-hover:scale-110 transition-all" />
                <span className="relative z-10 uppercase tracking-tight">Обратиться к ИИ-автомеханику</span>
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button 
                onClick={() => setShowOdometerModal(true)}
                className="group w-full md:w-auto bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl font-bold text-[13px] transition-all inline-flex items-center justify-center gap-3 border border-white/20 backdrop-blur-sm active:scale-95"
              >
                <div className="relative flex items-center justify-center">
                  <Gauge size={18} className="text-indigo-300 group-hover:rotate-12 transition-transform" />
                  <PencilLine size={10} className="absolute -top-1 -right-1 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-left">
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200/60 leading-none mb-0.5">Текущий пробег</p>
                  <p className="text-sm font-black">{currentOdometer.toLocaleString()} км</p>
                </div>
                <PlusCircle size={14} className="ml-1 text-white/30 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
            <HealthMiniCard 
              icon={Droplets} 
              label="Масло" 
              status={`${getOilPercentage()}%`} 
              subStatus={oilStatus ? `След: ${oilStatus.nextKm} км` : 'Нажмите для ввода'}
              color={getOilPercentage() < 20 ? "text-rose-400" : "text-emerald-400"} 
              onClick={() => {
                if (!activeCar) return toast.error('Добавьте авто');
                setShowOilModal(true);
              }}
            />
            <HealthMiniCard 
              icon={Activity} 
              label="Тормоза" 
              status={`${getBrakePercentage()}%`} 
              subStatus={brakeStatus ? `След: ${brakeStatus.nextKm} км` : 'Нажмите для ввода'}
              color={getBrakePercentage() < 20 ? "text-rose-400" : "text-amber-400"} 
              onClick={() => {
                if (!activeCar) return toast.error('Добавьте авто');
                setShowBrakeModal(true);
              }}
            />
            <HealthMiniCard icon={Zap} label="АКБ" status="12.4V" color="text-emerald-400" />
            <HealthMiniCard icon={Fuel} label="Расход" status="8.4л" color="text-indigo-200" />
          </div>
        </div>
        
        <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
          <Activity size={200} />
        </div>
      </div>

      {/* Oil Service Modal */}
      <ServiceModal 
        isOpen={showOilModal} 
        onClose={() => setShowOilModal(false)} 
        title="Замена масла" 
        icon={Droplets} 
        colorClass="text-amber-600"
        bgClass="bg-amber-50"
        accentClass="ring-amber-500"
        accentBg="bg-amber-50"
        accentText="text-amber-700"
        accentPrice="text-amber-600"
        form={oilForm}
        onSubmit={onOilSubmit}
        nextKm={nextOilServiceKm}
      />

      {/* Brake Service Modal */}
      <ServiceModal 
        isOpen={showBrakeModal} 
        onClose={() => setShowBrakeModal(false)} 
        title="Замена колодок" 
        icon={Activity} 
        colorClass="text-rose-600"
        bgClass="bg-rose-50"
        accentClass="ring-rose-500"
        accentBg="bg-rose-50"
        accentText="text-rose-700"
        accentPrice="text-rose-600"
        form={brakeForm}
        onSubmit={onBrakeSubmit}
        nextKm={nextBrakeServiceKm}
      />

      {/* Odometer Modal */}
      <AnimatePresence>
        {showOdometerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOdometerModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl relative z-10"
            >
              <div className="mb-6">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                  <Gauge size={24} />
                </div>
                <h3 className="text-xl font-black text-slate-900">Обновить пробег</h3>
                <p className="text-slate-500 text-xs">Введите актуальные показания одометра</p>
              </div>

              <form onSubmit={odometerForm.handleSubmit(onOdometerSubmit)} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Текущий пробег (км)</label>
                  <input 
                    {...odometerForm.register('odometer', { required: true, valueAsNumber: true })}
                    type="number"
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg"
                >
                  Обновить
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <Calendar size={20} />
              </div>
              <h4 className="font-bold text-slate-900">Следующее ТО</h4>
            </div>
            <span className="text-xs font-bold text-slate-400">Через 2,400 км</span>
          </div>
          <div className="space-y-4">
            <ServiceItem icon={Wrench} label="Замена масла и фильтра" date="15 Июня" price="~8,500 ₽" />
            <ServiceItem icon={Droplets} label="Тормозная жидкость" date="15 Июня" price="~3,200 ₽" />
          </div>
          <button className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-colors border border-slate-100">
            Записаться в сервис
          </button>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>
              <h4 className="font-bold text-slate-900">Рекомендации ИИ</h4>
            </div>
            <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase">2 Важных</span>
          </div>
          <div className="space-y-4">
            <RecommendationItem 
              title="Низкое давление в шинах" 
              desc="Заднее правое колесо: 1.9 bar. Рекомендуется 2.3 bar." 
              severity="Низкий" 
              severityColor="text-blue-500"
            />
            <RecommendationItem 
              title="Износ передних колодок" 
              desc="Толщина фрикционного слоя 3мм. Замена через ~1000 км." 
              severity="Средний" 
              severityColor="text-amber-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const ServiceModal = ({ isOpen, onClose, title, icon: Icon, colorClass, bgClass, accentClass, accentBg, accentText, accentPrice, form, onSubmit, nextKm }: any) => {
  const { register, handleSubmit } = form;
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl relative z-10 overflow-hidden"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="mb-8">
              <div className={`w-16 h-16 ${bgClass} ${colorClass} rounded-2xl flex items-center justify-center mb-4`}>
                <Icon size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900">{title}</h3>
              <p className="text-slate-500 text-sm">Внесите данные о последнем обслуживании</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Дата работ</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      {...register('date', { required: true })}
                      type="date"
                      className={`w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 ${accentClass} outline-none transition-all`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Пробег (км)</label>
                    <div className="relative">
                      <Gauge className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        {...register('odometer', { required: true, valueAsNumber: true })}
                        type="number"
                        className={`w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 ${accentClass} outline-none transition-all`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Интервал (км)</label>
                    <div className="relative">
                      <Wrench className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        {...register('interval', { required: true, valueAsNumber: true })}
                        type="number"
                        className={`w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 ${accentClass} outline-none transition-all`}
                      />
                    </div>
                  </div>
                </div>

                <div className={`p-4 ${accentBg} rounded-2xl border border-slate-100`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-bold ${accentText} uppercase tracking-wider`}>След. обслуживание:</span>
                    <span className={`text-xl font-black ${accentPrice}`}>{nextKm.toLocaleString()} км</span>
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-[0.98]"
              >
                Сохранить данные
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const HealthMiniCard = ({ icon: Icon, label, status, subStatus, color, onClick }: any) => (
  <motion.div 
    whileHover={{ y: -4, scale: 1.02 }}
    whileTap={{ scale: 0.96 }}
    onClick={onClick}
    className="group relative bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 min-w-[120px] cursor-pointer hover:bg-white/20 hover:border-white/30 transition-all flex flex-col justify-between overflow-hidden"
  >
    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <PlusCircle size={14} className="text-white/70" />
    </div>

    <div>
      <Icon size={20} className={`${color} group-hover:scale-110 transition-transform`} />
      <p className="mt-2 text-[10px] font-black text-indigo-100 uppercase tracking-widest opacity-80">{label}</p>
    </div>
    <div className="mt-2">
      <p className="text-lg font-black leading-none group-hover:text-indigo-50 transition-colors">{status}</p>
      <p className="text-[9px] text-white/50 mt-1 font-medium group-hover:text-white/80 transition-colors truncate">
        {subStatus}
      </p>
    </div>
    
    <div className="absolute bottom-0 left-0 h-0.5 bg-white/10 group-hover:bg-white/40 transition-colors w-full" />
  </motion.div>
);

const ServiceItem = ({ icon: Icon, label, date, price }: any) => (
  <div className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition-colors">
    <div className="flex items-center gap-3">
      <Icon size={18} className="text-slate-400" />
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </div>
    <div className="text-right">
      <p className="text-xs font-bold text-slate-900">{date}</p>
      <p className="text-[10px] text-slate-400">{price}</p>
    </div>
  </div>
);

const RecommendationItem = ({ title, desc, severity, severityColor }: any) => (
  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
    <div className="flex justify-between items-center">
      <h5 className="text-sm font-bold text-slate-900">{title}</h5>
      <span className={`text-[10px] font-black uppercase ${severityColor}`}>{severity}</span>
    </div>
    <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
  </div>
);
