import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "jsr:@supabase/supabase-js@2.49.8"
import * as kv from "./kv_store.tsx"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const GIGACHAT_CREDENTIALS = Deno.env.get('GIGACHAT_CREDENTIALS')

async function getGigaChatToken() {
  const rqId = crypto.randomUUID();
  const response = await fetch('https://ngw.devices.sberbank.ru/api/v2/oauth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'RqUID': rqId,
      'Authorization': `Basic ${GIGACHAT_CREDENTIALS}`
    },
    body: 'scope=GIGACHAT_API_PERS'
  });

  if (!response.ok) throw new Error('Ошибка авторизации GigaChat');
  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // --- ROUTE: /diagnose ---
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
      Проанализируй симптомы: "${text}". Учитывай пробег при диагностике.
      
      СТРУКТУРА ОТВЕТА (ОБЯЗАТЕЛЬНО):
      🚗 ДИАГНОЗ: ...
      ⚙️ ВОЗМОЖНЫЕ ПРИЧИНЫ: ...
      📋 ЧТО ПОНАДОБИТСЯ: ...
      🔧 ПОШАГОВАЯ ИНСТРУКЦИЯ: ...
      💰 ЗАПЧАСТИ: ...
      💡 СОВЕТ ПРОФИЛАКТИКИ: ...

      Верни ответ в формате JSON:
      {
        "message": "Весь твой текст со всеми разделами и эмодзи",
        "shortDiagnosis": "Краткая суть одной фразой",
        "results": [
          { "diagnosis": "Название", "confidence": 0.9, "risk": "Высокий", "urgency": "Срочно", "estimatedCost": "Цена" }
        ]
      }`;

      const aiResponse = await fetch('https://ngw.devices.sberbank.ru/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          model: 'GigaChat',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }],
          temperature: 0.7
        })
      });

      const aiData = await aiResponse.json();
      const content = aiData.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: content, results: [] };

      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- ROUTE: /user-data ---
    if (url.pathname.includes('/user-data')) {
      const tgId = url.searchParams.get('tgId');
      if (!tgId) return new Response('Missing tgId', { status: 400, headers: corsHeaders });
      
      const cars = await kv.get(`cars_${tgId}`) || [];
      const profile = await kv.get(`profile_${tgId}`) || null;
      
      return new Response(JSON.stringify({ cars, profile }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- ROUTE: /save-cars ---
    if (url.pathname.includes('/save-cars')) {
      const { tgId, cars } = await req.json();
      if (!tgId) return new Response('Missing tgId', { status: 400, headers: corsHeaders });
      
      await kv.set(`cars_${tgId}`, cars);
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- ROUTE: /telegram-auth ---
    if (url.pathname.includes('/telegram-auth')) {
      const { initData } = await req.json();
      // Simple parsing of initData (in production you should verify the hash!)
      const params = new URLSearchParams(initData);
      const userStr = params.get('user');
      if (!userStr) return new Response('Invalid initData', { status: 400, headers: corsHeaders });
      
      const tgUser = JSON.parse(userStr);
      const email = `tg_${tgUser.id}@autoai.app`;
      const password = `pass_${tgUser.id}_secure`; // In a real app, generate a better hash or use a more secure method

      // Ensure user exists in Supabase Auth
      const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
      const existingUser = userList?.users.find(u => u.email === email);

      if (!existingUser) {
        await supabase.auth.admin.createUser({
          email,
          password,
          user_metadata: { 
            telegram_id: tgUser.id.toString(),
            full_name: `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim(),
            username: tgUser.username,
            avatar_url: tgUser.photo_url
          },
          email_confirm: true
        });
      }

      return new Response(JSON.stringify({ email, password }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: corsHeaders });

  } catch (error) {
    console.error('Server error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
})
