import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"
import axios from "npm:axios"
import * as https from "node:https"
import * as kv from "./kv_store.tsx"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// Создаем агент для игнорирования проблем с сертификатами Минцифры
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

// Настраиваем axios для работы в среде Deno через Node-совместимость
const gigaApi = axios.create({
  httpsAgent,
  // Важно: заставляем axios использовать http-адаптер вместо fetch-адаптера,
  // чтобы настройки httpsAgent вступили в силу
  adapter: 'http', 
  timeout: 30000,
});

const GIGACHAT_CREDENTIALS = Deno.env.get('GIGACHAT_CREDENTIALS')

async function getGigaChatToken() {
  const rqId = crypto.randomUUID();
  try {
    console.log('Запрос токена через gigachat.devices.sberbank.ru...');
    const response = await gigaApi.post('https://gigachat.devices.sberbank.ru/api/v2/oauth', 
      'scope=GIGACHAT_API_PERS',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'RqUID': rqId,
          'Authorization': `Basic ${GIGACHAT_CREDENTIALS}`
        }
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('Ошибка OAuth GigaChat:', error.response?.data || error.message);
    throw new Error(`Ошибка авторизации: ${error.message}`);
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

      const systemPrompt = `Ты — опытный автомеханик. 
      ИНФОРМАЦИЯ ОБ АВТОМОБИЛЕ:
      Марка/Модель: ${carInfo?.make} ${carInfo?.model}
      Год: ${carInfo?.year || 'Не указан'}
      Пробег: ${carInfo?.mileage || 'Не указан'} км
      
      ОТВЕЧАЙ СТРОГО В JSON:
      {
        "message": "Текст ответа с эмодзи",
        "results": [{"diagnosis": "Название", "confidence": 0.9, "estimatedCost": "Цена"}]
      }`;

      const aiResponse = await gigaApi.post('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
        model: 'GigaChat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.7
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const content = aiResponse.data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: content, results: [] };

      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Маршруты данных
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
    console.error('Ошибка сервера:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
})
