import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from 'npm:@supabase/supabase-js'
import * as kv from './kv_store.tsx'

const app = new Hono()

app.use('*', logger(console.log))
app.use('*', cors())

const BASE_PATH = '/make-server-ac2bdc5c'

// Helper to verify Telegram Mini App initData
async function verifyTelegramHash(initData: string, botToken: string): Promise<boolean> {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');

  const params = Array.from(urlParams.entries())
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');

  const encoder = new TextEncoder();
  const secretKeyData = await crypto.subtle.importKey(
    'raw',
    encoder.encode('WebAppData'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const secretKey = await crypto.subtle.sign(
    'HMAC',
    secretKeyData,
    encoder.encode(botToken)
  );

  const signatureKeyData = await crypto.subtle.importKey(
    'raw',
    secretKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    signatureKeyData,
    encoder.encode(params)
  );

  const hexSignature = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return hexSignature === hash;
}

// Route for automatic Telegram Auth
app.post(`${BASE_PATH}/telegram-auth`, async (c) => {
  try {
    const { initData } = await c.req.json();
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');

    if (!botToken) {
      return c.json({ error: 'Server configuration error: Token missing' }, 500);
    }

    const isValid = await verifyTelegramHash(initData, botToken);
    if (!isValid) {
      return c.json({ error: 'Invalid authentication data' }, 401);
    }

    const urlParams = new URLSearchParams(initData);
    const userStr = urlParams.get('user');
    if (!userStr) return c.json({ error: 'User data missing' }, 400);
    
    const tgUser = JSON.parse(userStr);
    const userId = tgUser.id;
    const email = `tg_${userId}@autoai.local`;
    const password = `tg_pass_${userId}_${botToken.slice(0, 10)}`;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Create user if not exists (ignore error if already exists)
    await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { 
        full_name: `${tgUser.first_name} ${tgUser.last_name || ''}`.trim(),
        telegram_id: userId,
        username: tgUser.username
      },
      email_confirm: true
    }).catch(() => {});

    return c.json({ email, password });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// NEW: Route for Demo/Dev Login (bypass for testing)
app.post(`${BASE_PATH}/demo-auth`, async (c) => {
  try {
    const email = 'demo@autoai.local';
    const password = 'demo-password-autoai-2026';

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Ensure demo user exists
    await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { 
        full_name: 'Демо Пользователь',
        is_demo: true
      },
      email_confirm: true
    }).catch(() => {
      // User likely exists, that's fine
    });

    return c.json({ email, password });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Mock AI Knowledge Base for Diagnostic Engine
const DIAGNOSTIC_DATABASE = [
  {
    keywords: ['аккумулятор', 'стартер', 'не заводится', 'щелчки', 'батарея'],
    diagnosis: 'Проблема с системой пуска / Аккумулятор',
    confidence: 0.92,
    description: 'Вероятно, низкий заряд аккумулятора или окисление клемм. Также возможна неисправность стартера.',
    risk: 'Высокий (Риск застрять в пути)',
    estimatedCost: '5,000 - 15,000 ₽',
    time: '30 - 60 мин',
    urgency: 'Срочно'
  },
  {
    keywords: ['чек', 'p0171', 'p0174', 'бедная смесь', 'троит', 'расход'],
    diagnosis: 'Подсос воздуха / Датчик MAF',
    confidence: 0.85,
    description: 'Система сообщает о слишком бедной топливно-воздушной смеси. Возможен подсос воздуха после фильтра или загрязнение датчика массового расхода воздуха.',
    risk: 'Средний (Повышенный расход, износ двигателя)',
    estimatedCost: '3,000 - 8,000 ₽',
    time: '1 - 2 часа',
    urgency: 'В течение недели'
  }
];

app.post(`${BASE_PATH}/diagnose`, async (c) => {
  const { text, dtcCodes } = await c.req.json();
  const results = DIAGNOSTIC_DATABASE.filter(item => {
    return item.keywords.some(kw => text?.toLowerCase().includes(kw));
  });
  return c.json({ results });
});

app.get(`${BASE_PATH}/health-report/:vin`, async (c) => {
  const vin = c.req.param('vin');
  const healthData = await kv.get(`health_${vin}`) || { score: 100, lastCheck: new Date() };
  return c.json(healthData);
});

app.post(`${BASE_PATH}/update-health`, async (c) => {
  const { vin, score, issues } = await c.req.json();
  await kv.set(`health_${vin}`, { score, lastCheck: new Date(), issues });
  return c.json({ success: true });
});

Deno.serve(app.fetch)
