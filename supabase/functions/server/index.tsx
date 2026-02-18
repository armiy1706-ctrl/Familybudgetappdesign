import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"
import * as kv from "./kv_store.tsx"

const app = new Hono().basePath('/make-server-ac2bdc5c')

// Middleware
app.use('*', logger(console.log))
app.use('*', cors({
  origin: '*',
  allowHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type', 'x-cron-secret'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
}))

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

// --- Notification defaults & helpers ---
interface ServerNotificationSettings {
  autoNotify: boolean;
  warningThresholdKm: number;
  warningThresholdDays: number;
  criticalThresholdKm: number;
  criticalThresholdDays: number;
}

const DEFAULT_NOTIFICATION_SETTINGS: ServerNotificationSettings = {
  autoNotify: true,
  warningThresholdKm: 1500,
  warningThresholdDays: 30,
  criticalThresholdKm: 0,
  criticalThresholdDays: 0,
};

async function registerUser(tgId: string) {
  if (!tgId || tgId === 'demo_user' || isNaN(Number(tgId))) return;
  try {
    const registry: string[] = (await kv.get('user_registry')) || [];
    if (!registry.includes(tgId)) {
      registry.push(tgId);
      await kv.set('user_registry', registry);
      console.log(`Registered user ${tgId} for cron notifications. Total users: ${registry.length}`);
    }
  } catch (e) {
    console.log('Failed to register user in registry:', e);
  }
}

function calculateServerAlerts(
  maintenanceRecords: any[],
  currentOdometer: number,
  settings: ServerNotificationSettings
) {
  if (!maintenanceRecords || maintenanceRecords.length === 0) return [];

  const latestByType = new Map<string, any>();
  for (const record of maintenanceRecords) {
    const key = record.description || 'TO';
    const existing = latestByType.get(key);
    if (!existing || new Date(record.date) > new Date(existing.date)) {
      latestByType.set(key, record);
    }
  }

  const alerts: any[] = [];

  latestByType.forEach((record) => {
    const intervalKm = Number(record.intervalKm) || 10000;
    const intervalMonths = Number(record.intervalMonths) || 12;
    const nextKm = (Number(record.mileage) || 0) + intervalKm;
    const nextDate = new Date(record.date);
    nextDate.setMonth(nextDate.getMonth() + intervalMonths);

    const kmRemaining = nextKm - currentOdometer;
    const daysRemaining = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    let severity = 'ok';
    if (kmRemaining <= settings.criticalThresholdKm || daysRemaining <= settings.criticalThresholdDays) {
      severity = 'critical';
    } else if (kmRemaining <= settings.warningThresholdKm || daysRemaining <= settings.warningThresholdDays) {
      severity = 'warning';
    }

    if (severity === 'critical' || severity === 'warning') {
      alerts.push({
        description: record.description || 'Плановое ТО',
        severity,
        kmRemaining,
        daysRemaining,
        nextKm,
        nextDate: nextDate.toLocaleDateString('ru-RU'),
      });
    }
  });

  alerts.sort((a: any, b: any) => {
    const order: Record<string, number> = { critical: 0, warning: 1, ok: 2 };
    return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
  });

  return alerts;
}

