import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, AlertTriangle, ShieldCheck, Clock, CreditCard, ChevronRight, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

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

    console.log('Sending request to:', `${API_URL}/diagnose`);

    try {
      const res = await fetch(`${API_URL}/diagnose`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ 
          text: currentInput, 
          carInfo: activeCar ? { make: activeCar.make, model: activeCar.model, year: activeCar.year } : null 
        })
      });
      
      console.log('Response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Server error response:', errorText);
        throw new Error(`Ошибка сервера: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Received data:', data);
      
      const assistantMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: data.results ? `Я проанализировал симптомы для вашего ${activeCar ? activeCar.make : 'автомобиля'}. Вот что удалось выяснить:` : 'Не удалось получить внятный ответ от ИИ.',
        results: data.results || []
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { id: 'err', role: 'assistant', content: `Произошла ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] bg-slate-50 rounded-3xl overflow-hidden border border-slate-200">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-white text-indigo-600 border border-slate-200'}`}>
                {msg.role === 'user' ? <User size={20} className="text-white" /> : <Bot size={20} />}
              </div>
              <div className="space-y-4">
                <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-800 border border-slate-100'}`}>
                  {msg.content}
                </div>
                
                {msg.results && (
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
                            {Math.round(res.confidence * 100)}% Match
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">{res.description}</p>
                        
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <AlertTriangle size={14} className="text-amber-500" />
                            <span>Риск: {res.risk}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <Clock size={14} className="text-indigo-400" />
                            <span>Срок: {res.urgency}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <CreditCard size={14} className="text-emerald-500" />
                            <span>Цена: {res.estimatedCost}</span>
                          </div>
                          <button className="flex items-center justify-end gap-1 text-[11px] text-indigo-600 font-bold hover:underline">
                            Инструкция <ChevronRight size={14} />
                          </button>
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
            <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm italic text-xs text-slate-400">
              ИИ анализирует вашу проблему...
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
          ИИ может ошибаться. Для точной диагностики подключите OBD-II сканер.
        </p>
      </div>
    </div>
  );
};
