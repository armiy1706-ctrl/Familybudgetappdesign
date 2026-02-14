import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bluetooth, BluetoothConnected, BluetoothSearching, AlertCircle, Play, Square, Activity, Thermometer, Gauge, Zap, ShieldCheck } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts';

export const OBDScanner = () => {
  const [status, setStatus] = useState<'idle' | 'searching' | 'connected' | 'error'>('idle');
  const [data, setData] = useState<any[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [currentValues, setCurrentValues] = useState({
    rpm: 0,
    temp: 0,
    load: 0,
    speed: 0
  });

  // Mock live data stream
  useEffect(() => {
    let interval: any;
    if (isLive && status === 'connected') {
      interval = setInterval(() => {
        const newData = {
          time: new Date().toLocaleTimeString(),
          rpm: Math.floor(700 + Math.random() * 2000),
          temp: Math.floor(88 + Math.random() * 5),
          load: Math.floor(20 + Math.random() * 40),
          speed: Math.floor(0 + Math.random() * 60)
        };
        setData(prev => [...prev.slice(-20), newData]);
        setCurrentValues(newData);
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isLive, status]);

  const connectBT = async () => {
    setStatus('searching');
    // Simulate connection delay
    setTimeout(() => {
      setStatus('connected');
      setIsLive(true);
    }, 2000);

    /* Real implementation would look like this:
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['00001101-0000-1000-8000-00805f9b34fb'] }] // Standard SPP
      });
      // Handle connection...
    } catch (err) {
      setStatus('error');
    }
    */
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-5">
          <div className={`p-4 rounded-2xl ${status === 'connected' ? 'bg-emerald-50 text-emerald-600' : status === 'searching' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
            {status === 'connected' ? <BluetoothConnected size={32} /> : status === 'searching' ? <BluetoothSearching className="animate-pulse" size={32} /> : <Bluetooth size={32} />}
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">ELM327 OBD-II</h3>
            <p className="text-sm text-slate-500 font-medium">
              {status === 'idle' && 'Устройство не подключено'}
              {status === 'searching' && 'Поиск доступных Bluetooth адаптеров...'}
              {status === 'connected' && 'Соединение установлено (CAN ISO 15765-4)'}
              {status === 'error' && 'Ошибка подключения'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          {status === 'idle' ? (
            <button onClick={connectBT} className="flex-1 md:flex-none px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
              <Zap size={20} />
              Подключить
            </button>
          ) : (
            <>
              <button onClick={() => setIsLive(!isLive)} className={`flex-1 md:flex-none px-6 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${isLive ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {isLive ? <Square size={20} /> : <Play size={20} />}
                {isLive ? 'Стоп' : 'Старт'}
              </button>
              <button onClick={() => setStatus('idle')} className="px-6 py-4 bg-slate-50 text-slate-400 rounded-2xl font-bold hover:bg-slate-100 transition-all">
                Отключить
              </button>
            </>
          )}
        </div>
      </div>

      {status === 'connected' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Обороты" value={`${currentValues.rpm}`} unit="RPM" icon={Gauge} color="text-indigo-600" bgColor="bg-indigo-50" />
          <StatCard label="Температура" value={`${currentValues.temp}`} unit="°C" icon={Thermometer} color="text-orange-600" bgColor="bg-orange-50" />
          <StatCard label="Нагрузка" value={`${currentValues.load}`} unit="%" icon={Activity} color="text-emerald-600" bgColor="bg-emerald-50" />
          <StatCard label="Скорость" value={`${currentValues.speed}`} unit="км/ч" icon={Zap} color="text-blue-600" bgColor="bg-blue-50" />
        </div>
      )}

      {status === 'connected' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">График параметров в реальном времени</h4>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-500 uppercase"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> RPM</div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Load</div>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <XAxis dataKey="time" hide />
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="rpm" stroke="#4f46e5" strokeWidth={3} dot={false} animationDuration={300} />
                <Line type="monotone" dataKey="load" stroke="#10b981" strokeWidth={3} dot={false} animationDuration={300} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-amber-400" />
            <h4 className="text-xl font-bold">Коды ошибок DTC</h4>
          </div>
          <p className="text-slate-400 text-sm max-w-md">Сканирование блоков управления на наличие ошибок в реальном времени.</p>
          <div className="pt-4 flex flex-wrap gap-3">
            {status === 'connected' ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-2xl flex items-center gap-2 font-bold text-sm">
                <ShieldCheck size={18} />
                Ошибки не обнаружены
              </div>
            ) : (
              <div className="text-slate-500 italic text-sm">Подключитесь для сканирования ошибок...</div>
            )}
          </div>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Gauge size={180} />
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, unit, icon: Icon, color, bgColor }: any) => (
  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
    <div className={`w-10 h-10 ${bgColor} ${color} rounded-xl flex items-center justify-center`}>
      <Icon size={20} />
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-black ${color}`}>{value}</span>
        <span className="text-xs font-bold text-slate-400 uppercase">{unit}</span>
      </div>
    </div>
  </div>
);
