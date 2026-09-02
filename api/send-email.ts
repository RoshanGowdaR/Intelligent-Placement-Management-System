import type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { to, subject, html, companyName, inviteLink, action } = req.body || {};

    const targetEmail = to || req.body?.email;
    if (!targetEmail) {
      return res.status(400).json({ error: "Missing recipient email" });
    }

    const gmailUser = process.env.GMAIL_USER || "gowdaroshan49@gmail.com";
    const gmailAppPassword = (process.env.GMAIL_APP_PASSWORD || "zqlzwrezlbrfmety").replace(/\s+/g, "");

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
      tls: {
        rejectUnauthorized: false,
      },
      // Force IPv4 to avoid ENETUNREACH on systems with incomplete IPv6 routing
      family: 4,
    } as any);

    let mailSubject = subject || `🏢 Campus Placement Drive Invitation — ${companyName || "Recruiter"}`;
    let mailHtml = html || `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; padding: 36px; background-color: #0b0b10; color: #ffffff; border-radius: 20px; border: 1px solid #232336;">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-block; background: #6c5ce7; width: 48px; height: 48px; line-height: 48px; border-radius: 14px; font-size: 24px; text-align: center;">🎓</div>
          <h1 style="color: #ffffff; font-size: 22px; margin: 12px 0 4px 0; font-weight: 800;">Intelligent Placement Management System</h1>
          <p style="color: #6c5ce7; font-size: 13px; font-weight: 600; margin: 0; letter-spacing: 0.5px;">CAMPUS RECRUITMENT PARTNER PORTAL</p>
        </div>

        <div style="background: linear-gradient(180deg, #141420 0%, #10101a 100%); padding: 28px; border-radius: 16px; border: 1px solid #28283f; margin-bottom: 28px;">
          <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; font-weight: 700;">
            Hello ${companyName ? companyName + " Recruitment Team" : "Recruiter"},
          </h2>
          <p style="color: #d1d1e0; line-height: 1.6; font-size: 14px;">
            You have been invited by the Placement Administration to join our Intelligent Placement Management System and conduct campus recruitment drives.
          </p>
          <p style="color: #d1d1e0; line-height: 1.6; font-size: 14px;">
            Through your dedicated <strong>Recruiter Portal</strong>, you can:
          </p>
          <ul style="color: #a8a8c0; font-size: 13px; line-height: 1.8; padding-left: 20px;">
            <li>🚀 Schedule customized technical & aptitude assessments</li>
            <li>⏱️ Set student registration deadlines & strict attend lockouts</li>
            <li>👥 Access verified candidate profiles, CGPAs & resumes</li>
            <li>📊 Generate instant qualification and forensic audit reports</li>
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
      subject: mailSubject,
      html: mailHtml,
    });

    console.log(`Email delivered to ${targetEmail}: ${info.messageId}`);
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error("Email dispatch error:", error);
    return res.status(500).json({ error: error.message || "Failed to send email" });
  }
}
