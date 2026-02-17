import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Car as CarIcon, 
  Wrench, 
  History, 
  Plus, 
  Filter,
  Download,
  Trash2,
  TrendingUp,
  DollarSign,
  Fuel,
  Cog,
  Shield,
  ChevronRight,
  ChevronDown,
  X,
  PlusCircle,
  FileText,
  PieChart as PieIcon,
  Search,
  Camera,
  Eye,
  Image as ImageIcon,
  Loader2,
  Archive,
  Send
} from 'lucide-react';
import { 
  AreaChart, Area, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
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

const COLORS = ['#4f46e5', '#f59e0b', '#10b981', '#ef4444'];

// --- Sub-Components ---

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
  
  // PDF Preview State
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Form State for OCR
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Camera & Receipt state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [tempReceiptImage, setTempReceiptImage] = useState<string | null>(null);
  const [isPhotoViewOpen, setIsPhotoViewOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  // Load JSZip dynamically to avoid build-time resolution issues
  useEffect(() => {
    if (!(window as any).JSZip) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('autoai_maintenance_records');
    if (saved) {
      try {
        setRecords(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load records", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('autoai_maintenance_records', JSON.stringify(records));
  }, [records]);

  // Ensure active car is valid
  useEffect(() => {
    if (cars.length > 0 && !activeCarId) {
      setActiveCarId(cars[0].id);
    } else if (cars.length > 0 && activeCarId && !cars.find(c => c.id === activeCarId)) {
      setActiveCarId(cars[0].id);
    }
  }, [cars, activeCarId]);

  useEffect(() => {
    if (!(window as any).html2pdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const activeCar = useMemo(() => cars.find(c => c.id === activeCarId), [cars, activeCarId]);
  
  // Filter records for active car
  const carRecords = useMemo(() => {
    if (!activeCarId) return [];
    return records.filter(r => r.carId === activeCarId && 
      (r.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
       CATEGORIES[r.type].label.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, activeCarId, searchTerm]);

  // Stats
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

  const chartData = useMemo(() => {
    return Object.entries(CATEGORIES).map(([key, cat]) => ({
      name: cat.label,
      value: stats.byType[key as RecordType] || 0
    })).filter(d => d.value > 0);
  }, [stats]);

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
    if (!window.confirm("Удалить эту запись?")) return;
    setRecords(prev => prev.filter(r => r.id !== id));
    toast.success('Запись удалена');
  };

  const handleCameraCapture = async (imageData: string) => {
    setTempReceiptImage(imageData);
    setIsCameraOpen(false);
    toast.success('Документ успешно прикреплен к записи');
  };

  const openReceiptView = (image: string) => {
    setSelectedReceipt(image);
    setIsPhotoViewOpen(true);
  };

  const exportArchive = async () => {
    if (!activeCar) return;
    const JSZipLib = (window as any).JSZip;
    
    if (!JSZipLib) {
      toast.error("Библиотека архивации еще загружается. Попробуйте через секунду.");
      return;
    }

    toast.info("Подготовка архива...");
    
    try {
      const zip = new JSZipLib();
      
      // CSV Content
      const headers = ['Дата', 'Тип', 'Описание', 'Сумма (₽)', 'Файл чека'];
      const rows = carRecords.map(r => [
        r.date,
        CATEGORIES[r.type].label,
        r.description,
        r.amount,
        r.receiptImage ? `receipt_${r.id}.png` : '-'
      ]);
      
      const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
      zip.file(`ТО_${activeCar.make}_${activeCar.model}.csv`, csvContent);
      
      // Images folder
      const imgFolder = zip.folder("receipts");
      if (imgFolder) {
        for (const record of carRecords) {
          if (record.receiptImage) {
            const base64Parts = record.receiptImage.split(',');
            if (base64Parts.length > 1) {
              const base64Data = base64Parts[1];
              imgFolder.file(`receipt_${record.id}.png`, base64Data, { base64: true });
            }
          }
        }
      }
      
      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `AutoAI_Export_${activeCar.licensePlate || 'Car'}_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Архив успешно создан и скачан");
    } catch (err) {
      console.error("Export Error:", err);
      toast.error("Ошибка при создании архива");
    }
  };

  const handleGeneratePdf = async (shouldSendToTelegram = false) => {
    if (!activeCar) return;
    const h2p = (window as any).html2pdf;
    if (!h2p) {
      toast.error("Библиотека PDF еще загружается...");
      return;
    }

    const element = document.getElementById('full-report-content');
    if (!element) {
      toast.error("Контент для PDF не найден");
      return;
    }

    // Limit photos if there are too many to prevent crash
    const totalPhotos = carRecords.filter(r => r.receiptImage).length;
    if (totalPhotos > 30) {
      toast.warning("У вас очень много фото. Генерация может занять до 1 минуты или вызвать зависание.");
    }

    setIsGeneratingPdf(true);
    
    // Aggressive optimization for "many photos" cases
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `AutoAI_Report_${activeCar.licensePlate || 'CAR'}.pdf`,
      image: { type: 'jpeg', quality: 0.6 }, // Lower quality significantly helps memory
      html2canvas: { 
        scale: 1.0, // Scale 1.0 is safest for memory with many images
        useCORS: true, 
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        imageTimeout: 30000, // Longer timeout for many photos
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true }
    };

    // Use setTimeout to allow the browser to show the loading spinner first
    setTimeout(async () => {
      try {
        const worker = h2p();
        
        if (shouldSendToTelegram) {
          toast.info("Сжимаем данные для Telegram...");
          const pdfBlob = await worker.set(opt).from(element).outputPdf('blob');
          
          if (pdfBlob) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64data = reader.result as string;
              onSendToTelegram?.(base64data, `${activeCar.make} ${activeCar.model}`);
              setIsGeneratingPdf(false);
            };
            reader.onerror = () => {
              toast.error("Ошибка при чтении файла");
              setIsGeneratingPdf(false);
            };
            reader.readAsDataURL(pdfBlob);
          }
        } else {
          await worker.set(opt).from(element).save();
          toast.success("Отчет сохранен");
          setIsGeneratingPdf(false);
        }
      } catch (err: any) {
        console.error("CRITICAL PDF ERROR:", err);
        setIsGeneratingPdf(false);
        toast.error("Сбой: слишком много фото для текущей памяти браузера. Попробуйте удалить часть записей или использовать экспорт в ZIP.");
      }
    }, 800);
  };

  if (cars.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[40px] border border-dashed border-slate-200 text-center px-10">
        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mb-6">
          <CarIcon size={40} />
        </div>
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Ваш парк пуст</h3>
        <p className="text-sm text-slate-400 font-medium max-w-sm">Добавьте свой первый автомобиль в разделе «Мой профиль», чтобы начать вести детальный журнал обслуживания и следить за расходами.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <CameraCapture 
        isOpen={isCameraOpen} 
        onClose={() => setIsCameraOpen(false)} 
        onCapture={handleCameraCapture} 
      />

      {/* Car Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {cars.map(car => (
            <button
              key={car.id}
              onClick={() => setActiveCarId(car.id)}
              className={`flex items-center gap-3 px-6 py-4 rounded-[24px] font-bold transition-all shrink-0 border-2 ${
                activeCarId === car.id 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100 scale-105' 
                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeCarId === car.id ? 'bg-white/20' : 'bg-slate-50 text-slate-400'}`}>
                <CarIcon size={16} />
              </div>
            <div className="text-left">
              <p className="text-[10px] uppercase font-black tracking-widest leading-none opacity-60 mb-0.5">{car.make}</p>
              <p className="text-sm tracking-tight leading-none truncate max-w-[120px]">{car.model}</p>
            </div>
          </button>
        ))}
      </div>

      {activeCar && (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                {activeCar.make} {activeCar.model}
                <span className="text-xs bg-slate-900 text-white px-3 py-1 rounded-lg font-black tracking-widest uppercase">{activeCar.licensePlate}</span>
              </h2>
              <p className="text-slate-400 font-medium text-sm mt-1">Всего записей: {carRecords.length}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button 
                onClick={() => setShowPdfPreview(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-indigo-600 text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-sm"
              >
                <FileText size={14} /> Отчет PDF
              </button>
              <button 
                onClick={exportArchive}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
              >
                <Archive size={14} /> Экспорт ZIP
              </button>
              <button 
                onClick={() => {
                  setFormAmount('');
                  setFormDate(new Date().toISOString().split('T')[0]);
                  setShowAddModal(true);
                }}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
              >
                <Plus size={16} /> Новая запись
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-1 bg-indigo-600 p-6 rounded-[32px] text-white shadow-xl shadow-indigo-100 flex flex-col justify-between">
              <div>
                <DollarSign size={24} className="mb-4 opacity-50" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-80">Всего затрат</p>
                <h4 className="text-2xl font-black tracking-tighter">{stats.total.toLocaleString()} ₽</h4>
              </div>
            </div>
            <StatCard label="🔧 Ремонт" value={`${(stats.byType.repair || 0).toLocaleString()} ₽`} icon={Wrench} colorClass="text-rose-600" bgColorClass="bg-rose-50" />
            <StatCard label="⚙️ Запчасти" value={`${(stats.byType.parts || 0).toLocaleString()} ₽`} icon={Cog} colorClass="text-amber-600" bgColorClass="bg-amber-50" />
            <StatCard label="⛽ Топливо" value={`${(stats.byType.fuel || 0).toLocaleString()} ₽`} icon={Fuel} colorClass="text-indigo-600" bgColorClass="bg-indigo-50" />
            <StatCard label="🔩 ТО" value={`${(stats.byType.service || 0).toLocaleString()} ₽`} icon={Shield} colorClass="text-emerald-600" bgColorClass="bg-emerald-50" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm h-fit">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><PieIcon size={20} /></div>
                <h3 className="font-black text-slate-900 uppercase tracking-tighter text-lg">Аналитика</h3>
              </div>
              <div className="h-[240px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', fontSize: '12px', fontWeight: 'bold' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{value}</span>}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-slate-300 text-xs font-bold uppercase">Нет данных</div>}
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row justify-between gap-4">
                <h3 className="font-black text-slate-900 uppercase tracking-tighter text-lg flex items-center gap-3"><History size={20} /> История</h3>
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input type="text" placeholder="Поиск..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-64 bg-slate-50 border-none rounded-xl py-3 pl-10 pr-4 text-xs font-bold focus:ring-2 ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="overflow-x-auto">
                {carRecords.length > 0 ? (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/30">
                        <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Операция</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Сумма</th>
                        <th className="px-8 py-4 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {carRecords.map(record => {
                        const cat = CATEGORIES[record.type];
                        return (
                          <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-5 flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl ${cat.bgColor} ${cat.color} flex items-center justify-center shrink-0`}><cat.icon size={18} /></div>
                              <div>
                                <p className="text-sm font-black text-slate-900 uppercase tracking-tight leading-tight">{record.description}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(record.date).toLocaleDateString('ru-RU')} • {cat.label}</p>
                              </div>
                            </td>
                            <td className="px-8 py-5 text-right"><span className={`inline-flex items-center px-3 py-1.5 rounded-xl font-black text-xs ${cat.bgColor} ${cat.color}`}>{record.amount.toLocaleString()} ₽</span></td>
                            <td className="px-8 py-5 text-center">
                              <div className="flex items-center gap-2 justify-center">
                                {record.receiptImage && <button onClick={() => openReceiptView(record.receiptImage!)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"><ImageIcon size={16} /></button>}
                                <button onClick={() => deleteRecord(record.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : <div className="py-20 text-center text-slate-300 text-xs font-bold uppercase tracking-widest">Записей не найдено</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[40px] w-full max-w-lg p-10 shadow-2xl relative z-10 overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Новая запись</h3>
                <button onClick={() => setShowAddModal(false)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900"><X size={24} /></button>
              </div>
              <form onSubmit={handleAddRecord} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Тип</label>
                    <select name="type" required className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none">
                      {Object.entries(CATEGORIES).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Дата</label>
                    <input name="date" type="date" required value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Описание работ</label>
                  <input name="description" type="text" required placeholder="Замена масла..." className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Сумма (₽)</label>
                  <input name="amount" type="number" required placeholder="0" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Документ</label>
                  {tempReceiptImage ? (
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-lg border border-slate-100">
                      <img src={tempReceiptImage} alt="Документ" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setTempReceiptImage(null)} className="absolute top-3 right-3 p-2 bg-rose-500 text-white rounded-xl"><X size={16} /></button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setIsCameraOpen(true)} className="w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all">
                      <Camera size={24} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Сфотографировать</span>
                    </button>
                  )}
                </div>
                <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 mt-4">Сохранить запись</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPhotoViewOpen && selectedReceipt && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPhotoViewOpen(false)} className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative z-10 max-w-2xl w-full">
              <button onClick={() => setIsPhotoViewOpen(false)} className="absolute -top-12 right-0 p-2 text-white hover:text-indigo-400"><X size={32} /></button>
              <img src={selectedReceipt} alt="Receipt" className="w-full h-auto rounded-3xl shadow-2xl border border-white/10" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPdfPreview && activeCar && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPdfPreview(false)} className="absolute inset-0 bg-slate-900/80 backdrop-blur-lg" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }} className="bg-white rounded-[40px] w-full max-w-4xl p-0 shadow-2xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden">
              <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white"><FileText size={24} /></div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Предпросмотр отчета</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Экспорт истории обслуживания</p>
                  </div>
                </div>
                <button onClick={() => setShowPdfPreview(false)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-900"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 bg-slate-200/50">
                <div id="full-report-content" style={{ backgroundColor: '#ffffff', color: '#0f172a', padding: '40px', margin: '0 auto', width: '190mm', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '4px solid #4f46e5', paddingBottom: '30px', marginBottom: '40px' }}>
                    <div>
                      <h1 style={{ fontSize: '28px', fontWeight: '900', letterSpacing: '-0.05em', textTransform: 'uppercase', fontStyle: 'italic', margin: 0 }}>AutoAI Отчёт</h1>
                      <p style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Интеллектуальный журнал ТО</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: '#94a3b8', margin: 0 }}>Дата: {new Date().toLocaleDateString('ru-RU')}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
                    <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '20px', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                      <p style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', color: '#4f46e5', margin: '0 0 6px 0' }}>Автомобиль</p>
                      <h2 style={{ fontSize: '22px', fontWeight: '900', margin: 0 }}>{activeCar.make} {activeCar.model}</h2>
                      <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b', margin: '4px 0 0 0' }}>{activeCar.year} г.в. • {activeCar.licensePlate}</p>
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                        <th style={{ padding: '12px', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', textAlign: 'left' }}>Дата</th>
                        <th style={{ padding: '12px', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', textAlign: 'left' }}>Описание</th>
                        <th style={{ padding: '12px', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', textAlign: 'right' }}>Сумма</th>
                      </tr>
                    </thead>
                    <tbody>
                      {carRecords.map((r, i) => (
                        <tr key={r.id} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #f1f5f9', pageBreakInside: 'avoid' }}>
                          <td style={{ padding: '12px', fontSize: '11px', fontWeight: 'bold' }}>{r.date}</td>
                          <td style={{ padding: '12px', fontSize: '11px', fontWeight: 'bold' }}>{r.description}</td>
                          <td style={{ padding: '12px', fontSize: '11px', fontWeight: '900', textAlign: 'right' }}>{r.amount.toLocaleString()} ₽</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {carRecords.some(r => r.receiptImage) && (
                    <div style={{ pageBreakBefore: 'auto' }}>
                      <h3 style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', marginBottom: '20px', borderLeft: '4px solid #4f46e5', paddingLeft: '12px' }}>Прикрепленные документы</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        {carRecords.filter(r => r.receiptImage).map((r) => (
                          <div key={r.id} style={{ width: '100%', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '15px', backgroundColor: '#f8fafc', pageBreakInside: 'avoid' }}>
                            <img src={r.receiptImage} style={{ width: '100%', maxHeight: '160mm', objectFit: 'contain', borderRadius: '12px', marginBottom: '10px', backgroundColor: '#ffffff' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <p style={{ fontSize: '11px', fontWeight: 'bold', margin: 0 }}>{r.description}</p>
                              <p style={{ fontSize: '11px', fontWeight: '900', color: '#4f46e5', margin: 0 }}>{r.date} • {r.amount.toLocaleString()} ₽</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-10 py-8 bg-white border-t border-slate-100 flex gap-4">
                <button onClick={() => handleGeneratePdf(false)} disabled={isGeneratingPdf} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isGeneratingPdf ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />} 
                  {isGeneratingPdf ? 'Сжатие...' : 'Скачать PDF'}
                </button>
                <button onClick={() => handleGeneratePdf(true)} disabled={isGeneratingPdf} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isGeneratingPdf ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />} 
                  {isGeneratingPdf ? 'Обработка...' : 'В Telegram бот'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
