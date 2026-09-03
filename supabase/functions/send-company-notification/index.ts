const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.13';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { action, companyName, email, inviteLink, eligibility } = payload;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://xvkswalqrepcdwkanxaz.supabase.co';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'sb_publishable_185TMklN9X-lL4Ds2wv2IA_F4J_VFJE';
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Gmail SMTP credentials
    const gmailUser = Deno.env.get('GMAIL_USER') || '';
    const gmailAppPassword = (Deno.env.get('GMAIL_APP_PASSWORD') || '').replace(/\s+/g, '');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    // 1. Handle Company Recruiter Invitation
    if (action === 'invite' || payload.type === 'invite') {
      const targetEmail = email;
      if (!targetEmail || !inviteLink) {
        return new Response(JSON.stringify({ error: 'Missing email or inviteLink for invitation' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const emailHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; padding: 36px; background-color: #0b0b10; color: #ffffff; border-radius: 20px; border: 1px solid #232336;">
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="display: inline-block; background: #6c5ce7; width: 48px; height: 48px; line-height: 48px; border-radius: 14px; font-size: 24px; text-align: center;">🎓</div>
            <h1 style="color: #ffffff; font-size: 22px; margin: 12px 0 4px 0; font-weight: 800;">Intelligent Placement Management System</h1>
            <p style="color: #6c5ce7; font-size: 13px; font-weight: 600; margin: 0; letter-spacing: 0.5px;">CAMPUS RECRUITMENT PARTNER PORTAL</p>
          </div>

          <div style="background: linear-gradient(180deg, #141420 0%, #10101a 100%); padding: 28px; border-radius: 16px; border: 1px solid #28283f; margin-bottom: 28px;">
            <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; font-weight: 700;">
              Hello ${companyName ? companyName + ' Recruitment Team' : 'Recruiter'},
            </h2>
            <p style="color: #d1d1e0; line-height: 1.6; font-size: 14px;">
              You have been invited by the Placement Administration to register and conduct campus hiring drives for our university talent pool.
            </p>
            <p style="color: #d1d1e0; line-height: 1.6; font-size: 14px;">
              Through your dedicated <strong>Recruiter Portal</strong>, you will be able to:
            </p>
            <ul style="color: #a8a8c0; font-size: 13px; line-height: 1.8; padding-left: 20px;">
              <li>🚀 Schedule customized online technical & aptitude tests</li>
              <li>⏱️ Set candidate registration deadlines & attend lockouts</li>
              <li>👥 Access verified student candidate profiles & resumes</li>
              <li>📊 Export qualification reports & evaluation metrics</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 36px 0;">
            <a href="${inviteLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #6c5ce7 0%, #5844e3 100%); color: #ffffff; font-weight: 700; text-decoration: none; padding: 15px 36px; border-radius: 12px; font-size: 15px; box-shadow: 0 4px 25px rgba(108, 92, 231, 0.5); letter-spacing: 0.3px;">
              Complete Company Registration →
            </a>
          </div>

          <div style="border-top: 1px solid #1f1f2e; padding-top: 20px; text-align: center;">
            <p style="color: #6e6e85; font-size: 12px; line-height: 1.5; margin: 0;">
              This invitation link is valid for 7 days.<br/>
              If the button above does not open, copy and paste this URL into your browser:<br/>
              <span style="color: #6c5ce7; font-size: 11px; word-break: break-all;">${inviteLink}</span>
            </p>
          </div>
        </div>
      `;

      const info = await transporter.sendMail({
        from: `"Intelligent Placement Management System" <${gmailUser}>`,
        to: targetEmail,
        subject: `🏢 Placement Drive Invitation — ${companyName || 'Campus Hiring Partner'}`,
        html: emailHtml,
      });

      console.log(`Invitation successfully emailed via Gmail to ${targetEmail}:`, info.messageId);

      return new Response(JSON.stringify({ success: true, messageId: info.messageId, provider: 'gmail' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Handle Broadcast Company Added / Updated Notifications to Students
    const { data: studentRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'student');

    if (rolesError) throw rolesError;

    const studentIds = (studentRoles || []).map((r: { user_id: string }) => r.user_id);

    if (studentIds.length === 0) {
      return new Response(JSON.stringify({ success: true, notifiedCount: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let title = '🏢 New Company Visit';
    let message = `"${companyName}" has been added as a placement partner.`;

    if (action === 'updated') {
      title = '📋 Company Eligibility Updated';
      message = `Eligibility criteria for "${companyName}" have been updated.`;
    }

    if (eligibility) {
      const parts: string[] = [];
      if (eligibility.min_cgpa) parts.push(`Min CGPA: ${eligibility.min_cgpa}`);
      if (eligibility.year_of_passing) parts.push(`Year: ${eligibility.year_of_passing}`);
      if (eligibility.skills_cutoff) parts.push(`Skills Cutoff: ${eligibility.skills_cutoff}%`);
      if (parts.length > 0) message += ` Criteria: ${parts.join(', ')}.`;
    }

    // In-app notifications
    const notifications = studentIds.map((userId: string) => ({
      user_id: userId,
      title,
      message,
      type: 'company_update',
      link: '/dashboard/companies',
    }));

    await supabase.from('notifications').insert(notifications);

    return new Response(JSON.stringify({ success: true, notifiedCount: studentIds.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-company-notification error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
