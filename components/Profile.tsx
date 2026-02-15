import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Car, 
  Trash2, 
  Calendar, 
  Hash, 
  ChevronRight, 
  LogOut, 
  Settings,
  ShieldCheck,
  Fuel,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

export const Profile = ({ session, userProfile, cars, onAddCar, onDeleteCar, activeCarIndex, onSwitchCar }: any) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCar, setNewCar] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear().toString(),
    vin: '',
    mileage: '',
    engine: ''
  });

  const handleAddCar = () => {
    if (!newCar.make || !newCar.model || !newCar.mileage) {
      toast.error('Пожалуйста, заполните основные поля');
      return;
    }
    onAddCar(newCar);
    setShowAddModal(false);
    setNewCar({ make: '', model: '', year: new Date().getFullYear().toString(), vin: '', mileage: '', engine: '' });
    toast.success('Автомобиль успешно добавлен в ваш гараж!');
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-12">
      {/* Пользователь */}
      <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex items-center gap-6">
        <div className="w-20 h-20 bg-indigo-600 rounded-[30px] flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-indigo-100">
          {session?.user?.user_metadata?.avatar_url ? (
            <img src={session.user.user_metadata.avatar_url} className="w-full h-full rounded-[30px] object-cover" />
          ) : (
            session?.user?.email?.[0].toUpperCase()
          )}
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 leading-tight">
            {session?.user?.user_metadata?.full_name || 'Автолюбитель'}
          </h2>
          <p className="text-slate-400 font-bold text-xs mt-1 uppercase tracking-widest">{session?.user?.email}</p>
          <div className="flex items-center gap-2 mt-3">
             <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-100">Premium</span>
             <span className="text-slate-300 text-[10px] font-bold">AutoAI v4.2.8</span>
          </div>
        </div>
      </div>

      {/* Гараж */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Мой гараж ({cars.length})</h3>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 p-2 rounded-xl transition-all"
          >
            <Plus size={16} />
            Добавить авто
          </button>
        </div>

        <div className="space-y-3">
          {cars.map((car: any, index: number) => (
            <motion.div 
              key={car.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`group p-5 rounded-[32px] border-2 transition-all flex items-center justify-between ${activeCarIndex === index ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-100' : 'bg-white border-slate-50 hover:border-indigo-100'}`}
            >
              <div 
                className="flex items-center gap-5 flex-1 cursor-pointer"
                onClick={() => onSwitchCar(index)}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${activeCarIndex === index ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-400'}`}>
                  <Car size={24} />
                </div>
                <div>
                  <h4 className={`font-black text-lg ${activeCarIndex === index ? 'text-white' : 'text-slate-900'}`}>{car.make} {car.model}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-[10px] font-bold ${activeCarIndex === index ? 'text-white/60' : 'text-slate-400'}`}>{car.year} г.в.</span>
                    <span className={`text-[10px] font-bold ${activeCarIndex === index ? 'text-white/40' : 'text-slate-300'}`}>|</span>
                    <span className={`text-[10px] font-bold ${activeCarIndex === index ? 'text-white/60' : 'text-slate-400'}`}>{car.mileage} км</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeCarIndex === index && (
                  <div className="px-3 py-1 bg-white/20 text-white rounded-full text-[9px] font-black uppercase tracking-wider">Активен</div>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteCar(car.id); }}
                  className={`p-3 rounded-xl transition-all active:scale-90 ${activeCarIndex === index ? 'bg-white/10 text-white hover:bg-rose-500' : 'bg-slate-50 text-slate-300 hover:text-rose-500 hover:bg-rose-50'}`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
          
          {cars.length === 0 && (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] p-12 text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-200 mx-auto mb-4">
                <Car size={32} />
              </div>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Гараж пуст</p>
              <button onClick={() => setShowAddModal(true)} className="mt-4 text-indigo-600 text-xs font-black uppercase tracking-widest hover:underline">Добавьте первую машину</button>
            </div>
          )}
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 gap-4">
         <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Общий пробег</p>
            <p className="text-2xl font-black text-slate-900">{cars.reduce((acc: number, c: any) => acc + (Number(c.mileage) || 0), 0).toLocaleString()}</p>
         </div>
         <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Обслуживаний</p>
            <p className="text-2xl font-black text-slate-900">{cars.reduce((acc: number, c: any) => acc + (c.serviceHistory?.length || 0), 0)}</p>
         </div>
      </div>

      {/* Modal Add Car */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl relative z-10"
            >
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-xl font-black text-slate-900">Новый автомобиль</h3>
                 <button onClick={() => setShowAddModal(false)} className="text-slate-300 hover:text-slate-600"><Plus size={24} className="rotate-45" /></button>
              </div>
              
              <div className="space-y-4">
                <InputGroup label="Марка" value={newCar.make} onChange={(v) => setNewCar({...newCar, make: v})} placeholder="Напр: BMW" />
                <InputGroup label="Модель" value={newCar.model} onChange={(v) => setNewCar({...newCar, model: v})} placeholder="Напр: X5" />
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="Год" value={newCar.year} onChange={(v) => setNewCar({...newCar, year: v})} placeholder="2023" />
                  <InputGroup label="Пробег" value={newCar.mileage} onChange={(v) => setNewCar({...newCar, mileage: v})} placeholder="0" type="number" />
                </div>
                <InputGroup label="VIN" value={newCar.vin} onChange={(v) => setNewCar({...newCar, vin: v})} placeholder="WBA..." />
                
                <button 
                  onClick={handleAddCar}
                  className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all mt-4"
                >
                  ДОБАВИТЬ В ГАРАЖ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const InputGroup = ({ label, value, onChange, placeholder, type = "text" }: any) => (
  <div>
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{label}</label>
    <input 
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 text-sm font-bold placeholder:text-slate-300 outline-none focus:ring-2 ring-indigo-500/10 transition-all"
    />
  </div>
);
