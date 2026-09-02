const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@6';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentId, testTitle, totalScore, passed } = await req.json();

    if (!studentId || !testTitle) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const emoji = passed ? '🎉' : '📊';
    const status = passed ? 'Passed' : 'Failed';

    // In-app notification
    const { error } = await supabase.from('notifications').insert({
      user_id: studentId,
      title: `${emoji} Test Results Ready`,
      message: `Your results for "${testTitle}" are ready. You scored ${totalScore}% (${status}). Check your results for detailed feedback.`,
      type: 'test_result',
      link: '/dashboard/results',
    });

    if (error) throw error;

    // Send email notification
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, name')
        .eq('id', studentId)
        .maybeSingle();

      if (profile?.email) {
        const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
        await resend.emails.send({
          from: 'SmartPlace <onboarding@resend.dev>',
          to: profile.email,
          subject: `${emoji} Test Results: ${testTitle}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
              <h2 style="color: #1a1a2e;">Hi ${profile.name || 'Student'},</h2>
              <p style="color: #555; line-height: 1.6;">Your results for <strong>"${testTitle}"</strong> are ready.</p>
              <div style="background: ${passed ? '#dcfce7' : '#fef2f2'}; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                <p style="font-size: 24px; font-weight: bold; color: ${passed ? '#166534' : '#991b1b'};">${totalScore}% — ${status}</p>
              </div>
              <p style="color: #888; font-size: 14px;">Log in to SmartPlace to view detailed feedback.</p>
            </div>
          `,
        });
      }
    } catch (emailErr) {
      console.error('Email send failed (non-blocking):', emailErr);
    }

    console.log(`Result notification sent to student ${studentId} for test: ${testTitle}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
