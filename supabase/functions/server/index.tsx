import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
})
