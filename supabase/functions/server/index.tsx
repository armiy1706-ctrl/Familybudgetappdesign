import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1'
import * as https from "node:https"
import * as kv from "./kv_store.tsx"

const app = new Hono().basePath('/make-server-ac2bdc5c')

app.use('*', cors())
app.use('*', logger(console.log))

const GIGACHAT_CREDENTIALS = Deno.env.get('GIGACHAT_CREDENTIALS')
const ASKCODI_API_KEY = Deno.env.get('ASKCODI_API_KEY')
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

// --- Utility for Secure Requests (Bypassing SSL for Sber) ---
async function secureRequest(url: string, options: any, body?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const isSber = url.includes('sberbank.ru');
    const requestOptions = {
      ...options,
      rejectUnauthorized: isSber ? false : true,
    };

    const req = https.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`API Error: ${res.statusCode} - ${JSON.stringify(parsed)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (body) req.write(body);
    req.end();
  });
}

// --- Providers Logic ---

async function getGigaChatToken() {
  const rqId = crypto.randomUUID();
  const data = await secureRequest('https://gigachat.devices.sberbank.ru/api/v2/oauth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'RqUID': rqId,
      'Authorization': `Basic ${GIGACHAT_CREDENTIALS}`
    }
  }, 'scope=GIGACHAT_API_PERS');
  return data.access_token;
}

async function callGigaChat(prompt: string, text: string) {
  const token = await getGigaChatToken();
  const response = await secureRequest('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, JSON.stringify({
    model: 'GigaChat',
    messages: [{ role: 'system', content: prompt }, { role: 'user', content: text }],
    temperature: 0.7
  }));
  return response.choices[0].message.content;
}

async function callAskCodi(prompt: string, text: string) {
  const response = await fetch('https://api.askcodi.com/v1/ask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `${ASKCODI_API_KEY}`
    },
    body: JSON.stringify({
      prompt: `${prompt}\n\nПользователь: ${text}`,
      model: 'gpt-3.5-turbo',
    })
  });
  const data = await response.json();
  return data.response || data.message || JSON.stringify(data);
}

async function callOpenAI(prompt: string, text: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: prompt }, { role: 'user', content: text }],
    })
  });
  const data = await response.json();
  return data.choices[0].message.content;
}

// --- Routes ---

app.post('/diagnose', async (c) => {
  const { text, carInfo, provider = 'gigachat' } = await c.req.json();
  
  const systemPrompt = `Ты — профессиональный автомеханик. Проанализируй симптомы и выдай результат.
  ИНФОРМАЦИЯ ОБ АВТО:
  Марка/Модель: ${carInfo?.make} ${carInfo?.model}
  VIN: ${carInfo?.vin}
  Пробег: ${carInfo?.mileage} км
  
  ОТВЕТЬ СТРОГО В JSON:
  {
    "message": "Твой подробный ответ с эмодзи",
    "results": [{"diagnosis": "Суть проблемы", "confidence": 0.9, "estimatedCost": "Цена"}]
  }`;

  let content = '';
  try {
    if (provider === 'askcodi' && ASKCODI_API_KEY) {
      content = await callAskCodi(systemPrompt, text);
    } else if (provider === 'openai' && OPENAI_API_KEY) {
      content = await callOpenAI(systemPrompt, text);
    } else {
      content = await callGigaChat(systemPrompt, text);
    }
  } catch (err) {
    console.error(`Error with ${provider}:`, err.message);
    if (OPENAI_API_KEY) {
      content = await callOpenAI(systemPrompt, text);
    } else {
      return c.json({ error: err.message }, 500);
    }
  }

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: content, results: [] };
  return c.json(result);
})

app.get('/user-data', async (c) => {
  const tgId = c.req.query('tgId');
  if (!tgId) return c.json({ error: 'Missing tgId' }, 400);
  
  const cars = await kv.get(`cars_${tgId}`) || [];
  const profile = await kv.get(`profile_${tgId}`) || null;
  return c.json({ cars, profile });
})

app.post('/save-cars', async (c) => {
  const { tgId, cars } = await c.req.json();
  if (tgId) await kv.set(`cars_${tgId}`, cars);
  return c.json({ success: true });
})

app.post('/telegram-auth', async (c) => {
  const { initData } = await c.req.json();
  const params = new URLSearchParams(initData);
  const tgUser = JSON.parse(params.get('user') || '{}');
  
  if (!tgUser.id) return c.json({ error: 'Invalid TG user' }, 400);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const email = `tg_${tgUser.id}@autoai.app`;
  const password = `pass_${tgUser.id}_secure`;

  const { data: userList } = await supabase.auth.admin.listUsers();
  if (!userList?.users.find(u => u.email === email)) {
    await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { telegram_id: tgUser.id.toString(), full_name: tgUser.first_name },
      email_confirm: true
    });
  }
  return c.json({ email, password });
})

// Catch-all for debugging
app.all('*', (c) => {
  console.log(`404 Not Found: ${c.req.method} ${c.req.url}`);
  return c.json({ error: 'Not Found', path: c.req.url, method: c.req.method }, 404);
})

Deno.serve(app.fetch)
