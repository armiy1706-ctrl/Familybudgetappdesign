import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Настройки CORS встроены прямо в файл для избежания ошибок импорта
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

serve(async (req) => {
  // Обработка Preflight запросов CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { pathname } = new URL(req.url)

    // Эндпоинт для диагностики
    if (pathname.endsWith('/diagnose')) {
      const { text, carInfo } = await req.json()

      if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY не настроен на сервере')
      }

      const systemPrompt = `Ты — эксперт-автомеханик ИИ в приложении AutoAI. 
      Проанализируй симптомы: "${text}". 
      Автомобиль: ${carInfo ? `${carInfo.make} ${carInfo.model} ${carInfo.year}` : 'Неизвестен'}.
      
      Верни ответ СТРОГО в формате JSON:
      {
        "results": [
          {
            "diagnosis": "Название проблемы",
            "description": "Краткое описание почему это произошло",
            "confidence": 0.95,
            "risk": "Высокий/Средний/Низкий",
            "urgency": "Срочно/В течение недели/При следующем ТО",
            "estimatedCost": "Примерная стоимость в рублях"
          }
        ]
      }
      Выдай от 1 до 3 наиболее вероятных причин.`

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          response_format: { type: "json_object" }
        }),
      })

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API Error: ${JSON.stringify(errorData)}`);
      }

      const aiData = await response.json()
      const diagnosisResults = JSON.parse(aiData.choices[0].message.content)

      return new Response(JSON.stringify(diagnosisResults), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Route Not Found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Server error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