function formatCronAlertMessage(carName: string, alerts: any[]) {
  const severityEmoji: Record<string, string> = { critical: '🔴', warning: '🟡', ok: '🟢' };
  const severityLabel: Record<string, string> = { critical: 'ПРОСРОЧЕНО', warning: 'СКОРО', ok: 'В НОРМЕ' };

  let text = `🔧 <b>AutoAI — Напоминание о ТО</b>\n`;
  text += `🚗 <b>${carName}</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  for (const alert of alerts) {
    const emoji = severityEmoji[alert.severity] || '⚪';
    const label = severityLabel[alert.severity] || alert.severity;

    text += `${emoji} <b>${alert.description}</b>  [${label}]\n`;

    if (alert.kmRemaining <= 0) {
      text += `   ⚠️ Просрочено на <b>${Math.abs(alert.kmRemaining).toLocaleString('ru-RU')}</b> км\n`;
    } else {
      text += `   📏 Осталось: <b>${alert.kmRemaining.toLocaleString('ru-RU')}</b> км\n`;
    }

    if (alert.daysRemaining <= 0) {
      text += `   ⚠️ Просрочено на <b>${Math.abs(alert.daysRemaining)}</b> дн.\n`;
    } else {
      text += `   📅 Осталось: <b>${alert.daysRemaining}</b> дн.\n`;
    }

    text += `   🗓 Плановая дата: ${alert.nextDate}\n`;
    text += `   🛣 Плановый пробег: ${alert.nextKm?.toLocaleString('ru-RU')} км\n\n`;
  }

  const critCount = alerts.filter((a: any) => a.severity === 'critical').length;
  const warnCount = alerts.filter((a: any) => a.severity === 'warning').length;

  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  if (critCount > 0) text += `🔴 <b>${critCount}</b> просрочено  `;
  if (warnCount > 0) text += `🟡 <b>${warnCount}</b> скоро`;
  text += `\n\n⏰ <i>Автоматическое напоминание (серверный cron, раз в 24ч)</i>`;
  text += `\n💡 <i>Откройте AutoAI для подробностей и записи на сервис.</i>`;

  return text;
}

async function callOpenAI(prompt: string, text: string, imageBase64?: string) {
  if (!OPENAI_API_KEY) throw new Error("OpenAI API Key missing");
  
  const messages: any[] = [{ role: 'system', content: prompt }];
  
  if (imageBase64) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: text || "Проанализируй это изображение автомобиля на наличие неисправностей." },
        { type: 'image_url', image_url: { url: imageBase64 } }
      ]
    });
  } else {
    messages.push({ role: 'user', content: text });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
      })
    });
    
    if (response.status === 429) {
      throw new Error("OpenAI Quota Exceeded: Пожалуйста, проверьте баланс вашего аккаунта OpenAI или используйте другой ключ.");
    }

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Нет ответа от ИИ";
  } catch (error) {
    console.error("OpenAI call failed:", error);
    throw error;
  }
}

// Routes
app.post('/diagnose', async (c) => {
  try {
    const body = await c.req.json();
    const { text, carInfo, image } = body;

    const systemPrompt = `Ты — профессиональный ИИ-автомеханик. ${image ? 'Проанализируй приложенное изображение и текст.' : 'Проанализируй симптомы.'} Выдай подробный ответ на русском языке.
    В конце ответа ОБЯЗАТЕЛЬНО добавь JSON блок в ОДНУ СТРОКУ:
    {"results": [{"diagnosis": "название", "confidence": 0.9, "description": "описание", "risk": "Средний", "urgency": "Планово", "estimatedCost": "1000 руб"}]}
    
    Авто: ${carInfo?.make || 'Неизвестно'} ${carInfo?.model || ''}. Пробег: ${carInfo?.mileage || 0} км.`;

    const content = await callOpenAI(systemPrompt, text, image);

    let results = [];
    let message = content;

    const allMatches = content.match(/\{[\s\S]*?\}/g);
    if (allMatches) {
      for (let i = allMatches.length - 1; i >= 0; i--) {
        try {
          const parsed = JSON.parse(allMatches[i]);
          if (parsed.results || parsed.diagnosis) {
            results = parsed.results || [parsed];
            message = content.replace(allMatches[i], '').trim();
            break;
          }
        } catch { }
      }
    }

    return c.json({ message: message || "Анализ завершен.", results });
  } catch (error) {
    console.error("Diagnose Route Error:", error);
    // Return a structured error response that the frontend can display nicely
    return c.json({ 
      error: "Ошибка ИИ-диагностики", 
      details: error.message,
      isQuotaError: error.message.includes("Quota Exceeded")
    }, 500);
  }
})

app.get('/user-data', async (c) => {
  try {
    const tgId = c.req.query('tgId');
    if (!tgId) return c.json({ error: 'Missing tgId' }, 400);
    const cars = await kv.get(`cars_${tgId}`) || [];
    return c.json({ cars });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
})

app.post('/save-cars', async (c) => {
  try {
    const { tgId, cars } = await c.req.json();
    if (tgId) {
      await kv.set(`cars_${tgId}`, cars);
      // Register user for cron notifications
      await registerUser(tgId);
    }
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
})

app.post('/telegram-auth', async (c) => {
  try {
    const { initData } = await c.req.json();
    if (!initData) return c.json({ error: 'No initData' }, 400);
    
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    if (!userStr) return c.json({ error: 'No user in initData' }, 400);
    
    const tgUser = JSON.parse(userStr);
    const email = `tg_${tgUser.id}@autoai.app`;
    const password = `pass_${tgUser.id}_secure`;

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: userList } = await supabase.auth.admin.listUsers();
    
    if (!userList?.users.find(u => u.email === email)) {
      await supabase.auth.admin.createUser({
        email, password,
        user_metadata: { telegram_id: tgUser.id.toString(), full_name: tgUser.first_name },
        email_confirm: true
      });
    }

    // Register user for cron notifications
    await registerUser(tgUser.id.toString());

    return c.json({ email, password });
  } catch (error) {
    console.error("Telegram Auth Error:", error);
    return c.json({ error: error.message }, 500);
  }
})

app.post('/demo-auth', async (c) => {
  try {
    const email = 'demo@autoai.app';
    const password = 'demo-password-123';

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: userList } = await supabase.auth.admin.listUsers();
    
    if (!userList?.users.find(u => u.email === email)) {
      await supabase.auth.admin.createUser({
        email, password,
        user_metadata: { telegram_id: 'demo_user', full_name: 'Demo User' },
        email_confirm: true
      });
    }
    return c.json({ email, password });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
})

app.post('/ocr-receipt', async (c) => {
  try {
    const { image } = await c.req.json();
    if (!image) return c.json({ error: 'No image provided' }, 400);

    const systemPrompt = `Ты — специалист по распознаванию чеков. Проанализируй изображение чека и извлеки общую сумму (Total) и дату.
    Если дата не найдена, используй текущую: ${new Date().toISOString().split('T')[0]}.
    Ответ выдай СТРОГО в формате JSON: {"amount": 1234.50, "date": "YYYY-MM-DD"}.
    Только JSON, без лишнего текста.`;

    const content = await callOpenAI(systemPrompt, "Просканируй этот чек.", image);
    
    try {
      const jsonStr = content.replace(/```json|```/g, '').trim();
      const result = JSON.parse(jsonStr);
      return c.json(result);
    } catch (parseError) {
      console.error("OCR JSON Parse Error:", parseError, content);
      return c.json({ error: "Failed to parse OCR results" }, 500);
    }
  } catch (error) {
    console.error("OCR Route Error:", error);
    return c.json({ 
      error: "Ошибка сканирования чека", 
      details: error.message,
      isQuotaError: error.message.includes("Quota Exceeded")
    }, 500);
  }
})

app.post('/send-report', async (c) => {
  try {
    const { tgId, pdfBase64, fileName } = await c.req.json();
    if (!tgId || !pdfBase64) return c.json({ error: 'Missing data' }, 400);

    // Better validation for chat_id
    if (tgId === 'demo_user' || isNaN(Number(tgId))) {
      return c.json({ 
        error: 'Invalid Telegram ID', 
        details: 'Отправка отчетов доступна только при запуске через Telegram. В демо-режиме используйте кнопку "Скачать на устройство".' 
      }, 400);
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) return c.json({ error: 'Bot token not configured' }, 500);

    // Clean base64 string
    const base64Data = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
    
    // Use a more robust decoding method
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });

    const formData = new FormData();
    formData.append('chat_id', tgId);
    formData.append('document', blob, fileName || 'AutoAI_Report.pdf');
    formData.append('caption', '📄 Ваш полный отчет об обслуживании автомобиля от AutoAI.');

    console.log(`Sending report to TG ID: ${tgId}, size: ${bytes.length} bytes`);

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: 'POST',
      body: formData
    });

    const tgData = await tgRes.json();
    if (!tgRes.ok) {
      console.error("Telegram API Error:", tgData);
      return c.json({ error: 'Telegram API Error', details: tgData.description || 'Unknown error' }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Send Report Error:", error);
    return c.json({ error: 'Internal Server Error', details: error.message }, 500);
  }
})

// --- Maintenance Alert Notifications ---
app.post('/send-maintenance-alert', async (c) => {
  try {
    const { tgId, carName, alerts } = await c.req.json();
    if (!tgId || !alerts || alerts.length === 0) {
      return c.json({ error: 'Missing data', details: 'tgId and alerts are required' }, 400);
    }

    if (tgId === 'demo_user' || isNaN(Number(tgId))) {
      return c.json({
        error: 'Invalid Telegram ID',
        details: 'Уведомления доступны только при запуске через Telegram. В демо-режиме функция отключена.'
      }, 400);
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) return c.json({ error: 'Bot token not configured' }, 500);

    const severityEmoji: Record<string, string> = {
      critical: '🔴',
      warning: '🟡',
      ok: '🟢'
    };

    const severityLabel: Record<string, string> = {
      critical: 'ПРОСРОЧЕНО',
      warning: 'СКОРО',
      ok: 'В НОРМЕ'
    };

    let text = `���� <b>AutoAI — Уведомление о ТО</b>\n`;
    text += `🚗 <b>${carName || 'Автомобиль'}</b>\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    for (const alert of alerts) {
      const emoji = severityEmoji[alert.severity] || '⚪';
      const label = severityLabel[alert.severity] || alert.severity;

      text += `${emoji} <b>${alert.description}</b>  [${label}]\n`;

      if (alert.kmRemaining <= 0) {
        text += `   ⚠️ Просрочено на <b>${Math.abs(alert.kmRemaining).toLocaleString('ru-RU')}</b> км\n`;
      } else {
        text += `   📏 Осталось: <b>${alert.kmRemaining.toLocaleString('ru-RU')}</b> км\n`;
      }

      if (alert.daysRemaining <= 0) {
        text += `   ⚠️ Просрочено на <b>${Math.abs(alert.daysRemaining)}</b> дн.\n`;
      } else {
        text += `   📅 Осталось: <b>${alert.daysRemaining}</b> дн.\n`;
      }

      text += `   🗓 Плановая дата: ${alert.nextDate}\n`;
      text += `   🛣 Плановый пробег: ${alert.nextKm?.toLocaleString('ru-RU')} км\n\n`;
    }

    const critCount = alerts.filter((a: any) => a.severity === 'critical').length;
    const warnCount = alerts.filter((a: any) => a.severity === 'warning').length;

    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    if (critCount > 0) {
      text += `🔴 <b>${critCount}</b> просрочено  `;
    }
    if (warnCount > 0) {
      text += `🟡 <b>${warnCount}</b> скоро`;
    }
    text += `\n\n💡 <i>Откройте AutoAI для подробностей и записи на сервис.</i>`;

    console.log(`Sending maintenance alert to TG ID: ${tgId}, alerts: ${alerts.length}`);

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: tgId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    const tgData = await tgRes.json();
    if (!tgRes.ok) {
      console.error("Telegram API Error (maintenance alert):", tgData);
      return c.json({ error: 'Telegram API Error', details: tgData.description || 'Unknown error' }, 500);
    }

    return c.json({ success: true, messageId: tgData.result?.message_id });
  } catch (error) {
    console.error("Send Maintenance Alert Error:", error);
    return c.json({ error: 'Internal Server Error', details: error.message }, 500);
  }
})

