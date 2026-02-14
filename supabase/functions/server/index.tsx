import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    console.log(`Incoming request: ${req.method} ${url.pathname}`);

    // Маршрут диагностики
    // Supabase передает путь как /diagnose если функция вызвана по этому пути
    if (url.pathname.includes('/diagnose')) {
      const body = await req.json();
      const { text, carInfo } = body;

      console.log('Diagnose request for:', text);

      if (!OPENAI_API_KEY) {
        console.error('Missing OPENAI_API_KEY');
        return new Response(JSON.stringify({ error: 'Сервер не настроен: отсутствует API ключ OpenAI' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const systemPrompt = `Ты — эксперт-автомеханик ИИ. Проанализируй симптомы: "${text}". 
      Автомобиль: ${carInfo ? `${carInfo.make} ${carInfo.model} ${carInfo.year}` : 'Неизвестен'}.
      Верни JSON с массивом results, содержащим объекты: diagnosis, description, confidence (0-1), risk, urgency, estimatedCost.`;

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

      if (!aiResponse.ok) {
        const error = await aiResponse.text();
        console.error('OpenAI Error:', error);
        return new Response(JSON.stringify({ error: 'Ошибка при обращении к нейросети' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const aiData = await aiResponse.json();
      return new Response(aiData.choices[0].message.content, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Маршрут не найден', path: url.pathname }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Server error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
