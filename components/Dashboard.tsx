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
  Copy,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';

interface ServiceFormData {
  date: string;
  odometer: number;
  interval: number;
}

interface FuelFormData {
  odometer: number;
  liters: number;
}

interface BatteryFormData {
  age: number;
  climate: 'moderate' | 'cold' | 'very_cold' | 'hot';
  engine: 'petrol' | 'diesel';
  trips: 'short' | 'daily' | 'long' | 'rare';
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
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showBatteryModal, setShowBatteryModal] = useState(false);
  
  const currentOdometer = Number(dashboardData?.currentOdometer) || (Number(activeCar?.mileage) || 0);
  const oilStatus = dashboardData?.oilStatus;
  const brakeStatus = dashboardData?.brakeStatus;
  const fuelConsumption = dashboardData?.fuelConsumption || 0;
  const batteryResult = dashboardData?.batteryResult;
  
  const oilForm = useForm<ServiceFormData>({
    defaultValues: {
      date: oilStatus?.lastDate || new Date().toISOString().split('T')[0],
      odometer: oilStatus?.lastKm || currentOdometer,
      interval: oilStatus ? (oilStatus.nextKm - oilStatus.lastKm) : 10000
    }
  });

  const brakeForm = useForm<ServiceFormData>({
    defaultValues: {
      date: brakeStatus?.lastDate || new Date().toISOString().split('T')[0],
      odometer: brakeStatus?.lastKm || currentOdometer,
      interval: brakeStatus ? (brakeStatus.nextKm - brakeStatus.lastKm) : 30000
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

  const fuelForm = useForm<FuelFormData>({
    defaultValues: {
      odometer: currentOdometer,
      liters: 0
    }
  });

  const batteryForm = useForm<BatteryFormData>({
    defaultValues: {
      age: 1,
      climate: 'moderate',
      engine: 'petrol',
      trips: 'daily'
    }
  });

  const onFuelSubmit = (data: FuelFormData) => {
    if (data.odometer <= 0 || data.liters <= 0) {
      toast.error('Введите корректные данные');
      return;
    }
    const consumption = (data.liters / data.odometer) * 100;
    const roundedConsumption = Math.round(consumption * 10) / 10;
    setDashboardData({
      ...dashboardData,
      fuelConsumption: roundedConsumption
    });
    toast.success(`Расход рассчитан: ${roundedConsumption} л/100км`);
    setShowFuelModal(false);
    fuelForm.reset({ odometer: 0, liters: 0 });
  };

  const onOdometerSubmit = (data: { odometer: number }) => {
    setDashboardData({ ...dashboardData, currentOdometer: Number(data.odometer) });
    toast.success('Текущий пробег обновлен!');
    setShowOdometerModal(false);
  };

  const onBatterySubmit = (data: BatteryFormData) => {
    let baseResource = 5;
    
    if (data.climate === 'cold') baseResource -= 1;
    if (data.climate === 'very_cold') baseResource -= 1.5;
    if (data.climate === 'hot') baseResource -= 1;
    if (data.engine === 'diesel') baseResource -= 0.5;
    if (data.trips === 'short' || data.trips === 'rare') baseResource -= 0.5;

    const remaining = baseResource - data.age;
    const isOk = data.age < baseResource;
    
    let risk = 'Низкий';
    if (data.age >= baseResource) risk = 'Высокий';
    else if (data.age >= baseResource - 1) risk = 'Средний';

    setDashboardData({
      ...dashboardData,
      batteryResult: {
        isOk,
        remaining: Math.max(0, Math.round(remaining * 10) / 10),
        risk,
        age: data.age
      }
    });
    
    toast.success('Состояние АКБ рассчитано!');
    setShowBatteryModal(false);
  };

  const getOilPercentage = () => {
    if (!oilStatus) return 100;
    const totalDistance = oilStatus.nextKm - oilStatus.lastKm;
    const remaining = oilStatus.nextKm - currentOdometer;
    return Math.round(Math.max(0, Math.min(100, (remaining / totalDistance) * 100)));
  };

  const getBrakePercentage = () => {
    if (!brakeStatus) return 100;
    const totalDistance = brakeStatus.nextKm - brakeStatus.lastKm;
    const remaining = brakeStatus.nextKm - currentOdometer;
    return Math.round(Math.max(0, Math.min(100, (remaining / totalDistance) * 100)));
  };

  const getOverallHealthScore = () => {
    const oil = getOilPercentage();
    const brakes = getBrakePercentage();
    return Math.round((oil + brakes) / 2);
  };

  const getHealthInfo = (score: number) => {
    if (score >= 85) return { label: 'Отлично', icon: ShieldCheck, color: 'text-emerald-400', desc: 'Системы в норме' };
    if (score >= 60) return { label: 'Хорошо', icon: Activity, color: 'text-amber-400', desc: 'Требуется плановое ТО' };
    return { label: 'Внимание', icon: AlertTriangle, color: 'text-rose-400', desc: 'Критический износ' };
  };

  const healthScore = getOverallHealthScore();
  const healthInfo = getHealthInfo(healthScore);

  return (
    <div className="space-y-8 relative">
      {/* Header Info */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            {activeCar ? `${activeCar.make} ${activeCar.model}` : 'Добавьте автомобиль'}
          </h2>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-slate-500 font-medium">
              {activeCar ? `VIN: ${activeCar.vin || '************'} • ${activeCar.year} г.в.` : 'Гараж пуст'}
            </p>
            {activeCar?.licensePlate && (
              <span className="text-[10px] bg-white text-slate-900 px-2 py-0.5 rounded border-2 border-slate-900 font-black tracking-tighter uppercase shadow-sm">
                {activeCar.licensePlate}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {activeCar?.vin && (
            <button 
              onClick={() => {
                navigator.clipboard.writeText(activeCar.vin);
                toast.success('VIN скопирован');
              }} 
              title="Скопировать VIN"
              className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 shadow-sm transition-all"
            >
              <Copy size={20} />
            </button>
          )}
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
                  <div className={`flex items-center gap-1 ${healthInfo.color} font-bold`}>
                    {(() => {
                      const Icon = healthInfo.icon;
                      return <Icon size={18} />;
                    })()}
                    <span>{healthInfo.label}</span>
                  </div>
                  <p className="text-indigo-200 text-sm">{healthInfo.desc}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center md:items-start gap-3">
              <button 
                onClick={() => onNavigate('diagnostics')}
                className="w-full md:w-auto bg-white text-indigo-600 px-6 py-4 rounded-2xl font-bold text-sm hover:bg-indigo-50 transition-all inline-flex items-center justify-center gap-4 shadow-lg active:scale-95 group"
              >
                <Sparkles size={20} className="text-indigo-600 group-hover:rotate-12 transition-transform" />
                ЗАПУСТИТЬ ИИ-АВТОМЕХАНИК
                <ChevronRight size={16} />
              </button>
              
              <button 
                onClick={() => setShowOdometerModal(true)}
                className="w-full md:w-auto bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl font-bold text-[13px] transition-all flex flex-col items-center justify-center gap-0.5 border border-white/20 backdrop-blur-sm active:scale-95 group relative"
              >
                <div className="flex items-center gap-2">
                  <Gauge size={16} className="text-indigo-300" />
                  <span>Пробег: <span className="text-white">{currentOdometer.toLocaleString()} км</span></span>
                </div>
                <span className="text-[7px] font-black text-white/40 uppercase tracking-widest animate-pulse">
                  НАЖМИТЕ ДЛЯ ВВОДА
                </span>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
            <HealthMiniCard 
              icon={Droplets} 
              label="Масло" 
              status={`${getOilPercentage()}%`} 
              subStatus={oilStatus ? `След: ${oilStatus.nextKm} км` : 'Ресурс масла'}
              color={getOilPercentage() < 20 ? "text-rose-400" : "text-emerald-400"} 
              onClick={() => activeCar ? setShowOilModal(true) : toast.error('Добавьте авто')}
            />
            <HealthMiniCard 
              icon={Activity} 
              label="Тормоза" 
              status={`${getBrakePercentage()}%`} 
              subStatus={brakeStatus ? `След: ${brakeStatus.nextKm} км` : 'Износ колодок'}
              color={getBrakePercentage() < 20 ? "text-rose-400" : "text-amber-400"} 
              onClick={() => activeCar ? setShowBrakeModal(true) : toast.error('Добавьте авто')}
            />
            <HealthMiniCard 
              icon={Zap} 
              label="АКБ" 
              status={batteryResult ? (batteryResult.isOk ? "Normal" : "Warning") : "---"} 
              subStatus={batteryResult ? `Риск: ${batteryResult.risk}` : "Оценить"}
              color={batteryResult ? (batteryResult.isOk ? "text-emerald-400" : "text-rose-400") : "text-emerald-400"} 
              onClick={() => setShowBatteryModal(true)}
            />
            <HealthMiniCard 
              icon={Fuel} 
              label="Расход" 
              status={fuelConsumption > 0 ? `${fuelConsumption}л` : "--- л"} 
              subStatus={fuelConsumption > 0 ? "л/100 км" : "Рассчитать"}
              color="text-indigo-200" 
              onClick={() => setShowFuelModal(true)}
            />
          </div>
        </div>
        
        <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
          <Activity size={200} />
        </div>
      </div>

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
            {oilStatus && getOilPercentage() < 30 ? (
              <RecommendationItem 
                title="Низкий ресурс масла" 
                desc={`Осталось ${Math.max(0, oilStatus.nextKm - currentOdometer).toLocaleString()} км. Рекомендуется планировать замену.`} 
                severity="Высокий" 
                severityColor="text-rose-500"
              />
            ) : null}
            {brakeStatus && getBrakePercentage() < 30 ? (
              <RecommendationItem 
                title="Износ тормозных колодок" 
                desc={`Ресурс тормозной системы: ${getBrakePercentage()}%. Эффе��тивность торможения может быть снижена.`} 
                severity="Средний" 
                severityColor="text-amber-500"
              />
            ) : null}
            {!oilStatus && !brakeStatus ? (
              <RecommendationItem 
                title="Данные не заполнены" 
                desc="Введите данные о последнем ТО (масло, колодки) для точного расчета состояния." 
                severity="Инфо" 
                severityColor="text-indigo-500"
              />
            ) : (getOilPercentage() >= 30 && getBrakePercentage() >= 30) ? (
              <RecommendationItem 
                title="Системы в порядке" 
                desc="Текущие показатели масла и тормозной системы находятся в пределах нормы." 
                severity="Норма" 
                severityColor="text-emerald-500"
              />
            ) : null}
          </div>
        </div>
      </div>

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

      <AnimatePresence>
        {showBatteryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBatteryModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl relative z-10 overflow-y-auto max-h-[90vh]">
              <button onClick={() => setShowBatteryModal(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
              
              <div className="mb-6">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4"><Zap size={24} /></div>
                <h3 className="text-xl font-black text-slate-900">Проверка состояния АКБ</h3>
                <p className="text-slate-500 text-xs font-medium">Оценка ресурса аккумулятора по параметрам</p>
              </div>

              <form onSubmit={batteryForm.handleSubmit(onBatterySubmit)} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Возраст АКБ (лет)</label>
                    <input {...batteryForm.register('age', { required: true, valueAsNumber: true })} type="number" step="0.5" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none transition-all" />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Регион / Климат</label>
                    <select {...batteryForm.register('climate')} className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none transition-all appearance-none cursor-pointer">
                      <option value="moderate">Умеренный климат</option>
                      <option value="cold">Холодный (ниже -20°C)</option>
                      <option value="very_cold">Очень холодный (ниже -30°C)</option>
                      <option value="hot">Жаркий климат</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Тип двигателя</label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center justify-center p-4 bg-slate-50 rounded-2xl cursor-pointer has-[:checked]:bg-indigo-50 has-[:checked]:ring-2 ring-indigo-500 transition-all border border-transparent">
                        <input {...batteryForm.register('engine')} type="radio" value="petrol" className="hidden" />
                        <span className="text-xs font-bold text-slate-700">Бензин</span>
                      </label>
                      <label className="flex items-center justify-center p-4 bg-slate-50 rounded-2xl cursor-pointer has-[:checked]:bg-indigo-50 has-[:checked]:ring-2 ring-indigo-500 transition-all border border-transparent">
                        <input {...batteryForm.register('engine')} type="radio" value="diesel" className="hidden" />
                        <span className="text-xs font-bold text-slate-700">Дизель</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Частота и тип поездок</label>
                    <select {...batteryForm.register('trips')} className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none transition-all appearance-none cursor-pointer">
                      <option value="short">Короткие поездки (5-10 км)</option>
                      <option value="daily">Ежедневные (20-40 км)</option>
                      <option value="long">Длинные поездки</option>
                      <option value="rare">Редкая эксплуатация</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  {batteryResult && (
                    <div className={`mb-6 p-5 rounded-[24px] border ${batteryResult.isOk ? 'bg-indigo-50/50 border-indigo-100' : 'bg-rose-50/50 border-rose-100'}`}>
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`p-2 rounded-xl ${batteryResult.isOk ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'}`}>
                          {batteryResult.isOk ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
                        </div>
                        <div>
                          <p className={`text-xs font-black ${batteryResult.isOk ? 'text-indigo-700' : 'text-rose-700'} mb-1`}>
                            {batteryResult.isOk ? '⏳ Аккумулятор в норме' : '🔋 Рекомендуется замена'}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                            {batteryResult.isOk 
                              ? 'Замена пока не требуется, системы работают штатно.' 
                              : 'Ресурс практически исчерпан. Возможны проблемы при запуске.'}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200/50">
                        <div>
                          <p className="text-[9px] font-black uppercase text-slate-400 mb-0.5">Остаточный ресурс</p>
                          <p className="text-sm font-black text-slate-900">~{batteryResult.remaining} лет</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase text-slate-400 mb-0.5">Риск к зиме</p>
                          <p className={`text-sm font-black ${
                            batteryResult.risk === 'Высокий' ? 'text-rose-500' : 
                            batteryResult.risk === 'Средний' ? 'text-amber-500' : 'text-indigo-500'
                          }`}>{batteryResult.risk}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-[0.98]">
                    Оценить состояние
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFuelModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFuelModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl relative z-10">
              <div className="mb-6">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4"><Fuel size={24} /></div>
                <h3 className="text-xl font-black text-slate-900">Калькулятор расхода</h3>
                <p className="text-slate-500 text-xs">Рассчитайте средний расход топлива</p>
              </div>
              <form onSubmit={fuelForm.handleSubmit(onFuelSubmit)} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Пробег на баке (км)</label>
                  <input {...fuelForm.register('odometer', { required: true, valueAsNumber: true })} type="number" placeholder="Напр: 650" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Заправлено топлива (литры)</label>
                  <input {...fuelForm.register('liters', { required: true, valueAsNumber: true })} type="number" step="0.01" placeholder="Напр: 45" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none transition-all" />
                </div>
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg">Рассчитать</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOdometerModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowOdometerModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl relative z-10">
              <div className="mb-6">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4"><Gauge size={24} /></div>
                <h3 className="text-xl font-black text-slate-900">Обновить пробег</h3>
                <p className="text-slate-500 text-xs">Введите актуальные показания одометра</p>
              </div>
              <form onSubmit={odometerForm.handleSubmit(onOdometerSubmit)} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Текущий пробег (км)</label>
                  <input {...odometerForm.register('odometer', { required: true, valueAsNumber: true })} type="number" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none transition-all" />
                </div>
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg">Обновить</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ServiceModal = ({ isOpen, onClose, title, icon: Icon, colorClass, bgClass, accentClass, accentBg, accentText, accentPrice, form, onSubmit, nextKm }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl relative z-10 overflow-hidden">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        <div className="mb-8">
          <div className={`w-16 h-16 ${bgClass} ${colorClass} rounded-2xl flex items-center justify-center mb-4`}><Icon size={32} /></div>
          <h3 className="text-2xl font-black text-slate-900">{title}</h3>
          <p className="text-slate-500 text-sm">Внесите данные о последнем обслуживании</p>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Дата работ</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input {...form.register('date', { required: true })} type="date" className={`w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 ${accentClass} outline-none transition-all`} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Пробег (км)</label>
                <div className="relative">
                  <Gauge className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input {...form.register('odometer', { required: true, valueAsNumber: true })} type="number" className={`w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 ${accentClass} outline-none transition-all`} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Интервал (км)</label>
                <div className="relative">
                  <Wrench className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input {...form.register('interval', { required: true, valueAsNumber: true })} type="number" className={`w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 ${accentClass} outline-none transition-all`} />
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
          <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-[0.98]">Сохранить данные</button>
        </form>
      </motion.div>
    </div>
  );
};

const HealthMiniCard = ({ icon: Icon, label, status, subStatus, color, onClick }: any) => (
  <div onClick={onClick} className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 min-w-[120px] cursor-pointer hover:bg-white/20 transition-all flex flex-col justify-between relative group overflow-hidden">
    <div>
      <Icon size={20} className={color} />
      <p className="mt-2 text-[10px] font-bold text-indigo-200 uppercase tracking-widest">{label}</p>
    </div>
    <div className="mt-1">
      <p className="text-lg font-black leading-none">{status}</p>
      {subStatus && <p className="text-[9px] text-white/50 mt-1 font-medium">{subStatus}</p>}
    </div>
    
    {/* Pulsing Hint */}
    <div className="absolute inset-x-0 bottom-1 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
       <span className="text-[7px] font-black text-white/40 uppercase tracking-tighter animate-pulse">
         Нажмите для ввода
       </span>
    </div>
    
    {/* Mobile Hint (visible by default but very subtle) */}
    <div className="lg:hidden absolute bottom-1 right-2">
       <div className="w-1 h-1 bg-white/30 rounded-full animate-pulse" />
    </div>
  </div>
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