app.post('/mark-notification-sent', async (c) => {
  try {
    const { tgId, carId } = await c.req.json();
    if (!tgId || !carId) return c.json({ error: 'Missing tgId or carId' }, 400);

    const key = `notif_sent_${tgId}_${carId}`;
    await kv.set(key, { sentAt: new Date().toISOString(), tgId, carId });

    return c.json({ success: true });
  } catch (error) {
    console.error("Mark notification sent error:", error);
    return c.json({ error: error.message }, 500);
  }
})

// --- Notification Settings Sync ---
app.post('/save-notification-settings', async (c) => {
  try {
    const { tgId, settings } = await c.req.json();
    if (!tgId) return c.json({ error: 'Missing tgId' }, 400);
    if (tgId === 'demo_user') return c.json({ success: true, demo: true });

    await kv.set(`notif_settings_${tgId}`, settings);
    console.log(`Saved notification settings for user ${tgId}:`, JSON.stringify(settings));
    return c.json({ success: true });
  } catch (error) {
    console.error("Save notification settings error:", error);
    return c.json({ error: error.message }, 500);
  }
})

app.get('/get-notification-settings', async (c) => {
  try {
    const tgId = c.req.query('tgId');
    if (!tgId) return c.json({ error: 'Missing tgId' }, 400);

    const settings = await kv.get(`notif_settings_${tgId}`);
    return c.json({ settings: settings || null });
  } catch (error) {
    console.error("Get notification settings error:", error);
    return c.json({ error: error.message }, 500);
  }
})

