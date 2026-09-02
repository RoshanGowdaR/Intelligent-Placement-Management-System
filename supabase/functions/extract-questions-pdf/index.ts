const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfText, documentBase64, mimeType } = await req.json();
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const prompt = `You are a question extractor. Extract ALL questions from the provided content and return them as a JSON array.

For each question, determine if it's MCQ or coding type.

Return a JSON array with this exact structure:
[
  {
    "id": "unique-uuid",
    "type": "mcq" or "coding",
    "subject": "detected subject",
    "topic": "detected topic or empty string",
    "text": "the question text",
    "options": ["A option", "B option", "C option", "D option"],
    "correct_answer": "A/B/C/D for MCQ, or expected answer for coding",
    "points": 1
  }
]

For MCQ questions: include options array and correct_answer as letter (A/B/C/D).
For coding questions: omit options, set correct_answer to expected output.
If you can detect the correct answer from the document, include it. Otherwise make your best judgment.

Return ONLY the JSON array, no markdown or explanation.`;

    let messages;
    
    // If we have base64 document (Word, scanned PDF, etc.), use vision
    if (documentBase64 && mimeType) {
      messages = [{
        role: 'user',
        content: [
          { type: 'text', text: prompt + '\n\nExtract questions from this document:' },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${documentBase64}` } },
        ],
      }];
    } else if (pdfText && pdfText.trim().length > 50) {
      // Text-based extraction
      messages = [{ role: 'user', content: prompt + '\n\nDocument Content:\n' + pdfText }];
    } else if (documentBase64) {
      // Fallback: text extraction yielded minimal content, use vision
      const fallbackMime = mimeType || 'application/pdf';
      messages = [{
        role: 'user',
        content: [
          { type: 'text', text: prompt + '\n\nExtract questions from this scanned document:' },
          { type: 'image_url', image_url: { url: `data:${fallbackMime};base64,${documentBase64}` } },
        ],
      }];
    } else {
      return new Response(JSON.stringify({ error: 'No content provided' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    let questions;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      questions = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      questions = [];
    }

    questions = questions.map((q: Record<string, unknown>) => ({
      ...q,
      id: q.id || crypto.randomUUID(),
    }));

    return new Response(JSON.stringify({ questions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
