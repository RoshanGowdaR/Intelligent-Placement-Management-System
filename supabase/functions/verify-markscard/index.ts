const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentBase64, mimeType, expectedName, expectedUsn, semester } = await req.json();
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const prompt = `You are a marks card / grade card analyzer. Analyze this document image and extract the following information:

1. Student Name (as printed on the marks card)
2. USN / University Serial Number (as printed on the marks card)
3. Semester number
4. SGPA for this semester (if visible)

The student claims their name is "${expectedName}" and USN is "${expectedUsn}" and this is semester ${semester}.

Return a JSON object with this exact structure:
{
  "extracted_name": "name from document",
  "extracted_usn": "USN from document",
  "extracted_semester": number,
  "extracted_sgpa": number or null,
  "name_matches": true/false (case-insensitive comparison),
  "usn_matches": true/false (case-insensitive comparison),
  "is_valid": true/false (both name and USN must match)
}

Be lenient with name matching - ignore minor spacing differences, abbreviations, and middle name variations. For USN matching, ignore case and spaces.

Return ONLY the JSON, no markdown.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${documentBase64}` } },
          ],
        }],
        temperature: 0.2,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      result = { is_valid: false, error: 'Could not parse AI response' };
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