// --- Server Cron: Maintenance Check ---
async function handleCronMaintenanceCheck(c: any) {
  const startTime = Date.now();

  // Verify secret via header or query param (for cron services that only support GET with params)
  const cronSecret = c.req.header('X-Cron-Secret') || c.req.query('secret');
  const expectedSecret = Deno.env.get('CRON_SECRET');

  if (!expectedSecret) {
    console.log('CRON_SECRET not configured. Cron endpoint disabled.');
    return c.json({ error: 'CRON_SECRET not configured on server' }, 500);
  }

  if (cronSecret !== expectedSecret) {
    console.log('Cron auth failed: invalid or missing secret');
    return c.json({ error: 'Unauthorized: invalid or missing X-Cron-Secret' }, 401);
  }

  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  if (!botToken) {
    return c.json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, 500);
  }

  console.log('=== CRON: Starting maintenance check ===');

  const registry: string[] = (await kv.get('user_registry')) || [];
  console.log(`CRON: Found ${registry.length} registered users`);

  let totalSent = 0;
  let totalCarsChecked = 0;
  let totalAlertsFound = 0;
  let skippedCooldown = 0;
  const errors: string[] = [];

  for (const tgId of registry) {
    try {
      // Skip invalid/demo users
      if (!tgId || tgId === 'demo_user' || isNaN(Number(tgId))) continue;

      const cars: any[] = (await kv.get(`cars_${tgId}`)) || [];
      if (cars.length === 0) continue;

      // Get user notification settings (or use defaults)
      const userSettings: ServerNotificationSettings =
        (await kv.get(`notif_settings_${tgId}`)) || DEFAULT_NOTIFICATION_SETTINGS;

      // If user disabled auto-notify, skip
      if (!userSettings.autoNotify) {
        console.log(`CRON: User ${tgId} has autoNotify disabled, skipping`);
        continue;
      }

      for (const car of cars) {
        totalCarsChecked++;
        const carId = car.id;
        if (!carId) continue;

        const dashboardData = car.dashboardData || {};
        const currentOdometer = Number(dashboardData.currentOdometer) || Number(car.mileage) || 0;
        const maintenanceRecords = dashboardData.maintenanceRecords || [];

        if (maintenanceRecords.length === 0) continue;

        // Check cooldown: max 1 notification per 24h per car
        const cooldownKey = `cron_notif_${tgId}_${carId}`;
        const lastSent: any = await kv.get(cooldownKey);
        if (lastSent?.sentAt) {
          const hoursSince = (Date.now() - new Date(lastSent.sentAt).getTime()) / (1000 * 60 * 60);
          if (hoursSince < 24) {
            skippedCooldown++;
            continue;
          }
        }

        // Calculate alerts server-side
        const alerts = calculateServerAlerts(maintenanceRecords, currentOdometer, userSettings);
        totalAlertsFound += alerts.length;

        if (alerts.length === 0) continue;

        // Format message
        const carName = `${car.make || ''} ${car.model || ''}`.trim() || 'Автомобиль';
        const text = formatCronAlertMessage(carName, alerts);

        // Send via Telegram Bot API
        console.log(`CRON: Sending ${alerts.length} alerts to ${tgId} for car ${carId} (${carName})`);

        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: tgId,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true
          })
        });

        if (tgRes.ok) {
          totalSent++;
          // Record cooldown timestamp
          await kv.set(cooldownKey, { sentAt: new Date().toISOString() });
          // Also update the frontend-compatible key
          await kv.set(`notif_sent_${tgId}_${carId}`, { sentAt: new Date().toISOString(), tgId, carId });
        } else {
          const errData = await tgRes.json();
          const errMsg = `TG ${tgId}/${carId}: ${errData.description || 'Unknown error'}`;
          console.log(`CRON ERROR: ${errMsg}`);
          errors.push(errMsg);
        }

        // Rate limiting: 50ms between Telegram API calls
        await new Promise(r => setTimeout(r, 50));
      }
    } catch (err: any) {
      const errMsg = `User ${tgId}: ${err.message}`;
      console.log(`CRON ERROR: ${errMsg}`);
      errors.push(errMsg);
    }
  }

  const elapsed = Date.now() - startTime;
  const summary = {
    success: true,
    timestamp: new Date().toISOString(),
    elapsedMs: elapsed,
    stats: {
      usersInRegistry: registry.length,
      carsChecked: totalCarsChecked,
      alertsFound: totalAlertsFound,
      notificationsSent: totalSent,
      skippedCooldown,
      errors: errors.length,
      errorDetails: errors.slice(0, 20)
    }
  };

  console.log(`=== CRON: Completed in ${elapsed}ms. Sent: ${totalSent}, Errors: ${errors.length} ===`);
  return c.json(summary);
}

