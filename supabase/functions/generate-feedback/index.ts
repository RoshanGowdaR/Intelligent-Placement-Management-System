const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Mode: explanations - generate per-question explanations for wrong answers
    if (body.mode === 'explanations') {
      const questions = body.questions as Array<{
        id: string;
        text: string;
        options?: string[];
        correct_answer: string;
        user_answer: string;
        subject: string;
      }>;

      const questionsText = questions.map((q, i) => {
        const optionsText = q.options
          ? q.options.map((o, j) => `  ${String.fromCharCode(65 + j)}. ${o}`).join('\n')
          : '';
        return `Question ${i + 1} (ID: ${q.id}):
${q.text}
${optionsText ? `Options:\n${optionsText}` : ''}
Student's answer: ${q.user_answer}
Correct answer: ${q.correct_answer}`;
      }).join('\n\n');

      const prompt = `You are a helpful tutor. For each question below, the student answered incorrectly. Provide a brief explanation for each.

${questionsText}

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "<question_id>": {
    "why_wrong": "Brief explanation of why the student's answer is incorrect",
    "why_right": "Brief explanation of why the correct answer is right"
  }
}

Keep each explanation to 1-2 sentences. Be clear and educational.`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        }),
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';

      // Parse the JSON response, stripping markdown code blocks if present
      let explanations = {};
      try {
        const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        explanations = JSON.parse(cleaned);
      } catch {
        explanations = {};
      }

      return new Response(JSON.stringify({ explanations }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Default mode: generate overall feedback
    const { testTitle, totalScore, passed, scores } = body;

    const subjectBreakdown = Object.entries(scores as Record<string, number>)
      .map(([sub, score]) => `- ${sub}: ${score}%`)
      .join('\n');

    const prompt = `A student just completed a placement test "${testTitle}" and scored ${totalScore}% overall. They ${passed ? 'passed' : 'did not pass'}.

Subject-wise scores:
${subjectBreakdown}

Provide personalized feedback in 3-4 paragraphs:
1. Overall performance summary
2. Subject-specific strengths and weaknesses
3. Concrete improvement recommendations with specific study topics
4. A motivational note

Keep it concise, actionable, and encouraging. Write in second person ("You scored...").`;

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
    const feedback = data.choices?.[0]?.message?.content || 'Unable to generate feedback at this time.';

    return new Response(JSON.stringify({ feedback }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
