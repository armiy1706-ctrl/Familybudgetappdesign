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
  ImageIcon,
  Loader2,
  Archive,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import { CameraCapture } from './CameraCapture';

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

export const AdvancedMaintenanceJournal = ({ 
  cars = [], 
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
  const [isPhotoViewOpen, setIsPhotoViewOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  useEffect(() => {
    // Force load scripts if missing
    const loadScript = (id: string, src: string) => {
      if (!document.getElementById(id)) {
        const s = document.createElement('script');
        s.id = id;
        s.src = src;
        s.async = true;
        document.body.appendChild(s);
      }
    };
    loadScript('jszip-lib', 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
    loadScript('html2pdf-lib', 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('autoai_maintenance_records');
    if (saved) {
      try { setRecords(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('autoai_maintenance_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    if (cars.length > 0 && !activeCarId) setActiveCarId(cars[0].id);
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
    if (!activeCarId) return { total: 0, byType: {} };
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
    toast.success('Запись сохранена');
  };

  const deleteRecord = (id: string) => {
    if (!window.confirm("Удалить запись?")) return;
    setRecords(prev => prev.filter(r => r.id !== id));
    toast.success('Запись удалена');
  };

  const handleGeneratePdf = async (toTelegram = false) => {
    if (!activeCar) return;
    const h2p = (window as any).html2pdf;
    if (!h2p) {
      toast.error("Библиотека PDF еще загружается. Попробуйте снова через 2 секунды.");
      return;
    }

    setIsGeneratingPdf(true);
    
    try {
      const rows = carRecords.map(r => `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px; font-size: 10pt;">${new Date(r.date).toLocaleDateString('ru-RU')}</td>
          <td style="padding: 8px; font-size: 9pt; color: #666;">${CATEGORIES[r.type].label}</td>
          <td style="padding: 8px; font-size: 10pt; word-break: break-all;">${r.description}</td>
          <td style="padding: 8px; font-size: 10pt; font-weight: bold; text-align: right;">${r.amount.toLocaleString()} ₽</td>
        </tr>
      `).join('');

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; background: white;">
          <table style="width: 100%; border-bottom: 3px solid #4f46e5; margin-bottom: 20px;">
            <tr>
              <td>
                <h1 style="margin: 0; font-size: 20pt; color: #000;">AutoAI: ОТЧЕТ</h1>
                <p style="margin: 0; font-size: 9pt; color: #666;">ЖУРНАЛ ОБСЛУЖИВАНИЯ</p>
              </td>
            </tr>
          </table>
          
          <table style="width: 100%; margin-bottom: 25px; border-spacing: 10px; border-collapse: separate;">
            <tr>
              <td style="width: 50%; background: #f5f5f5; padding: 15px; border-radius: 10px;">
                <p style="margin: 0 0 5px; font-size: 8pt; font-weight: bold; color: #4f46e5;">АВТОМОБИЛЬ</p>
                <p style="margin: 0; font-size: 14pt; font-weight: bold;">${activeCar.make} ${activeCar.model}</p>
                <p style="margin: 5px 0 0; font-size: 11pt;">Номер: <b>${activeCar.licensePlate}</b></p>
                <p style="margin: 2px 0 0; font-size: 9pt; color: #666;">VIN: ${activeCar.vin || '—'}</p>
              </td>
              <td style="width: 50%; background: #f5f5f5; padding: 15px; border-radius: 10px; text-align: right; vertical-align: top;">
                <p style="margin: 0 0 5px; font-size: 8pt; font-weight: bold; color: #666;">ИТОГО ЗАТРАТ</p>
                <p style="margin: 0; font-size: 18pt; font-weight: bold; color: #000;">${stats.total.toLocaleString()} ₽</p>
                <p style="margin: 5px 0 0; font-size: 8pt; color: #999;">${new Date().toLocaleDateString('ru-RU')}</p>
              </td>
            </tr>
          </table>

          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #eee;">
                <th style="padding: 10px; text-align: left; font-size: 9pt;">ДАТА</th>
                <th style="padding: 10px; text-align: left; font-size: 9pt;">ТИП</th>
                <th style="padding: 10px; text-align: left; font-size: 9pt;">ОПИСАНИЕ</th>
                <th style="padding: 10px; text-align: right; font-size: 9pt;">СУММА</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          
          <p style="margin-top: 30px; font-size: 8pt; color: #aaa; text-align: center; font-style: italic;">
            Сгенерировано в AutoAI. Фотографии доступны в ZIP-архиве приложения.
          </p>
        </div>
      `;

      const opt = {
        margin: 10,
        filename: `AutoAI_${activeCar.licensePlate}.pdf`,
        image: { type: 'jpeg', quality: 0.8 },
        html2canvas: { scale: 1, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      if (toTelegram) {
        toast.info("Отправка в Telegram...");
        const pdfBase64 = await h2p().set(opt).from(htmlContent).outputPdf('datauristring');
        if (pdfBase64) {
          onSendToTelegram?.(pdfBase64, `${activeCar.make}_${activeCar.model}`);
        } else {
          throw new Error("Empty PDF result");
        }
      } else {
        await h2p().set(opt).from(htmlContent).save();
        toast.success("PDF сохранен");
      }
    } catch (err) {
      console.error("PDF GEN ERROR:", err);
      toast.error("Ошибка генерации. Попробуйте еще раз.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const exportArchive = async () => {
    if (!activeCar) return;
    const JSZipLib = (window as any).JSZip;
    if (!JSZipLib) return toast.error("Библиотека ZIP загружается...");
    try {
      const zip = new JSZipLib();
      const csv = "\uFEFFДата,Тип,Описание,Сумма\n" + carRecords.map(r => `${r.date},${CATEGORIES[r.type].label},${r.description},${r.amount}`).join("\n");
      zip.file("report.csv", csv);
      const imgs = zip.folder("images");
      carRecords.forEach(r => { if (r.receiptImage) imgs.file(`${r.id}.png`, r.receiptImage.split(',')[1], { base64: true }); });
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AutoAI_${activeCar.licensePlate}.zip`;
      a.click();
    } catch (e) { toast.error("Ошибка ZIP"); }
  };

  return (
    <div className="space-y-8 pb-24 relative">
      <CameraCapture isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={(img) => { setTempReceiptImage(img); setIsCameraOpen(false); }} />
      
      <AnimatePresence>
        {isGeneratingPdf && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white p-8 rounded-[32px] shadow-2xl flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
              <p className="text-xs font-black uppercase tracking-widest text-slate-900">Отправка в бот...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {cars.map(car => (
          <button key={car.id} onClick={() => setActiveCarId(car.id)} className={`flex items-center gap-3 px-6 py-4 rounded-[24px] font-bold transition-all shrink-0 border-2 ${activeCarId === car.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105' : 'bg-white border-slate-100 text-slate-400'}`}>
            <CarIcon size={16} />
            <div className="text-left">
              <p className="text-[10px] uppercase font-black tracking-widest opacity-60 mb-0.5">{car.make}</p>
              <p className="text-sm tracking-tight leading-none truncate max-w-[120px]">{car.model}</p>
            </div>
          </button>
        ))}
      </div>

      {activeCar && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                {activeCar.make} {activeCar.model}
                <span className="text-xs bg-slate-900 text-white px-3 py-1 rounded-lg font-black uppercase tracking-widest">{activeCar.licensePlate}</span>
              </h2>
              <p className="text-slate-400 font-medium text-sm mt-1">VIN: {activeCar.vin || '—'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button onClick={() => handleGeneratePdf(false)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest"><FileText size={14} /> PDF</button>
              <button onClick={() => handleGeneratePdf(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100"><Send size={14} /> В Бот</button>
              <button onClick={exportArchive} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest"><Archive size={14} /> ZIP</button>
              <button onClick={() => setShowAddModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest"><Plus size={16} /> Добавить</button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="col-span-2 lg:col-span-1 bg-indigo-600 p-5 rounded-[28px] text-white shadow-xl shadow-indigo-50">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1">Итого</p>
              <h4 className="text-xl font-black">{stats.total.toLocaleString()} ₽</h4>
            </div>
            <StatCard label="Ремонт" value={`${(stats.byType.repair || 0).toLocaleString()} ₽`} icon={Wrench} colorClass="text-rose-600" bgColorClass="bg-rose-50" />
            <StatCard label="Запчасти" value={`${(stats.byType.parts || 0).toLocaleString()} ₽`} icon={Cog} colorClass="text-amber-600" bgColorClass="bg-amber-50" />
            <StatCard label="Топливо" value={`${(stats.byType.fuel || 0).toLocaleString()} ₽`} icon={Fuel} colorClass="text-indigo-600" bgColorClass="bg-indigo-50" />
            <StatCard label="ТО" value={`${(stats.byType.service || 0).toLocaleString()} ₽`} icon={Shield} colorClass="text-emerald-600" bgColorClass="bg-emerald-50" />
          </div>

          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between gap-4">
              <h3 className="font-black text-slate-900 uppercase tracking-tighter text-md flex items-center gap-2"><History size={18} /> История</h3>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                <input type="text" placeholder="Поиск..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-48 bg-slate-50 border-none rounded-lg py-2 pl-9 pr-3 text-[11px] font-bold outline-none" />
              </div>
            </div>
            <div className="overflow-x-auto">
              {carRecords.length > 0 ? (
                <table className="w-full text-left">
                  <tbody className="divide-y divide-slate-50">
                    {carRecords.map(record => {
                      const cat = CATEGORIES[record.type];
                      return (
                        <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl ${cat.bgColor} ${cat.color} flex items-center justify-center shrink-0`}><cat.icon size={16} /></div>
                            <div>
                              <p className="text-[13px] font-black text-slate-900 uppercase leading-tight">{record.description}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(record.date).toLocaleDateString('ru-RU')} • {cat.label}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right shrink-0">
                            <span className="text-[13px] font-black text-slate-900">{record.amount.toLocaleString()} ₽</span>
                          </td>
                          <td className="px-6 py-4 text-center w-10">
                            <button onClick={() => deleteRecord(record.id)} className="p-2 text-slate-200 hover:text-rose-500"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : <div className="py-12 text-center text-slate-300 text-[10px] font-black uppercase tracking-widest">Пусто</div>}
            </div>
          </div>
        </div>
      )}

      {/* Simplified Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Новая запись</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400"><X size={24} /></button>
              </div>
              <form onSubmit={handleAddRecord} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-1">Тип</label>
                    <select name="type" required className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-xs font-bold outline-none">
                      {Object.entries(CATEGORIES).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-1">Дата</label>
                    <input name="date" type="date" required value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-xs font-bold outline-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-1">Описание</label>
                  <input name="description" type="text" required className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-xs font-bold outline-none" placeholder="Замена масла" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-1">Сумма (₽)</label>
                  <input name="amount" type="number" required className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-xs font-bold outline-none" placeholder="0" />
                </div>
                <div className="pt-2">
                   <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-50">Сохранить</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
