import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  Bell, 
  BellRing, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Gauge, 
  Send, 
  ShieldCheck, 
  Wrench, 
  X,
  Loader2,
  BellOff,
  Settings2,
  Calendar,
  Server,
  RefreshCw,
  CloudOff,
  Cloud,
  Wifi,
  WifiOff
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface MaintenanceRecord {
  id: string;
  date: string;
  mileage: number;
  intervalKm: number;
  intervalMonths: number;
  description: string;
  price: number;
  comment: string;
}

interface MaintenanceAlert {
  id: string;
  recordId: string;
  description: string;
  severity: 'critical' | 'warning' | 'ok';
  kmRemaining: number;
  daysRemaining: number;
  nextKm: number;
  nextDate: string;
  progress: number;
  lastServiceDate: string;
  lastServiceKm: number;
}

interface NotificationSettings {
  autoNotify: boolean;
  warningThresholdKm: number;
  warningThresholdDays: number;
  criticalThresholdKm: number;
  criticalThresholdDays: number;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  autoNotify: true,
  warningThresholdKm: 1500,
  warningThresholdDays: 30,
  criticalThresholdKm: 0,
  criticalThresholdDays: 0,
};

export const MaintenanceAlerts = ({ 
  activeCar, 
  dashboardData, 
  session 
}: { 
  activeCar: any;
  dashboardData: any;
  session: any;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    try {
      const saved = localStorage.getItem('autoai_notification_settings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // --- Server cron state ---
  const [cronStatus, setCronStatus] = useState<{
    isRegistered: boolean;
    cronConfigured: boolean;
    serverSettingsSynced: boolean;
    lastCronNotif: string | null;
  } | null>(null);
  const [isSyncingSettings, setIsSyncingSettings] = useState(false);
  const settingsSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tgId = session?.user?.user_metadata?.telegram_id;
  const currentOdometer = Number(dashboardData?.currentOdometer) || (Number(activeCar?.mileage) || 0);
  const maintenanceRecords: MaintenanceRecord[] = dashboardData?.maintenanceRecords || [];

  // Save settings to localStorage + sync to server (debounced)
  useEffect(() => {
    localStorage.setItem('autoai_notification_settings', JSON.stringify(settings));

    // Debounced sync to server
    if (tgId && tgId !== 'demo_user') {
      if (settingsSyncTimer.current) clearTimeout(settingsSyncTimer.current);
      settingsSyncTimer.current = setTimeout(() => {
        syncSettingsToServer(settings);
      }, 1500);
    }

    return () => {
      if (settingsSyncTimer.current) clearTimeout(settingsSyncTimer.current);
    };
  }, [settings, tgId]);

  // Fetch cron status on mount
  useEffect(() => {
    if (!tgId || tgId === 'demo_user') return;
    fetchCronStatus();
  }, [tgId, activeCar?.id]);

  const fetchCronStatus = useCallback(async () => {
    if (!tgId || tgId === 'demo_user') return;
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-ac2bdc5c/cron-status?tgId=${tgId}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      if (res.ok) {
        const data = await res.json();
        const lastNotifForCar = activeCar?.id ? data.lastCronNotifications?.[activeCar.id] : null;
        setCronStatus({
          isRegistered: data.isRegistered,
          cronConfigured: data.cronConfigured,
          serverSettingsSynced: data.serverSettingsSynced,
          lastCronNotif: lastNotifForCar || null,
        });

        // If server has settings but local doesn't match, optionally load from server
        if (data.settings && !localStorage.getItem('autoai_notification_settings')) {
          setSettings(data.settings);
        }
      }
    } catch (err) {
      console.error('Failed to fetch cron status:', err);
    }
  }, [tgId, activeCar?.id]);

  const syncSettingsToServer = useCallback(async (settingsToSync: NotificationSettings) => {
    if (!tgId || tgId === 'demo_user') return;
    setIsSyncingSettings(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-ac2bdc5c/save-notification-settings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ tgId, settings: settingsToSync })
        }
      );
      if (res.ok) {
        setCronStatus(prev => prev ? { ...prev, serverSettingsSynced: true } : prev);
      }
    } catch (err) {
      console.error('Failed to sync settings to server:', err);
    } finally {
      setIsSyncingSettings(false);
    }
  }, [tgId]);

  // Calculate alerts from all maintenance records
  const alerts: MaintenanceAlert[] = useMemo(() => {
    if (maintenanceRecords.length === 0) return [];

    // Group by description to get latest record per service type
    const latestByType = new Map<string, MaintenanceRecord>();
    for (const record of maintenanceRecords) {
      const key = record.description || 'TO';
      const existing = latestByType.get(key);
      if (!existing || new Date(record.date) > new Date(existing.date)) {
        latestByType.set(key, record);
      }
    }

    const result: MaintenanceAlert[] = [];

    latestByType.forEach((record) => {
      const nextKm = record.mileage + record.intervalKm;
      const nextDate = new Date(record.date);
      nextDate.setMonth(nextDate.getMonth() + record.intervalMonths);

      const kmRemaining = nextKm - currentOdometer;
      const daysRemaining = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const progress = Math.max(0, Math.min(100, (kmRemaining / record.intervalKm) * 100));

      let severity: 'critical' | 'warning' | 'ok' = 'ok';
      if (kmRemaining <= settings.criticalThresholdKm || daysRemaining <= settings.criticalThresholdDays) {
        severity = 'critical';
      } else if (kmRemaining <= settings.warningThresholdKm || daysRemaining <= settings.warningThresholdDays) {
        severity = 'warning';
      }

      result.push({
        id: `alert_${record.id}`,
        recordId: record.id,
        description: record.description || 'Плановое ТО',
        severity,
        kmRemaining,
        daysRemaining,
        nextKm,
        nextDate: nextDate.toLocaleDateString('ru-RU'),
        progress,
        lastServiceDate: new Date(record.date).toLocaleDateString('ru-RU'),
        lastServiceKm: record.mileage,
      });
    });

    // Sort: critical first, then warning, then ok
    result.sort((a, b) => {
      const order = { critical: 0, warning: 1, ok: 2 };
      return order[a.severity] - order[b.severity];
    });

    return result;
  }, [maintenanceRecords, currentOdometer, settings]);

  const urgentAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'warning');
  const hasUrgent = urgentAlerts.length > 0;

  // Check last notification time
  useEffect(() => {
    if (!tgId || !activeCar?.id) return;
    const lastKey = `autoai_last_notif_${tgId}_${activeCar.id}`;
    const last = localStorage.getItem(lastKey);
    if (last) setLastSentAt(last);
  }, [tgId, activeCar?.id]);

  // Auto-notify on mount if settings allow
  useEffect(() => {
    if (!settings.autoNotify || !hasUrgent || !tgId || !activeCar?.id) return;

    const lastKey = `autoai_last_notif_${tgId}_${activeCar.id}`;
    const last = localStorage.getItem(lastKey);
    
    if (last) {
      const lastTime = new Date(last).getTime();
      const hoursSinceLast = (Date.now() - lastTime) / (1000 * 60 * 60);
      // Only auto-send once every 24 hours
      if (hoursSinceLast < 24) return;
    }

    // Slight delay for UX
    const timer = setTimeout(() => {
      sendTelegramAlert(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [hasUrgent, tgId, activeCar?.id, settings.autoNotify]);

  const sendTelegramAlert = useCallback(async (isAuto = false) => {
    if (!tgId || !activeCar) {
      if (!isAuto) toast.error('Telegram ID не найден. Откройте приложение через Telegram.');
      return;
    }

    if (urgentAlerts.length === 0) {
      if (!isAuto) toast.info('Нет срочных уведомлений для отправки.');
      return;
    }

    setIsSending(true);
    const carName = `${activeCar.make || ''} ${activeCar.model || ''}`.trim() || 'Автомобиль';

    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac2bdc5c/send-maintenance-alert`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${publicAnonKey}` 
        },
        body: JSON.stringify({
          tgId,
          carName,
          alerts: urgentAlerts.map(a => ({
            description: a.description,
            severity: a.severity,
            kmRemaining: a.kmRemaining,
            daysRemaining: a.daysRemaining,
            nextDate: a.nextDate,
            nextKm: a.nextKm,
          }))
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || 'Ошибка отправки');
      }

      const now = new Date().toISOString();
      setLastSentAt(now);
      localStorage.setItem(`autoai_last_notif_${tgId}_${activeCar.id}`, now);

      // Also mark on server
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac2bdc5c/mark-notification-sent`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${publicAnonKey}` 
        },
        body: JSON.stringify({ tgId, carId: activeCar.id })
      }).catch(() => {});

      if (!isAuto) {
        toast.success('Уведомление отправлено в Telegram!');
      } else {
        toast('Автоуведомление о ТО отправлено в Telegram', { 
          icon: <BellRing size={16} className="text-indigo-600" />,
          duration: 4000 
        });
      }
    } catch (err: any) {
      console.error('Failed to send maintenance alert:', err);
      if (!isAuto) {
        toast.error(`Ошибка: ${err.message}`);
      }
    } finally {
      setIsSending(false);
    }
  }, [tgId, activeCar, urgentAlerts]);

  if (alerts.length === 0) return null;

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const okCount = alerts.filter(a => a.severity === 'ok').length;

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-rose-50',
          border: 'border-rose-200',
          text: 'text-rose-600',
          badge: 'bg-rose-100 text-rose-700',
          icon: AlertTriangle,
          label: 'ПРОСРОЧЕНО',
          progressBg: 'bg-rose-500',
          pulse: true,
        };
      case 'warning':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-600',
          badge: 'bg-amber-100 text-amber-700',
          icon: Clock,
          label: 'СКОРО',
          progressBg: 'bg-amber-500',
          pulse: false,
        };
      default:
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-600',
          badge: 'bg-emerald-100 text-emerald-700',
          icon: ShieldCheck,
          label: 'В НОРМЕ',
          progressBg: 'bg-emerald-500',
          pulse: false,
        };
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${
          hasUrgent 
            ? 'bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border border-rose-200/60 shadow-sm hover:shadow-md' 
            : 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60 shadow-sm hover:shadow-md'
        }`}
      >
        <div className="flex items-center gap-3">
          <motion.div 
            animate={hasUrgent ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              hasUrgent ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
            }`}
          >
            {hasUrgent ? <BellRing size={20} /> : <Bell size={20} />}
          </motion.div>
          <div>
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              Уведомления о ТО
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              {criticalCount > 0 && (
                <span className="text-[9px] font-black bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full uppercase">
                  {criticalCount} просрочено
                </span>
              )}
              {warningCount > 0 && (
                <span className="text-[9px] font-black bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full uppercase">
                  {warningCount} скоро
                </span>
              )}
              {okCount > 0 && (
                <span className="text-[9px] font-black bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full uppercase">
                  {okCount} в норме
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white/70 rounded-xl transition-all"
          >
            <Settings2 size={16} />
          </button>

          {/* Telegram send button */}
          {hasUrgent && tgId && tgId !== 'demo_user' && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); sendTelegramAlert(false); }}
              disabled={isSending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-tight shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              {isSending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Send size={12} />
              )}
              <span className="hidden sm:inline">В Telegram</span>
            </motion.button>
          )}

          <div className={`p-1.5 rounded-lg transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            <ChevronDown size={16} className="text-slate-400" />
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 size={16} className="text-indigo-600" />
                  <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">Настройки уведомлений</h5>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              </div>

              {/* Auto-notify toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-xs font-bold text-slate-900">Автоуведомления в Telegram</p>
                  <p className="text-[10px] text-slate-400">При открытии приложения (макс. раз в 24ч)</p>
                </div>
                <button
                  onClick={() => setSettings(s => ({ ...s, autoNotify: !s.autoNotify }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${settings.autoNotify ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                  <motion.div
                    animate={{ x: settings.autoNotify ? 24 : 2 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>

              {/* Threshold settings */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest">Предупреждение (км)</label>
                  <input
                    type="number"
                    value={settings.warningThresholdKm}
                    onChange={(e) => setSettings(s => ({ ...s, warningThresholdKm: Number(e.target.value) }))}
                    className="w-full bg-slate-50 border-none rounded-xl py-2.5 px-4 text-xs font-bold focus:ring-2 ring-amber-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest">Предупреждение (дни)</label>
                  <input
                    type="number"
                    value={settings.warningThresholdDays}
                    onChange={(e) => setSettings(s => ({ ...s, warningThresholdDays: Number(e.target.value) }))}
                    className="w-full bg-slate-50 border-none rounded-xl py-2.5 px-4 text-xs font-bold focus:ring-2 ring-amber-500 outline-none"
                  />
                </div>
              </div>

              {/* Server Cron Status Indicator */}
              {tgId && tgId !== 'demo_user' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Server size={12} className="text-slate-400" />
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Серверные уведомления (Cron)</span>
                  </div>
                  
                  <div className="bg-gradient-to-r from-slate-50 to-indigo-50/50 rounded-xl p-3 space-y-2 border border-slate-100">
                    {/* Registration status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {cronStatus?.isRegistered ? (
                          <Wifi size={10} className="text-emerald-500" />
                        ) : (
                          <WifiOff size={10} className="text-slate-400" />
                        )}
                        <span className="text-[10px] font-bold text-slate-700">
                          Регистрация в cron
                        </span>
                      </div>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                        cronStatus?.isRegistered 
                          ? 'bg-emerald-100 text-emerald-600' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {cronStatus?.isRegistered ? 'Активна' : 'Ожидание'}
                      </span>
                    </div>

                    {/* Settings sync status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {isSyncingSettings ? (
                          <RefreshCw size={10} className="text-indigo-500 animate-spin" />
                        ) : cronStatus?.serverSettingsSynced ? (
                          <Cloud size={10} className="text-indigo-500" />
                        ) : (
                          <CloudOff size={10} className="text-slate-400" />
                        )}
                        <span className="text-[10px] font-bold text-slate-700">
                          Настройки на сервере
                        </span>
                      </div>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                        isSyncingSettings
                          ? 'bg-indigo-100 text-indigo-600'
                          : cronStatus?.serverSettingsSynced 
                            ? 'bg-indigo-100 text-indigo-600' 
                            : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isSyncingSettings ? 'Синхр...' : cronStatus?.serverSettingsSynced ? 'Синхр.' : 'Не синхр.'}
                      </span>
                    </div>

                    {/* Cron configured */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {cronStatus?.cronConfigured ? (
                          <CheckCircle2 size={10} className="text-emerald-500" />
                        ) : (
                          <AlertTriangle size={10} className="text-amber-500" />
                        )}
                        <span className="text-[10px] font-bold text-slate-700">
                          Cron-сервис
                        </span>
                      </div>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                        cronStatus?.cronConfigured 
                          ? 'bg-emerald-100 text-emerald-600' 
                          : 'bg-amber-100 text-amber-600'
                      }`}>
                        {cronStatus?.cronConfigured ? 'Настроен' : 'Не настр.'}
                      </span>
                    </div>

                    {/* Last cron notification */}
                    {cronStatus?.lastCronNotif && (
                      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                        <Bell size={10} className="text-indigo-400" />
                        <span className="text-[10px] text-indigo-600 font-medium">
                          Посл. cron-уведомление: {new Date(cronStatus.lastCronNotif).toLocaleString('ru-RU')}
                        </span>
                      </div>
                    )}

                    {/* Info text */}
                    <p className="text-[9px] text-slate-400 leading-relaxed pt-1">
                      Сервер автоматически проверяет все авто и отправляет напоминания в Telegram каждые 24ч — даже без открытия приложения.
                    </p>
                  </div>
                </div>
              )}

              {lastSentAt && (
                <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded-xl">
                  <CheckCircle2 size={12} className="text-indigo-500" />
                  <p className="text-[10px] text-indigo-600 font-bold">
                    Последнее уведомление: {new Date(lastSentAt).toLocaleString('ru-RU')}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert Cards */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-3"
          >
            {alerts.map((alert, idx) => {
              const config = getSeverityConfig(alert.severity);
              const Icon = config.icon;

              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className={`${config.bg} border ${config.border} rounded-2xl p-4 relative overflow-hidden group transition-all hover:shadow-md`}
                >
                  {/* Pulse indicator for critical */}
                  {config.pulse && (
                    <motion.div
                      animate={{ opacity: [0.4, 0.8, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full"
                    />
                  )}

                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.badge}`}>
                      <Icon size={18} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="text-sm font-black text-slate-900 truncate">{alert.description}</h5>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${config.badge}`}>
                          {config.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                        <div className="flex items-center gap-1.5">
                          <Gauge size={10} className="text-slate-400" />
                          <span className={`text-xs font-bold ${alert.kmRemaining <= 0 ? 'text-rose-600' : config.text}`}>
                            {alert.kmRemaining <= 0 ? `Просрочено на ${Math.abs(alert.kmRemaining).toLocaleString()} км` : `${alert.kmRemaining.toLocaleString()} км`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={10} className="text-slate-400" />
                          <span className={`text-xs font-bold ${alert.daysRemaining <= 0 ? 'text-rose-600' : config.text}`}>
                            {alert.daysRemaining <= 0 ? `Просрочено на ${Math.abs(alert.daysRemaining)} дн.` : `${alert.daysRemaining} дн.`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Wrench size={10} className="text-slate-400" />
                          <span className="text-[10px] text-slate-500 font-medium">
                            до {alert.nextKm.toLocaleString()} км
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={10} className="text-slate-400" />
                          <span className="text-[10px] text-slate-500 font-medium">
                            до {alert.nextDate}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1">
                          <span>Ресурс</span>
                          <span>{Math.max(0, Math.round(alert.progress))}%</span>
                        </div>
                        <div className="h-1.5 bg-white/80 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(0, alert.progress)}%` }}
                            transition={{ duration: 1, delay: idx * 0.1 }}
                            className={`h-full rounded-full ${config.progressBg}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Summary footer */}
            {hasUrgent && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100"
              >
                <p className="text-[10px] text-slate-500 font-medium">
                  {criticalCount > 0 
                    ? `${criticalCount} работ(-а) просрочено. Рекомендуется обслуживание.`
                    : `${warningCount} работ(-а) подходят к сроку.`
                  }
                </p>
                {tgId && tgId !== 'demo_user' ? (
                  <button
                    onClick={() => sendTelegramAlert(false)}
                    disabled={isSending}
                    className="flex items-center gap-1 text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-tight disabled:opacity-50"
                  >
                    {isSending ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                    Отправить в бот
                  </button>
                ) : (
                  <span className="text-[9px] text-slate-400 font-medium flex items-center gap-1">
                    <BellOff size={10} />
                    Только через Telegram
                  </span>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
