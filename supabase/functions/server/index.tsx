import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"
import * as https from "node:https"
import * as kv from "./kv_store.tsx"

const app = new Hono().basePath('/make-server-ac2bdc5c')

// Middleware
app.use('*', logger(console.log))
app.use('*', cors({
  origin: '*',
  allowHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
}))

const GIGACHAT_CREDENTIALS = Deno.env.get('GIGACHAT_CREDENTIALS')
const ASKCODI_API_KEY = Deno.env.get('ASKCODI_API_KEY')
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

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
        if (res.statusCode && res.statusCode >= 400) {
          console.error(`API Error: ${res.statusCode} from ${url}. Body: ${data}`);
          reject(new Error(`API Error: ${res.statusCode}`));
          return;
        }
        
        try {
          // Check if data is empty
          if (!data.trim()) {
            resolve({});
            return;
          }
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          // If not JSON, return as string but wrap in object to be safe for callGigaChat logic
          resolve({ raw: data });
        }
      });
    });

    req.on('error', (e) => {
      console.error(`Network Error (${url}):`, e);
      reject(e);
    });
    if (body) req.write(body);
    req.end();
  });
}

// --- AI Callers ---
async function callGigaChat(prompt: string, text: string) {
  if (!GIGACHAT_CREDENTIALS) throw new Error("GigaChat credentials missing");
  
  const rqId = crypto.randomUUID();
  const tokenData = await secureRequest('https://gigachat.devices.sberbank.ru/api/v2/oauth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'RqUID': rqId,
      'Authorization': `Basic ${GIGACHAT_CREDENTIALS}`
    }
  }, 'scope=GIGACHAT_API_PERS');
  
  const token = tokenData.access_token;
  if (!token) throw new Error("Failed to authenticate with GigaChat");

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
  
  return response.choices?.[0]?.message?.content || response.raw || "Нет ответа";
}

async function callAskCodi(prompt: string, text: string) {
  if (!ASKCODI_API_KEY) throw new Error("AskCodi API Key missing");
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
  return data.response || data.message || "Ошибка AskCodi";
}

async function callOpenAI(prompt: string, text: string) {
  if (!OPENAI_API_KEY) throw new Error("OpenAI API Key missing");
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
  return data.choices?.[0]?.message?.content || "Нет ответа";
}

// Routes
app.post('/diagnose', async (c) => {
  try {
    const body = await c.req.json();
    const { text, carInfo, provider = 'gigachat' } = body;

    const systemPrompt = `Ты — профессиональный ИИ-автомеханик. Проанализируй симптомы и выдай подробный ответ.
    В конце ответа ОБЯЗАТЕЛЬНО добавь JSON блок в ОДНУ СТРОКУ:
    {"results": [{"diagnosis": "название", "confidence": 0.9, "description": "описание", "risk": "Средний", "urgency": "Планово", "estimatedCost": "1000 руб"}]}
    
    Авто: ${carInfo?.make} ${carInfo?.model}. Пробег: ${carInfo?.mileage} км.`;

    let content = '';
    if (provider === 'askcodi') content = await callAskCodi(systemPrompt, text);
    else if (provider === 'openai') content = await callOpenAI(systemPrompt, text);
    else content = await callGigaChat(systemPrompt, text);

    let results = [];
    let message = content;

    // More robust extraction: find the LAST valid JSON object in the string
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
        } catch {
          // Continue to previous match if this one is not valid JSON
        }
      }
    }

    return c.json({ message: message || "Анализ завершен.", results });
  } catch (error) {
    console.error("Diagnose Route Error:", error);
    return c.json({ error: "Ошибка обработки запроса: " + error.message }, 500);
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
    if (tgId) await kv.set(`cars_${tgId}`, cars);
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
    return c.json({ email, password });
  } catch (error) {
    console.error("Telegram Auth Error:", error);
    return c.json({ error: error.message }, 500);
  }
})

Deno.serve(app.fetch)