// Support both GET and POST for cron services compatibility
app.get('/cron-maintenance-check', handleCronMaintenanceCheck);
app.post('/cron-maintenance-check', handleCronMaintenanceCheck);

// --- Cron Status (for frontend indicator) ---
app.get('/cron-status', async (c) => {
  try {
    const tgId = c.req.query('tgId');
    if (!tgId) return c.json({ error: 'Missing tgId' }, 400);

    const registry: string[] = (await kv.get('user_registry')) || [];
    const isRegistered = registry.includes(tgId);
    const settings: any = (await kv.get(`notif_settings_${tgId}`)) || null;
    const cronConfigured = !!Deno.env.get('CRON_SECRET');

    // Get last cron notification times for user's cars
    const cars: any[] = (await kv.get(`cars_${tgId}`)) || [];
    const lastCronNotifs: Record<string, string> = {};
    for (const car of cars) {
      if (!car.id) continue;
      const data: any = await kv.get(`cron_notif_${tgId}_${car.id}`);
      if (data?.sentAt) {
        lastCronNotifs[car.id] = data.sentAt;
      }
    }

    return c.json({
      isRegistered,
      cronConfigured,
      serverSettingsSynced: !!settings,
      settings: settings || null,
      lastCronNotifications: lastCronNotifs,
      totalUsersInRegistry: registry.length
    });
  } catch (error) {
    console.error("Cron status error:", error);
    return c.json({ error: error.message }, 500);
  }
})

