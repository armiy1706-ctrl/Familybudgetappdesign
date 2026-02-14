import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const GIGACHAT_CREDENTIALS = Deno.env.get('GIGACHAT_CREDENTIALS')

// Функция для получения токена GigaChat
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

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ошибка авторизации GigaChat: ${err}`);
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    
    if (url.pathname.includes('/diagnose')) {
      const { text, carInfo } = await req.json();

      if (!GIGACHAT_CREDENTIALS) {
        throw new Error('GIGACHAT_CREDENTIALS не настроены');
      }

      // 1. Получаем токен
      const token = await getGigaChatToken();

      // 2. Формируем запрос к GigaChat
      const systemPrompt = `Ты — эксперт-автомеханик. Проанализируй симптомы: "${text}". 
      Автомобиль: ${carInfo ? `${carInfo.make} ${carInfo.model} ${carInfo.year}` : 'Неизвестен'}.
      
      ОТВЕТЬ ТОЛЬКО В ФОРМАТЕ JSON:
      {
        "results": [
          {
            "diagnosis": "Название проблемы",
            "description": "Краткое описание",
            "confidence": 0.9,
            "risk": "Высокий/Средний/Низкий",
            "urgency": "Срочно/Позже",
            "estimatedCost": "Цена"
          }
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
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          temperature: 0.7
        })
      });

      const aiData = await aiResponse.json();
      const content = aiData.choices[0].message.content;
      
      // Парсим JSON из ответа (GigaChat иногда добавляет текст вокруг JSON)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { results: [] };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: corsHeaders });

  } catch (error) {
    console.error('Server error:', error.message);
    return new Response(JSON.stringify({ 
      error: error.message,
      results: [{
        diagnosis: "Ошибка сервиса",
        description: "Не удалось связаться с GigaChat. Проверьте настройки ключей.",
        confidence: 0,
        risk: "Неизвестно",
        urgency: "Свяжитесь с поддержкой",
        estimatedCost: "-"
      }]
    }), { 
      status: 200, // Возвращаем 200, чтобы фронтенд показал сообщение об ошибке красиво
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
})
