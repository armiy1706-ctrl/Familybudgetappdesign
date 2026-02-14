import React, { useState, useEffect } from 'react';
import { User, Settings, CreditCard, Bell, Shield, History, ChevronRight, Plus, ArrowLeft, Car, Fuel, Cog, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';

type ProfileView = 'list' | 'add';

interface CarFormData {
  make: string;
  model: string;
  vin: string;
  year: string;
  engine: string;
  transmission: string;
}

const CAR_DATABASE: Record<string, string[]> = {
  'Toyota': ['Camry', 'Corolla', 'RAV4', 'Land Cruiser', 'Prius', 'Supra'],
  'BMW': ['3 Series', '5 Series', 'X5', 'X7', 'M3', 'M5', 'i8'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLE', 'GLS', 'AMG GT'],
  'Audi': ['A4', 'A6', 'Q5', 'Q7', 'Q8', 'RS6'],
  'Tesla': ['Model 3', 'Model S', 'Model X', 'Model Y', 'Cybertruck'],
  'Lada': ['Vesta', 'Granta', 'Niva Travel', 'Niva Legend', 'Largus'],
  'Hyundai': ['Solaris', 'Creta', 'Tucson', 'Santa Fe', 'Elantra'],
  'Kia': ['Rio', 'Sportage', 'Sorento', 'K5', 'Ceed'],
  'Volkswagen': ['Polo', 'Tiguan', 'Passat', 'Touareg', 'Golf'],
  'Porsche': ['911', 'Cayenne', 'Panamera', 'Taycan', 'Macan'],
};

export const Profile = ({ cars, onAddCar, activeCarIndex, onSwitchCar }: { 
  cars: any[], 
  onAddCar: (car: any) => void,
  activeCarIndex: number,
  onSwitchCar: (index: number) => void
}) => {
  const [view, setView] = useState<ProfileView>('list');

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CarFormData>({
    defaultValues: {
      make: 'Toyota',
      model: 'Camry',
      year: '2023',
      engine: 'petrol',
      transmission: 'automatic'
    }
  });

  const selectedMake = watch('make');

  useEffect(() => {
    if (selectedMake && CAR_DATABASE[selectedMake]) {
      setValue('model', CAR_DATABASE[selectedMake][0]);
    }
  }, [selectedMake, setValue]);

  const onSubmit = (data: CarFormData) => {
    const newCar = {
      id: Date.now(),
      make: data.make,
      model: data.model,
      vin: data.vin,
      year: data.year,
      active: false
    };
    onAddCar(newCar);
    toast.success(`${data.make} ${data.model} добавлен в ваш гараж!`);
    reset();
    setView('list');
  };

  if (view === 'add') {
    return (
      <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={() => setView('list')}
            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-indigo-600 shadow-sm transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-black text-slate-900">Новый автомобиль</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Марка авто</label>
              <div className="relative">
                <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <select 
                  {...register('make', { required: 'Выберите марку' })}
                  className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-10 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>Выберите марку</option>
                  {Object.keys(CAR_DATABASE).map(make => (
                    <option key={make} value={make}>{make}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronRight size={16} className="rotate-90" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Модель авто</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                   <div className="w-4.5 h-4.5 border-2 border-current rounded-sm opacity-50" />
                </div>
                <select 
                  {...register('model', { required: 'Выберите модель' })}
                  disabled={!selectedMake}
                  className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-10 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50"
                >
                  <option value="" disabled>Выберите модель</option>
                  {selectedMake && CAR_DATABASE[selectedMake]?.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronRight size={16} className="rotate-90" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">VIN-номер</label>
              <input 
                {...register('vin', { 
                  required: 'Введите VIN',
                  minLength: { value: 17, message: 'VIN должен быть 17 символов' },
                  maxLength: { value: 17, message: 'VIN должен быть 17 символов' }
                })}
                placeholder="17-значный номер кузова"
                className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none transition-all uppercase"
                maxLength={17}
              />
              {errors.vin && <p className="text-rose-500 text-[10px] mt-1 font-bold">{errors.vin.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Год выпуска</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    {...register('year', { required: true })}
                    type="number"
                    min="1990"
                    max="2026"
                    placeholder="2023"
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Двигатель</label>
                <div className="relative">
                  <Fuel className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <select 
                    {...register('engine')}
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-10 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="petrol">Бензин</option>
                    <option value="diesel">Дизель</option>
                    <option value="electric">Электро</option>
                    <option value="hybrid">Гибрид</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronRight size={16} className="rotate-90" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Тип трансмиссии</label>
              <div className="relative">
                <Cog className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <select 
                  {...register('transmission')}
                  className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-10 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="automatic">Автоматическая (АКПП)</option>
                  <option value="manual">Механическая (МКПП)</option>
                  <option value="robot">Роботизированная</option>
                  <option value="cvt">Вариатор</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronRight size={16} className="rotate-90" />
                </div>
              </div>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 mt-4 active:scale-[0.98]"
          >
            Сохранить в гараж
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24 lg:pb-0">
      {/* Profile Header */}
      <div className="bg-white rounded-[40px] p-8 md:p-10 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-10">
        <div className="relative group">
          <div className="w-32 h-32 bg-indigo-600 rounded-[40px] flex items-center justify-center text-4xl font-black text-white shadow-xl shadow-indigo-100 group-hover:scale-105 transition-transform">
            AD
          </div>
          <button className="absolute -bottom-2 -right-2 p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 shadow-lg transition-all">
            <Settings size={18} />
          </button>
        </div>
        <div className="text-center md:text-left flex-1">
          <h3 className="text-3xl font-black text-slate-900 mb-1">Alex Drive</h3>
          <p className="text-slate-400 font-medium mb-6">alex.drive@example.com • Владелец {cars.length} авто</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-4">
            <span className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest">Pro Member</span>
            <span className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black uppercase tracking-widest">Verified VIN</span>
          </div>
        </div>
      </div>

      {/* Centered Garage Section */}
      <div className="flex justify-center">
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden w-full max-w-xl">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h4 className="font-bold text-slate-900">Мой гараж</h4>
            <button 
              onClick={() => setView('add')}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold text-[10px] uppercase hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus size={12} />
              Добавить авто
            </button>
          </div>
          <div className="p-4 space-y-2">
            {cars.length > 0 ? (
              cars.map((car, index) => (
                <CarItem 
                  key={car.id} 
                  make={car.make} 
                  model={car.model} 
                  year={car.year} 
                  active={index === activeCarIndex} 
                  vin={car.vin}
                  onClick={() => onSwitchCar(index)}
                />
              ))
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mb-4">
                  <Car size={32} />
                </div>
                <p className="text-slate-900 font-bold mb-1">В гараже пусто</p>
                <p className="text-slate-400 text-xs mb-6">Добавьте ваш первый автомобиль, чтобы начать диагностику</p>
                <button 
                  onClick={() => setView('add')}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-100"
                >
                  Добавить авто
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Other Settings */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h4 className="font-bold text-slate-900">Настройки аккаунта</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
          <SettingsItem icon={Bell} label="Уведомления" value="Вкл" />
          <SettingsItem icon={Shield} label="Безопасность" value="2FA" />
          <SettingsItem icon={CreditCard} label="Подписка" value="Pro" color="text-indigo-600" />
          <SettingsItem icon={History} label="История оплат" />
        </div>
      </div>
    </div>
  );
};

const CarItem = ({ make, model, year, active, vin, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`flex items-center justify-between p-4 rounded-2xl transition-all cursor-pointer border-2 ${active ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'}`}
  >
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-400'}`}>
        <Car size={20} />
      </div>
      <div>
        <p className="font-bold text-slate-900">{make} {model}</p>
        <p className="text-[10px] text-slate-400 font-medium uppercase">{vin || 'VIN не указан'} • {year} г.в.</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      {active && (
        <span className="bg-indigo-600 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider">Текущая</span>
      )}
      {!active && <ChevronRight size={18} className="text-slate-300" />}
    </div>
  </div>
);

const SettingsItem = ({ icon: Icon, label, value, color }: any) => (
  <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer group">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-white transition-colors">
        <Icon size={18} />
      </div>
      <span className="text-sm font-bold text-slate-700">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className={`text-sm font-black ${color || 'text-slate-400'}`}>{value}</span>}
      <ChevronRight size={18} className="text-slate-300" />
    </div>
  </div>
);
