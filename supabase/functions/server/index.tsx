import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"
import * as https from "node:https"
import * as kv from "./kv_store.tsx"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const GIGACHAT_CREDENTIALS = Deno.env.get('GIGACHAT_CREDENTIALS')

// Функция для выполнения HTTPS запросов с игнорированием SSL
async function secureRequest(url: string, options: any, body?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // Формируем параметры запроса
    const requestOptions = {
      ...options,
      rejectUnauthorized: false, // Игнорируем ошибки сертификата Минцифры
    };

    const req = https.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`GigaChat API Error: ${res.statusCode} - ${JSON.stringify(parsed)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          // Если ответ не JSON, возвращаем как текст
          resolve(data);
        }
      });
    });

    req.on('error', (e) => {
      console.error('Сетевая ошибка запроса:', e);
      reject(e);
    });

    if (body) req.write(body);
    req.end();
  });
}

async function getGigaChatToken() {
  const rqId = crypto.randomUUID();
  console.log('Попытка получения токена GigaChat через secureRequest...');
  
  try {
    const data = await secureRequest('https://gigachat.devices.sberbank.ru/api/v2/oauth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'RqUID': rqId,
        'Authorization': `Basic ${GIGACHAT_CREDENTIALS}`
      }
    }, 'scope=GIGACHAT_API_PERS');
    
    if (data.access_token) {
      console.log('Токен успешно получен');
      return data.access_token;
    }
    throw new Error('Токен не найден в ответе');
  } catch (error) {
    console.error('Ошибка авторизации GigaChat:', error.message);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (url.pathname.includes('/diagnose')) {
      const { text, carInfo } = await req.json();
      const token = await getGigaChatToken();

      const systemPrompt = `Ты — опытный автомеханик с 15-летним стажем. 
      ИНФОРМАЦИЯ ОБ АВТОМОБИЛЕ:
      Марка/Модель: ${carInfo?.make} ${carInfo?.model}
      Год: ${carInfo?.year || 'Не указан'}
      Пробег: ${carInfo?.mileage || 'Не указан'} км
      
      ОТВЕТЬ СТРОГО В JSON:
      {
        "message": "Полный структурированный текст ответа с эмодзи",
        "results": [{"diagnosis": "Основная проблема", "confidence": 0.9, "estimatedCost": "Примерная цена"}]
      }`;

      const aiResponse = await secureRequest('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }, JSON.stringify({
        model: 'GigaChat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.7
      }));

      const content = aiResponse.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: content, results: [] };

      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- Маршруты синхронизации ---
    if (url.pathname.includes('/user-data')) {
      const tgId = url.searchParams.get('tgId');
      const cars = await kv.get(`cars_${tgId}`) || [];
      const profile = await kv.get(`profile_${tgId}`) || null;
      return new Response(JSON.stringify({ cars, profile }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (url.pathname.includes('/save-cars')) {
      const { tgId, cars } = await req.json();
      if (tgId) await kv.set(`cars_${tgId}`, cars);
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (url.pathname.includes('/telegram-auth')) {
      const { initData } = await req.json();
      const params = new URLSearchParams(initData);
      const tgUser = JSON.parse(params.get('user') || '{}');
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
      return new Response(JSON.stringify({ email, password }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: corsHeaders });

  } catch (error) {
    console.error('Ошибка выполнения:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
})
