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
  allowHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
}))

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

async function callOpenAI(prompt: string, text: string) {
  if (!OPENAI_API_KEY) throw new Error("OpenAI API Key missing");
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Try a cheaper/more available model first or as fallback
        messages: [{ role: 'system', content: prompt }, { role: 'user', content: text }],
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
    const { text, carInfo } = body;

    const systemPrompt = `Ты — профессиональный ИИ-автомеханик. Проанализируй симптомы и выдай подробный ответ на русском языке.
    В конце ответа ОБЯЗАТЕЛЬНО добавь JSON блок в ОДНУ СТРОКУ:
    {"results": [{"diagnosis": "название", "confidence": 0.9, "description": "описание", "risk": "Средний", "urgency": "Планово", "estimatedCost": "1000 руб"}]}
    
    Авто: ${carInfo?.make || 'Неизвестно'} ${carInfo?.model || ''}. Пробег: ${carInfo?.mileage || 0} км.`;

    const content = await callOpenAI(systemPrompt, text);

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

Deno.serve(app.fetch)
