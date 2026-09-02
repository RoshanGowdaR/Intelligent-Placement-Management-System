const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, topic, count, type, difficulty } = await req.json();
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const prompt = `Generate exactly ${count || 5} ${type || 'mcq'} questions for the subject "${subject}"${topic ? ` on the topic "${topic}"` : ''}.${difficulty ? ` Difficulty: ${difficulty}.` : ''}

Return a JSON array of objects with this exact structure:
[
  {
    "id": "unique-uuid-string",
    "type": "${type || 'mcq'}",
    "subject": "${subject}",
    "topic": "${topic || ''}",
    "text": "question text here",
    ${type === 'coding' ? '"correct_answer": "expected output or solution",' : '"options": ["Option A", "Option B", "Option C", "Option D"],\n    "correct_answer": "A",'}
    "points": 1
  }
]

For MCQ, correct_answer must be one of A, B, C, D. Return ONLY the JSON array, no markdown or explanation.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    // Extract JSON from response
    let questions;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      questions = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      questions = [];
    }

    // Ensure each question has an id
    questions = questions.map((q: Record<string, unknown>) => ({
      ...q,
      id: q.id || crypto.randomUUID(),
    }));

    return new Response(JSON.stringify({ questions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
