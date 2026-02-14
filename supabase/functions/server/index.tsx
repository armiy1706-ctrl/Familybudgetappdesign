import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"
import * as kv from "./kv_store.tsx"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const GIGACHAT_CREDENTIALS = Deno.env.get('GIGACHAT_CREDENTIALS')

async function getGigaChatToken() {
  const rqId = crypto.randomUUID();
  
  // Мы пробуем альтернативный эндпоинт, который часто работает лучше в облачных средах
  const oauthUrls = [
    'https://gigachat.devices.sberbank.ru/api/v2/oauth',
    'https://ngw.devices.sberbank.ru/api/v2/oauth'
  ];

  let lastError = null;

  for (const url of oauthUrls) {
    try {
      console.log(`Попытка авторизации GigaChat через: ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'RqUID': rqId,
          'Authorization': `Basic ${GIGACHAT_CREDENTIALS}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        body: 'scope=GIGACHAT_API_PERS'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Токен GigaChat успешно получен');
        return data.access_token;
      } else {
        const errorText = await response.text();
        console.error(`Ошибка эндпоинта ${url}: ${response.status} ${errorText}`);
        lastError = new Error(`Status ${response.status}: ${errorText}`);
      }
    } catch (e) {
      console.error(`Сетевая ошибка на ${url}:`, e.message);
      lastError = e;
    }
  }

  throw new Error(`Все методы авторизации GigaChat провалились. Последняя ошибка: ${lastError?.message}`);
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
      VIN: ${carInfo?.vin || 'Не указан'}
      Двигатель: ${carInfo?.engine || 'Не указан'}

      ТВОЯ ЗАДАЧА:
      Проанализируй симптомы: "${text}".
      
      СТРУКТУРА ОТВЕТА (JSON):
      {
        "message": "Полный текст ответа с эмодзи",
        "results": [{"diagnosis": "Название", "confidence": 0.9, "estimatedCost": "Цена"}]
      }`;

      const aiResponse = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: 'GigaChat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          temperature: 0.7
        })
      });

      if (!aiResponse.ok) {
        const err = await aiResponse.text();
        throw new Error(`Ошибка GigaChat API: ${err}`);
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices[0].message.content;
      
      // Парсим JSON из ответа ИИ
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: content, results: [] };

      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- Другие эндпоинты ---
    if (url.pathname.includes('/user-data')) {
      const tgId = url.searchParams.get('tgId');
      if (!tgId) return new Response('Missing tgId', { status: 400, headers: corsHeaders });
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
      const userStr = params.get('user');
      if (!userStr) return new Response('Invalid data', { status: 400, headers: corsHeaders });
      
      const tgUser = JSON.parse(userStr);
      const email = `tg_${tgUser.id}@autoai.app`;
      const password = `pass_${tgUser.id}_secure`;

      const { data: userList } = await supabase.auth.admin.listUsers();
      const existingUser = userList?.users.find(u => u.email === email);

      if (!existingUser) {
        await supabase.auth.admin.createUser({
          email,
          password,
          user_metadata: { 
            telegram_id: tgUser.id.toString(),
            full_name: `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim(),
            avatar_url: tgUser.photo_url
          },
          email_confirm: true
        });
      }

      return new Response(JSON.stringify({ email, password }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: corsHeaders });

  } catch (error) {
    console.error('Ошибка в обработчике:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
})
