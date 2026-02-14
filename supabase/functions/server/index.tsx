import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    
    if (url.pathname.includes('/diagnose')) {
      const { text, carInfo } = await req.json();

      // Если ключа нет совсем, сразу даем демо-ответ
      if (!OPENAI_API_KEY) {
        return returnDemoResponse("API ключ не настроен. Работаю в демо-режиме.");
      }

      const systemPrompt = `Ты — эксперт-автомеханик ИИ. Проанализируй симптомы: "${text}". 
      Автомобиль: ${carInfo ? `${carInfo.make} ${carInfo.model} ${carInfo.year}` : 'Неизвестен'}.
      Верни JSON с массивом results, содержащим объекты: diagnosis, description, confidence (0-1), risk, urgency, estimatedCost.`;

      try {
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
        });

        const aiData = await aiResponse.json();

        if (aiData.error && aiData.error.code === 'insufficient_quota') {
          return returnDemoResponse("Лимит OpenAI исчерпан. (Демо-ответ)");
        }

        if (!aiResponse.ok) {
          throw new Error(aiData.error?.message || 'OpenAI Error');
        }

        return new Response(JSON.stringify(aiData.choices[0].message.content ? JSON.parse(aiData.choices[0].message.content) : aiData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (err) {
        console.error('AI Fetch Error:', err);
        return returnDemoResponse(`Ошибка API (${err.message}). Показываю демо-анализ.`);
      }
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
})

function returnDemoResponse(note: string) {
  const demoData = {
    results: [
      {
        diagnosis: "Требуется проверка (Демо-режим)",
        description: `${note} Похоже на проблему с датчиками или ходовой частью. Проверьте уровень жидкостей и визуальное состояние узлов.`,
        confidence: 0.7,
        risk: "Средний",
        urgency: "В течение недели",
        estimatedCost: "от 3 000 до 15 000 ₽"
      }
    ]
  };
  return new Response(JSON.stringify(demoData), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
