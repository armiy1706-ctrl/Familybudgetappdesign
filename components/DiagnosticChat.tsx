import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, AlertTriangle, ShieldCheck, Clock, CreditCard, Loader2, Sparkles } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ac2bdc5c`;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  results?: any[];
}

export const DiagnosticChat = ({ messages, setMessages, activeCar }: { 
  messages: Message[], 
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  activeCar: any
}) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch(`${API_URL}/diagnose`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ 
          text: currentInput, 
          carInfo: activeCar ? { 
            make: activeCar.make, 
            model: activeCar.model, 
            year: activeCar.year,
            vin: activeCar.vin,
            mileage: activeCar.mileage,
            engine: activeCar.engine
          } : null 
        })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Ошибка сервера');
      }
      const data = await res.json();
      
      const assistantMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: data.message || 'Не удалось получить ответ.',
        results: data.results || []
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      toast.error(`Ошибка: ${err.message}`);
      setMessages(prev => [...prev, { id: 'err', role: 'assistant', content: `Ошибка связи с ИИ (OpenAI). ${err.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const saveToHistory = (msg: Message) => {
    if (!activeCar) {
      toast.error('Сначала добавьте автомобиль в гараж');
      return;
    }
    
    const newRecord = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('ru-RU'),
      type: 'Диагностика ИИ',
      description: msg.results?.[0]?.diagnosis || 'Анализ симптомов',
      cost: msg.results?.[0]?.estimatedCost || '0',
      details: msg.content,
      mileage: activeCar.mileage || 0
    };

    if ((window as any).addServiceRecord) {
      (window as any).addServiceRecord(activeCar.id, newRecord);
      toast.success('Отчет сохранен в историю обслуживания!');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] bg-slate-50 rounded-3xl overflow-hidden border border-slate-200">
      <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-indigo-600" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-800">Интеллектуальный помощник OpenAI</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">System Online</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-white text-indigo-600 border border-slate-200'}`}>
                {msg.role === 'user' ? <User size={20} className="text-white" /> : <Bot size={20} />}
              </div>
              <div className="space-y-4">
                <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-800 border border-slate-100'}`}>
                  {msg.content}
                  
                  {msg.role === 'assistant' && msg.id !== 'err' && (
                    <button 
                      onClick={() => saveToHistory(msg)}
                      className="mt-4 w-full flex items-center justify-center gap-2 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors border border-indigo-100"
                    >
                      <ShieldCheck size={14} /> Сохранить в историю ТО
                    </button>
                  )}
                </div>
                
                {msg.results && msg.results.length > 0 && (
                  <div className="space-y-3">
                    {msg.results.map((res, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={idx} 
                        className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-slate-900 pr-4">{res.diagnosis}</h4>
                          <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-1 rounded-full uppercase">
                            {res.confidence ? `${Math.round(res.confidence * 100)}% Match` : 'AI Result'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">{res.description || 'ИИ проанализировал данные и рекомендует обратить внимание на этот узел.'}</p>
                        
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <AlertTriangle size={14} className="text-amber-500" />
                            <span>Риск: {res.risk || 'Средний'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <Clock size={14} className="text-indigo-400" />
                            <span>Срок: {res.urgency || 'В плановом порядке'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <CreditCard size={14} className="text-emerald-500" />
                            <span>Цена: {res.estimatedCost}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
              <Loader2 size={20} className="text-indigo-400 animate-spin" />
            </div>
            <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm italic text-xs text-slate-400 flex items-center gap-2">
              <Sparkles size={14} className="text-indigo-600 animate-pulse" />
              OpenAI анализирует симптомы...
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white border-t border-slate-100">
        <div className="relative flex items-center">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Опишите проблему (например: стук в подвеске)"
            className="w-full pl-6 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 ring-indigo-500 outline-none transition-all placeholder:text-slate-400 text-slate-700"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-2 p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="mt-2 text-[10px] text-center text-slate-400 uppercase tracking-widest font-bold">
          ИИ OpenAI может ошибаться. Для точной диагностики обратитесь к специалисту.
        </p>
      </div>
    </div>
  );
};
