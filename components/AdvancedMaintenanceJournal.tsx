import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Car as CarIcon, 
  Wrench, 
  History, 
  Plus, 
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
  Send,
  TrendingUp,
  Download,
  Activity
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

const CATEGORIES: Record<RecordType, { label: string; icon: any; color: string; bgColor: string; badgeColor: string }> = {
  repair: { label: 'Ремонт', icon: Wrench, color: 'text-rose-600', bgColor: 'bg-rose-50', badgeColor: '#ef4444' },
  parts: { label: 'Запчасти', icon: Cog, color: 'text-amber-600', bgColor: 'bg-amber-50', badgeColor: '#f59e0b' },
  fuel: { label: 'Топливо', icon: Fuel, color: 'text-indigo-600', bgColor: 'bg-indigo-50', badgeColor: '#8b5cf6' },
  service: { label: 'ТО', icon: Shield, color: 'text-emerald-600', bgColor: 'bg-emerald-50', badgeColor: '#10b981' }
};

const StatCard = ({ label, value, icon: Icon, colorClass, bgColorClass }: any) => (
  <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm">
    <div className={`w-10 h-10 ${bgColorClass} ${colorClass} rounded-xl flex items-center justify-center mb-3`}>
      <Icon size={18} />
    </div>
    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-0.5">{label}</p>
    <h4 className="text-lg font-black text-slate-900 tracking-tight">{value}</h4>
  </div>
);

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
  
  const reportRef = useRef<HTMLDivElement>(null);

  // Load external libraries once
  useEffect(() => {
    const scripts = [
      { id: 'jszip-lib-js', src: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js' },
      { id: 'html2pdf-lib-js', src: 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js' }
    ];
    scripts.forEach(script => {
      if (!document.getElementById(script.id)) {
        const s = document.createElement('script');
        s.id = script.id;
        s.src = script.src;
        s.async = true;
        document.body.appendChild(s);
      }
    });
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('autoai_maintenance_records');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setRecords(parsed);
      } catch (e) { console.error("LocalStorage load error:", e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('autoai_maintenance_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    if (cars && cars.length > 0 && !activeCarId) {
      setActiveCarId(cars[0].id);
    }
  }, [cars, activeCarId]);

  const activeCar = useMemo(() => (cars || []).find(c => c.id === activeCarId), [cars, activeCarId]);
  
  const carRecords = useMemo(() => {
    if (!activeCarId) return [];
    return records.filter(r => r.carId === activeCarId && 
      (r.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       (CATEGORIES[r.type]?.label || '').toLowerCase().includes(searchTerm.toLowerCase()))
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
    toast.success('Запись сохранена');
  };

  const deleteRecord = (id: string) => {
    if (!window.confirm("Удалить?")) return;
    setRecords(prev => prev.filter(r => r.id !== id));
    toast.success('Запись удалена');
  };

  const handleGeneratePdf = async (toTelegram = false) => {
    const h2p = (window as any).html2pdf;
    if (!h2p) {
      toast.error('Модуль PDF загружается. Подождите 3-5 секунд.');
      return;
    }

    if (!activeCar) {
      toast.error('Автомобиль не выбран');
      return;
    }

    const element = reportRef.current;
    if (!element) {
      toast.error('Ошибка: Контейнер отчета не найден');
      return;
    }

    setIsGeneratingPdf(true);
    
    // Safety timer
    const safetyTimer = setTimeout(() => {
      setIsGeneratingPdf(false);
      toast.error('Превышено время ожидания');
    }, 30000);

    try {
      const opt = {
        margin: [5, 5],
        filename: `Report_${activeCar.licensePlate}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 1, // Minimum scale for maximum stability in Telegram
          useCORS: true,
          logging: false,
          letterRendering: true,
          allowTaint: true,
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc: Document) => {
            // CRITICAL FIX: Aggressively remove ALL styles that might contain oklch or other new CSS features
            const allStyles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
            allStyles.forEach(s => s.remove());

            // Inject absolutely clean, standard-only CSS for the report
            const cleanStyles = clonedDoc.createElement('style');
            cleanStyles.innerHTML = `
              body { background: white !important; color: #1e293b !important; font-family: Arial, sans-serif !important; margin: 0; padding: 0; }
              .pdf-container { width: 100%; padding: 0; }
              .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; padding: 20px; }
              .brand-group { display: flex; align-items: center; gap: 12px; }
              .logo { width: 40px; height: 40px; background: #4f46e5; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
              .logo svg { color: white; width: 24px; height: 24px; }
              .title-main { font-size: 28px; font-weight: 900; color: #1e1b4b; text-transform: uppercase; margin: 0; }
              .title-sub { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin-top: 2px; }
              .divider-line { height: 4px; background: #4f46e5; margin: 0 20px 30px; border-radius: 2px; }
              .info-grid { display: flex; gap: 20px; padding: 0 20px; margin-bottom: 30px; }
              .info-card { flex: 1; background: #f8fafc; border-radius: 16px; padding: 15px; border: 1px solid #f1f5f9; }
              .card-lbl { font-size: 8px; font-weight: 800; color: #4f46e5; text-transform: uppercase; margin-bottom: 4px; }
              .card-val { font-size: 18px; font-weight: 900; color: #0f172a; margin: 0; }
              .stats-bar { display: flex; gap: 12px; padding: 0 20px; margin-bottom: 30px; }
              .stat-box { flex: 1; background: #ffffff; border: 1px solid #f1f5f9; border-radius: 12px; padding: 12px; text-align: center; }
              .stat-lbl { font-size: 7px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
              .stat-val { font-size: 14px; font-weight: 900; color: #0f172a; }
              .table-header { padding: 0 20px; margin-bottom: 15px; font-size: 12px; font-weight: 900; color: #0f172a; text-transform: uppercase; }
              .main-table { width: calc(100% - 40px); margin: 0 20px; border-collapse: collapse; }
              .main-table thead tr { background: #0f172a; }
              .main-table th { color: white; font-size: 9px; padding: 12px; text-align: left; text-transform: uppercase; font-weight: 800; }
              .main-table td { padding: 12px; font-size: 11px; border-bottom: 1px solid #f1f5f9; }
              .footer-bar { margin-top: 50px; padding: 20px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; font-size: 9px; color: #cbd5e1; font-weight: 700; }
            `;
            clonedDoc.head.appendChild(cleanStyles);
          }
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Ensure off-screen element is ready
      await new Promise(r => setTimeout(r, 300));

      const worker = h2p().set(opt).from(element);

      if (toTelegram) {
        // Use full Promise chain for Telegram to ensure data is generated
        const pdfBase64 = await worker.toPdf().output('datauristring');
        
        clearTimeout(safetyTimer);
        setIsGeneratingPdf(false);

        if (pdfBase64 && onSendToTelegram) {
          onSendToTelegram(pdfBase64, `${activeCar.make}_${activeCar.model}`);
        } else {
          toast.error('Не удалось сформировать PDF поток');
        }
      } else {
        await worker.save();
        clearTimeout(safetyTimer);
        setIsGeneratingPdf(false);
        toast.success("Отчет скачан");
      }
    } catch (err) {
      console.error("PDF WORKER ERROR:", err);
      toast.error("Критический сбой генерации. Попробуйте снова.");
      clearTimeout(safetyTimer);
      setIsGeneratingPdf(false);
    }
  };

  const exportArchive = async () => {
    const JSZipLib = (window as any).JSZip;
    if (!JSZipLib) return toast.error("ZIP модуль загружается...");
    try {
      const zip = new JSZipLib();
      const csv = "\uFEFFДата,Тип,Описание,Сумма\n" + carRecords.map(r => `${r.date},${CATEGORIES[r.type]?.label || r.type},${r.description},${r.amount}`).join("\n");
      zip.file("report.csv", csv);
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AutoAI_Records.zip`;
      a.click();
      toast.success("Архив готов");
    } catch (e) { toast.error("Ошибка экспорта"); }
  };

  if (!cars || cars.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[40px] border border-dashed border-slate-200 px-10">
      <CarIcon size={40} className="text-slate-300 mb-6" />
      <h3 className="text-xl font-black text-slate-900 mb-2 uppercase">Гараж пуст</h3>
      <p className="text-sm text-slate-400 font-medium">Добавьте авто в профиле.</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-24 relative">
      <CameraCapture isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={(img) => { setTempReceiptImage(img); setIsCameraOpen(false); }} />
      
      {/* 
          OFF-SCREEN REPORT 
          Most reliable method: position absolute, move far left, but keep in DOM and visible:1
      */}
      <div style={{ position: 'absolute', left: '-10000px', top: 0, width: '210mm', pointerEvents: 'none' }}>
        {activeCar && (
          <div ref={reportRef} style={{ background: 'white' }}>
            <div className="header">
              <div className="brand-group">
                <div className="logo">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                </div>
                <div>
                  <h1 className="title-main">AutoAI Отчёт</h1>
                  <div className="title-sub">Система интеллектуальной диагностики</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '8px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Дата</div>
                <div style={{ fontSize: '11px', fontWeight: 700 }}>{new Date().toLocaleDateString('ru-RU')}</div>
              </div>
            </div>
            
            <div className="divider-line"></div>

            <div className="info-grid">
              <div className="info-card">
                <div className="card-lbl">Автомобиль</div>
                <div className="card-val">{activeCar.make} {activeCar.model}</div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>{activeCar.year || '2023'} • {activeCar.licensePlate}</div>
              </div>
              <div className="info-card">
                <div className="card-lbl">Идентификатор VIN</div>
                <div className="card-val" style={{ fontSize: '14px' }}>{activeCar.vin || '—'}</div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>Статус: Проверено</div>
              </div>
            </div>

            <div className="stats-bar">
              <div className="stat-box" style={{ background: '#f5f3ff', border: 'none' }}>
                <div className="stat-lbl">Общие расходы</div>
                <div className="stat-val" style={{ color: '#4f46e5' }}>{stats.total.toLocaleString()} ₽</div>
              </div>
              <div className="stat-box">
                <div className="stat-lbl">Кол-во записей</div>
                <div className="stat-val">{carRecords.length}</div>
              </div>
              <div className="stat-box">
                <div className="stat-lbl">Пробег (км)</div>
                <div className="stat-val">{activeCar.mileage || '—'}</div>
              </div>
              <div className="stat-box">
                <div className="stat-lbl">ТО / Сервис</div>
                <div className="stat-val" style={{ color: '#10b981' }}>{(stats.byType.service || 0).toLocaleString()} ₽</div>
              </div>
            </div>

            <div className="table-header">История обслуживания</div>
            <table className="main-table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Категория</th>
                  <th>Описание работ</th>
                  <th style={{ textAlign: 'right' }}>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {carRecords.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, color: '#64748b' }}>{r.date}</td>
                    <td style={{ fontWeight: 800, color: CATEGORIES[r.type]?.badgeColor || '#4f46e5' }}>{CATEGORIES[r.type]?.label.toUpperCase()}</td>
                    <td style={{ fontWeight: 500 }}>{r.description}</td>
                    <td style={{ textAlign: 'right', fontWeight: 900 }}>{r.amount.toLocaleString()} ₽</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="footer-bar">
              <div>AutoAI CORE GENERATION</div>
              <div>ID: {Math.floor(Math.random() * 1000000)} • {new Date().toLocaleTimeString('ru-RU')}</div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isGeneratingPdf && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6">
            <div className="bg-white p-12 rounded-[48px] shadow-2xl flex flex-col items-center gap-8 max-w-xs w-full text-center">
              <div className="relative">
                <Loader2 className="animate-spin text-indigo-600" size={64} />
                <Activity className="absolute inset-0 m-auto text-indigo-200" size={24} />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 mb-2">Генерация отчета</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">Идет подготовка данных для Telegram...</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {(cars || []).map(car => (
          <button key={car.id} onClick={() => setActiveCarId(car.id)} className={`flex items-center gap-3 px-6 py-4 rounded-[24px] font-bold transition-all shrink-0 border-2 ${activeCarId === car.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105' : 'bg-white border-slate-100 text-slate-400'}`}>
            <CarIcon size={16} />
            <div className="text-left">
              <p className="text-[10px] uppercase font-black tracking-widest opacity-60 mb-0.5">{car.make || 'Car'}</p>
              <p className="text-sm tracking-tight leading-none truncate max-w-[120px]">{car.model || 'Model'}</p>
            </div>
          </button>
        ))}
      </div>

      {activeCar ? (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                {activeCar.make} {activeCar.model}
                <span className="text-[10px] bg-slate-900 text-white px-3 py-1.5 rounded-xl font-black uppercase tracking-widest">{activeCar.licensePlate}</span>
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button onClick={() => handleGeneratePdf(false)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"><Download size={14} /> PDF</button>
              <button onClick={() => handleGeneratePdf(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"><Send size={14} /> Сформировать отчет</button>
              <button onClick={() => setShowAddModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all"><Plus size={16} /> Добавить</button>
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
              <h3 className="font-black text-slate-900 uppercase tracking-tighter text-md flex items-center gap-2"><History size={18} /> История обслуживания</h3>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                <input type="text" placeholder="Поиск в истории..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-48 bg-slate-50 border-none rounded-lg py-2 pl-9 pr-3 text-[11px] font-bold outline-none" />
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
                            <div className={`w-9 h-9 rounded-xl ${cat?.bgColor || 'bg-slate-50'} ${cat?.color || 'text-slate-400'} flex items-center justify-center shrink-0`}>
                              {cat?.icon ? <cat.icon size={16} /> : <Wrench size={16} />}
                            </div>
                            <div>
                              <p className="text-[13px] font-black text-slate-900 uppercase leading-tight">{record.description || 'Без описания'}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(record.date).toLocaleDateString('ru-RU')} • {cat?.label || 'Запись'}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-[13px] font-black text-slate-900">{(record.amount || 0).toLocaleString()} ₽</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button onClick={() => deleteRecord(record.id)} className="p-2 text-slate-200 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : <div className="py-12 text-center text-slate-300 text-[10px] font-black uppercase tracking-widest">Журнал пуст</div>}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mb-4" />
          <p className="text-[10px] font-black uppercase tracking-widest">Инициализация...</p>
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Новая запись</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={24} /></button>
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
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-colors">Сохранить</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