// --- Debug: Cron connectivity test (no auth required) ---
app.get('/cron-ping', async (c) => {
  const cronSecret = c.req.header('X-Cron-Secret') || c.req.query('secret') || '(not provided)';
  const expectedSecret = Deno.env.get('CRON_SECRET');
  const authHeader = c.req.header('Authorization') || '(not provided)';

  // Mask secrets for safe logging
  const maskSecret = (s: string) => s.length > 4 ? s.substring(0, 4) + '***' : '***';

  const diagnostics = {
    message: 'Cron ping OK — request reached the server',
    timestamp: new Date().toISOString(),
    checks: {
      supabaseGateway: 'PASSED (if you see this, Authorization header is correct)',
      cronSecretConfigured: !!expectedSecret,
      cronSecretProvided: cronSecret !== '(not provided)',
      cronSecretMatch: cronSecret === expectedSecret,
      authHeaderPresent: authHeader !== '(not provided)',
      authHeaderPreview: authHeader !== '(not provided)' ? authHeader.substring(0, 20) + '...' : '(not provided)',
      cronSecretPreview: cronSecret !== '(not provided)' ? maskSecret(cronSecret) : '(not provided)',
      expectedSecretPreview: expectedSecret ? maskSecret(expectedSecret) : '(not configured)',
    }
  };

  console.log('CRON-PING diagnostics:', JSON.stringify(diagnostics));
  return c.json(diagnostics);
});

Deno.serve(app.fetch)
