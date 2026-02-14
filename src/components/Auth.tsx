import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Activity, MessageCircle, ShieldCheck, Zap, AlertCircle, PlayCircle } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';

export const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      // 1. Call server to ensure demo user exists and get credentials
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac2bdc5c/demo-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      const data = await response.json();

      if (data.email && data.password) {
        // 2. Sign in with the provided credentials
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password
        });
        
        if (error) throw error;
        toast.success('Вход в демо-режим выполнен');
      } else {
        throw new Error(data.error || 'Не удалось получить данные для входа');
      }
    } catch (error: any) {
      toast.error('Ошибка входа: ' + error.message);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTelegramInstruction = () => {
    toast.info('Для автоматического входа используйте Telegram бота. В браузере используйте Демо-вход.', {
      duration: 5000,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-[32px] shadow-xl shadow-indigo-100 mb-4">
            <Activity size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">AutoAI</h1>
          <p className="text-slate-500 font-medium px-4">Интеллектуальная диагностика вашего автомобиля</p>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200 space-y-6">
          <div className="space-y-4">
            <FeatureItem icon={ShieldCheck} text="Автоматическая авторизация (Mini App)" />
            <FeatureItem icon={Zap} text="Мгновенный доступ к OBD-II данным" />
            <FeatureItem icon={MessageCircle} text="ИИ-консультации 24/7" />
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <PlayCircle size={22} />
                  Войти в Демо-режим
                </>
              )}
            </button>

            <button
              onClick={handleTelegramInstruction}
              className="w-full flex items-center justify-center gap-3 py-4 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-50"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM16.64 8.8C16.49 10.38 15.84 14.19 15.51 15.96C15.37 16.71 15.09 16.96 14.82 16.99C14.24 17.04 13.8 16.61 13.24 16.24C12.36 15.66 11.86 15.3 11 14.74C10.01 14.09 10.65 13.73 11.22 13.14C11.37 12.99 13.93 10.66 13.98 10.45C13.99 10.42 13.99 10.34 13.95 10.31C13.91 10.27 13.84 10.28 13.79 10.29C13.72 10.31 12.63 11.03 10.53 12.45C10.22 12.66 9.94 12.77 9.69 12.76C9.42 12.75 8.89 12.61 8.5 12.48C8.02 12.32 7.64 12.24 7.67 11.97C7.69 11.83 7.88 11.69 8.25 11.55C10.51 10.57 12.02 9.92 12.78 9.61C14.94 8.71 15.39 8.55 15.68 8.55C15.75 8.55 15.9 8.57 16.01 8.65C16.1 8.73 16.12 8.84 16.13 8.92C16.12 8.98 16.12 9.04 16.11 9.1L16.64 8.8Z" fill="white"/>
              </svg>
              Открыть через Telegram
            </button>
          </div>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
            <AlertCircle className="text-amber-500 shrink-0" size={20} />
            <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
              Используйте <b>Демо-режим</b> для быстрой проверки интерфейса прямо сейчас. Для полной работы с авто-авторизацией используйте Telegram Mini App.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureItem = ({ icon: Icon, text }: { icon: any; text: string }) => (
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 bg-slate-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
      <Icon size={18} />
    </div>
    <span className="text-sm font-bold text-slate-600">{text}</span>
  </div>
);
