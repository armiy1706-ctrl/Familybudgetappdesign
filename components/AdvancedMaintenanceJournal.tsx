import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Car as CarIcon, 
  Wrench, 
  History, 
  Plus, 
  Download,
  Trash2,
  DollarSign,
  Fuel,
  Cog,
  Shield,
  X,
  FileText,
  Search,
  Camera,
  Image as ImageIcon,
  Loader2,
  Archive,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import { CameraCapture } from './CameraCapture';

// --- Interfaces ---

type RecordType = 'repair' | 'parts' | 'fuel' | 'service';

interface MaintenanceRecord {
  id: string;
  carId: string;
  type: RecordType;
  date: string;
  description: string;
  amount: number;
  receiptImage?: string;
}

const CATEGORIES: Record<RecordType, { label: string; icon: any; color: string; bgColor: string }> = {
  repair: { label: 'Ремонт', icon: Wrench, color: 'text-rose-600', bgColor: 'bg-rose-50' },
  parts: { label: 'Запчасти', icon: Cog, color: 'text-amber-600', bgColor: 'bg-amber-50' },
  fuel: { label: 'Топливо', icon: Fuel, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  service: { label: 'ТО', icon: Shield, color: 'text-emerald-600', bgColor: 'bg-emerald-50' }
};

const StatCard = ({ label, value, icon: Icon, colorClass, bgColorClass }: any) => (
  <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
    <div className={`w-12 h-12 ${bgColorClass} ${colorClass} rounded-2xl flex items-center justify-center mb-4`}>
      <Icon size={20} />
    </div>
    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{label}</p>
    <h4 className="text-2xl font-black text-slate-900 tracking-tighter">{value}</h4>
  </div>
);

export const AdvancedMaintenanceJournal = ({ 
  cars = [], 
  onAddCar, 
  onDeleteCar,
  onSendToTelegram
}: { 
  cars: any[], 
  onAddCar?: (car: any) => void, 
  onDeleteCar?: (id: string) => void,
  onSendToTelegram?: (base64: string, carName: string) => void
}) => {
  const [activeCarId, setActiveCarId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [tempReceiptImage, setTempReceiptImage] = useState<string | null>(null);

  // Load external scripts
  useEffect(() => {
    const loadScript = (id: string, src: string) => {
      if (!document.getElementById(id)) {
        const s = document.createElement('script');
        s.id = id;
        s.src = src;
        s.async = true;
        document.body.appendChild(s);
      }
    };
    loadScript('jszip-script', 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
    loadScript('html2pdf-script', 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
  }, []);

  // Sync with LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('autoai_maintenance_records');
    if (saved) {
      try {
        setRecords(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing maintenance records:", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('autoai_maintenance_records', JSON.stringify(records));
  }, [records]);

  // Set initial car
  useEffect(() => {
    if (cars.length > 0 && !activeCarId) {
      setActiveCarId(cars[0].id);
    }
  }, [cars, activeCarId]);

  const activeCar = useMemo(() => cars.find(c => c.id === activeCarId), [cars, activeCarId]);
  
  const carRecords = useMemo(() => {
    if (!activeCarId) return [];
    return records.filter(r => r.carId === activeCarId && 
      (r.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
       CATEGORIES[r.type].label.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, activeCarId, searchTerm]);

  const stats = useMemo(() => {
    if (!activeCarId) return { total: 0, byType: {} as Record<string, number> };
    const carRecs = records.filter(r => r.carId === activeCarId);
    const total = carRecs.reduce((sum, r) => sum + r.amount, 0);
    const byType = carRecs.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + r.amount;
      return acc;
    }, {} as Record<string, number>);
    return { total, byType };
  }, [records, activeCarId]);

  const handleAddRecord = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeCarId) return;

    const formData = new FormData(e.currentTarget);
    const newRecord: MaintenanceRecord = {
      id: Date.now().toString(),
      carId: activeCarId,
      type: formData.get('type') as RecordType,
      date: formData.get('date') as string,
      description: formData.get('description') as string,
      amount: Number(formData.get('amount')),
      receiptImage: tempReceiptImage || undefined
    };

    setRecords(prev => [...prev, newRecord]);
    setShowAddModal(false);
    setTempReceiptImage(null);
    toast.success('Запись успешно сохранена');
  };

  const deleteRecord = (id: string) => {
    if (!window.confirm("Вы уверены, что хотите удалить эту запись?")) return;
    setRecords(prev => prev.filter(r => r.id !== id));
    toast.success('Запись удалена');
  };

  const handleGeneratePdf = async (toTelegram = false) => {
    if (!activeCar) return;
    const h2p = (window as any).html2pdf;
    if (!h2p) {
      toast.error("Библиотека PDF еще загружается. Повторите попытку.");
      return;
    }

    setIsGeneratingPdf(true);
    
    try {
      // Table rows generation
      const rows = carRecords.map(r => `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 10px; font-size: 11px;">${new Date(r.date).toLocaleDateString('ru-RU')}</td>
          <td style="padding: 10px; font-size: 10px; text-transform: uppercase; color: #666;">${CATEGORIES[r.type].label}</td>
          <td style="padding: 10px; font-size: 11px; word-break: break-all;">${r.description}</td>
          <td style="padding: 10px; font-size: 11px; font-weight: bold; text-align: right;">${r.amount.toLocaleString()} ₽</td>
        </tr>
      `).join('');

      // Pure HTML template without Tailwind
      const htmlContent = `
        <div style="font-family: sans-serif; padding: 30px; background: #ffffff; color: #1a1a1a;">
          <div style="border-bottom: 4px solid #4f46e5; padding-bottom: 15px; margin-bottom: 25px;">
            <h1 style="margin: 0; font-size: 24px; color: #000;">AutoAI: Отчет</h1>
            <p style="margin: 5px 0 0; font-size: 11px; color: #666; font-weight: bold;">ЖУРНАЛ ТЕХНИЧЕСКОГО ОБСЛУЖИВАНИЯ</p>
          </div>
          
          <table style="width: 100%; margin-bottom: 30px; border-collapse: separate; border-spacing: 0 10px;">
            <tr>
              <td style="width: 50%; background: #f8f8f8; padding: 20px; border-radius: 12px;">
                <p style="margin: 0 0 5px; font-size: 9px; font-weight: bold; color: #4f46e5; text-transform: uppercase;">Данные автомобиля</p>
                <p style="margin: 0; font-size: 18px; font-weight: bold;">${activeCar.make} ${activeCar.model}</p>
                <p style="margin: 5px 0 0; font-size: 12px;">Гос. номер: <b>${activeCar.licensePlate}</b></p>
                <p style="margin: 2px 0 0; font-size: 10px; color: #666;">VIN: ${activeCar.vin || '—'}</p>
              </td>
              <td style="width: 50%; background: #f8f8f8; padding: 20px; border-radius: 12px; text-align: right; vertical-align: top;">
                <p style="margin: 0 0 5px; font-size: 9px; font-weight: bold; color: #666; text-transform: uppercase;">Общие затраты</p>
                <p style="margin: 0; font-size: 22px; font-weight: bold; color: #000;">${stats.total.toLocaleString()} ₽</p>
                <p style="margin: 5px 0 0; font-size: 10px; color: #999;">Дата отчета: ${new Date().toLocaleDateString('ru-RU')}</p>
              </td>
            </tr>
          </table>

          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f0f0f0;">
                <th style="padding: 12px; text-align: left; font-size: 10px; border-bottom: 2px solid #ddd;">ДАТА</th>
                <th style="padding: 12px; text-align: left; font-size: 10px; border-bottom: 2px solid #ddd;">ТИП</th>
                <th style="padding: 12px; text-align: left; font-size: 10px; border-bottom: 2px solid #ddd;">ОПИСАНИЕ</th>
                <th style="padding: 12px; text-align: right; font-size: 10px; border-bottom: 2px solid #ddd;">СУММА</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          
          <div style="margin-top: 50px; border-top: 1px dashed #ccc; padding-top: 20px; text-align: center;">
            <p style="margin: 0; font-size: 9px; color: #999; font-style: italic;">Данный отчет сформирован в системе AutoAI. Оригиналы чеков доступны в ZIP архиве приложения.</p>
          </div>
        </div>
      `;

      const opt = {
        margin: 10,
        filename: `AutoAI_Report_${activeCar.licensePlate}.pdf`,
        image: { type: 'jpeg', quality: 0.8 },
        html2canvas: { scale: 1, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      if (toTelegram) {
        toast.info("Подготовка отчета для Telegram...");
        const result = await h2p().set(opt).from(htmlContent).outputPdf('datauristring');
        if (result) {
          onSendToTelegram?.(result, `${activeCar.make}_${activeCar.model}`);
        } else {
          throw new Error("PDF data generation failed");
        }
      } else {
        await h2p().set(opt).from(htmlContent).save();
        toast.success("Отчет PDF сохранен");
      }
    } catch (err: any) {
      console.error("PDF generation error:", err);
      toast.error("Не удалось создать PDF. Попробуйте еще раз.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const exportArchive = async () => {
    if (!activeCar) return;
    const JSZipLib = (window as any).JSZip;
    if (!JSZipLib) return toast.error("Библиотека ZIP загружается. Повторите попытку.");
    
    try {
      const zip = new JSZipLib();
      const csv = "\uFEFFДата,Тип,Описание,Сумма (₽)\n" + 
        carRecords.map(r => `${r.date},${CATEGORIES[r.type].label},${r.description},${r.amount}`).join("\n");
      
      zip.file("maintenance_journal.csv", csv);
      const imgFolder = zip.folder("receipt_images");
      
      carRecords.forEach(r => {
        if (r.receiptImage) {
          const base64Data = r.receiptImage.split(',')[1];
          if (base64Data) imgFolder.file(`receipt_${r.id}.png`, base64Data, { base64: true });
        }
      });
      
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `AutoAI_${activeCar.licensePlate}_Full_Data.zip`;
      link.click();
      toast.success("Архив ZIP успешно создан");
    } catch (e) {
      toast.error("Ошибка при создании архива");
    }
  };

  if (cars.length === 0) return (
    <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[40px] border border-dashed border-slate-200 text-center px-10">
      <CarIcon size={48} className="text-slate-300 mb-6" />
      <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Ваш гараж пуст</h3>
      <p className="text-sm text-slate-400 font-medium max-w-xs">Добавьте первый автомобиль в настройках профиля.</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-24 relative min-h-[400px]">
      <CameraCapture isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={(img) => { setTempReceiptImage(img); setIsCameraOpen(false); }} />
      
      {/* Universal Loading Overlay */}
      <AnimatePresence>
        {isGeneratingPdf && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white p-10 rounded-[40px] shadow-2xl flex flex-col items-center gap-6">
              <div className="w-16 h-16 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-sm font-black uppercase tracking-widest text-slate-900 mb-1">Генерация отчета</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Это займет несколько секунд...</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
        {cars.map(car => (
          <button key={car.id} onClick={() => setActiveCarId(car.id)} className={`flex items-center gap-3 px-6 py-4 rounded-[24px] font-bold transition-all shrink-0 border-2 ${activeCarId === car.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>
            <CarIcon size={16} />
            <div className="text-left">
              <p className="text-[10px] uppercase font-black tracking-widest leading-none opacity-60 mb-1">{car.make}</p>
              <p className="text-sm tracking-tight leading-none truncate max-w-[120px]">{car.model}</p>
            </div>
          </button>
        ))}
      </div>

      {activeCar && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                {activeCar.make} {activeCar.model}
                <span className="text-[10px] bg-slate-900 text-white px-3 py-1.5 rounded-xl font-black uppercase tracking-widest">{activeCar.licensePlate}</span>
              </h2>
              <p className="text-slate-400 font-medium text-sm mt-1 flex items-center gap-2">
                <Shield size={14} /> VIN: {activeCar.vin || '—'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button onClick={() => handleGeneratePdf(false)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-slate-300 transition-all"><FileText size={16} /> PDF</button>
              <button onClick={() => handleGeneratePdf(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all"><Send size={16} /> В Бот</button>
              <button onClick={exportArchive} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-slate-300 transition-all"><Archive size={16} /> ZIP</button>
              <button onClick={() => setShowAddModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200"><Plus size={20} /> Запись</button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="col-span-2 lg:col-span-1 bg-indigo-600 p-6 rounded-[32px] text-white shadow-xl shadow-indigo-50 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform"><DollarSign size={40} /></div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Всего затрат</p>
              <h4 className="text-2xl font-black tracking-tighter">{stats.total.toLocaleString()} ₽</h4>
            </div>
            <StatCard label="Ремонт" value={`${(stats.byType.repair || 0).toLocaleString()} ₽`} icon={Wrench} colorClass="text-rose-600" bgColorClass="bg-rose-50" />
            <StatCard label="Запчасти" value={`${(stats.byType.parts || 0).toLocaleString()} ₽`} icon={Cog} colorClass="text-amber-600" bgColorClass="bg-amber-50" />
            <StatCard label="Топливо" value={`${(stats.byType.fuel || 0).toLocaleString()} ₽`} icon={Fuel} colorClass="text-indigo-600" bgColorClass="bg-indigo-50" />
            <StatCard label="Сервис" value={`${(stats.byType.service || 0).toLocaleString()} ₽`} icon={Shield} colorClass="text-emerald-600" bgColorClass="bg-emerald-50" />
          </div>

          <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row justify-between gap-4 items-center">
              <h3 className="font-black text-slate-900 uppercase tracking-tighter text-lg flex items-center gap-3"><History size={20} /> История обслуживания</h3>
              <div className="relative group">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                <input type="text" placeholder="Поиск в журнале..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-64 bg-slate-50 border-none rounded-2xl py-3.5 pl-11 pr-4 text-xs font-bold outline-none focus:ring-2 ring-indigo-500/20 transition-all" />
              </div>
            </div>
            <div className="overflow-x-auto">
              {carRecords.length > 0 ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/30">
                      <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Вид работ</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Сумма</th>
                      <th className="px-8 py-4 text-center">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {carRecords.map(record => {
                      const cat = CATEGORIES[record.type];
                      return (
                        <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-5 flex items-center gap-4">
                            <div className={`w-11 h-11 rounded-2xl ${cat.bgColor} ${cat.color} flex items-center justify-center shrink-0 shadow-sm`}><cat.icon size={20} /></div>
                            <div>
                              <p className="text-sm font-black text-slate-900 uppercase tracking-tight leading-tight">{record.description}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{new Date(record.date).toLocaleDateString('ru-RU')} • {cat.label}</p>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <span className="text-[15px] font-black text-slate-900">{record.amount.toLocaleString()} ₽</span>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <div className="flex items-center gap-2 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              {record.receiptImage && <div className="p-2 text-indigo-500 bg-indigo-50 rounded-xl"><ImageIcon size={18} /></div>}
                              <button onClick={() => deleteRecord(record.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : <div className="py-24 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><Search size={24} className="text-slate-200" /></div>
                <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Записей не найдено</p>
              </div>}
            </div>
          </div>
        </div>
      )}

      {/* Modern Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[40px] w-full max-w-md p-10 shadow-2xl relative z-10">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Новая запись</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">В журнал обслуживания</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all"><X size={24} /></button>
              </div>
              <form onSubmit={handleAddRecord} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Категория</label>
                    <select name="type" required className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500/20 outline-none transition-all">
                      {Object.entries(CATEGORIES).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Дата</label>
                    <input name="date" type="date" required value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500/20 outline-none transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Описание</label>
                  <input name="description" type="text" required className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500/20 outline-none transition-all" placeholder="Напр: Замена фильтров" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Сумма (₽)</label>
                  <input name="amount" type="number" required className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500/20 outline-none transition-all" placeholder="0" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Прикрепить фото (для ZIP)</label>
                  {tempReceiptImage ? (
                    <div className="relative rounded-2xl overflow-hidden aspect-video border border-slate-100 group">
                      <img src={tempReceiptImage} alt="Preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setTempReceiptImage(null)} className="absolute top-2 right-2 bg-rose-500 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setIsCameraOpen(true)} className="w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all bg-slate-50/50">
                      <Camera size={28} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Открыть камеру</span>
                    </button>
                  )}
                </div>

                <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 active:scale-[0.98] transition-all">Добавить в журнал</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
