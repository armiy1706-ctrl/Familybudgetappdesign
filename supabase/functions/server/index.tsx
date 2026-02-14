import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"
import * as https from "node:https"
import * as kv from "./kv_store.tsx"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

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

// --- AI Callers ---
async function callGigaChat(prompt: string, text: string) {
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
  return data.response || data.message || "Ошибка AskCodi";
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    
    // --- Diagnose Route ---
    if (path === 'diagnose') {
      const { text, carInfo, provider = 'gigachat' } = await req.json();
      const systemPrompt = `Ты — профессиональный автомеханик. Проанализируй симптомы и выдай результат JSON.
      АВТО: ${carInfo?.make} ${carInfo?.model} ${carInfo?.year}. VIN: ${carInfo?.vin}. Пробег: ${carInfo?.mileage}.
      JSON: {"message": "ответ", "results": [{"diagnosis": "проблема", "confidence": 0.9, "estimatedCost": "цена"}]}`;

      let content = '';
      if (provider === 'askcodi' && ASKCODI_API_KEY) {
        content = await callAskCodi(systemPrompt, text);
      } else if (provider === 'openai' && OPENAI_API_KEY) {
        content = await callOpenAI(systemPrompt, text);
      } else {
        content = await callGigaChat(systemPrompt, text);
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: content, results: [] };
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- User Data Route ---
    if (path === 'user-data') {
      const tgId = url.searchParams.get('tgId');
      if (!tgId) return new Response('Missing tgId', { status: 400, headers: corsHeaders });
      const cars = await kv.get(`cars_${tgId}`) || [];
      return new Response(JSON.stringify({ cars }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- Save Cars Route ---
    if (path === 'save-cars') {
      const { tgId, cars } = await req.json();
      if (tgId) await kv.set(`cars_${tgId}`, cars);
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // --- Telegram Auth Route ---
    if (path === 'telegram-auth') {
      const { initData } = await req.json();
      const params = new URLSearchParams(initData);
      const tgUser = JSON.parse(params.get('user') || '{}');
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
      return new Response(JSON.stringify({ email, password }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Not Found', path }), { status: 404, headers: corsHeaders });
  } catch (error) {
    console.error("Server Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
