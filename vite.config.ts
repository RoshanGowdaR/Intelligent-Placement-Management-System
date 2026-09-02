import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import nodemailer from "nodemailer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    {
      name: "email-sender-plugin",
      configureServer(server) {
        server.middlewares.use("/api/send-email", async (req, res) => {
          if (req.method === "OPTIONS") {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type");
            res.statusCode = 200;
            res.end();
            return;
          }

          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: "Method not allowed" }));
            return;
          }

          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });

          req.on("end", async () => {
            try {
              const data = JSON.parse(body || "{}");
              const targetEmail = data.to || data.email;
              if (!targetEmail) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "Missing email" }));
                return;
              }

              const gmailUser = process.env.GMAIL_USER || "gowdaroshan49@gmail.com";
              const gmailAppPassword = (process.env.GMAIL_APP_PASSWORD || "zqlzwrezlbrfmety").replace(/\s+/g, "");

              // Use IPv4 to prevent Windows/Node ENETUNREACH on IPv6
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
                family: 4,
              } as any);

              let mailSubject = data.subject || `🏢 Campus Placement Drive Invitation — ${data.companyName || "Recruiter"}`;
              let mailHtml = data.html;

              if (!mailHtml && data.inviteLink) {
                mailHtml = `
                  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; padding: 36px; background-color: #0b0b10; color: #ffffff; border-radius: 20px; border: 1px solid #232336;">
                    <div style="text-align: center; margin-bottom: 28px;">
                      <div style="display: inline-block; background: #6c5ce7; width: 48px; height: 48px; line-height: 48px; border-radius: 14px; font-size: 24px; text-align: center;">🎓</div>
                      <h1 style="color: #ffffff; font-size: 22px; margin: 12px 0 4px 0; font-weight: 800;">Intelligent Placement Management System</h1>
                      <p style="color: #6c5ce7; font-size: 13px; font-weight: 600; margin: 0; letter-spacing: 0.5px;">CAMPUS RECRUITMENT PARTNER PORTAL</p>
                    </div>

                    <div style="background: linear-gradient(180deg, #141420 0%, #10101a 100%); padding: 28px; border-radius: 16px; border: 1px solid #28283f; margin-bottom: 28px;">
                      <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; font-weight: 700;">
                        Hello ${data.companyName ? data.companyName + " Recruitment Team" : "Recruiter"},
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
                      <a href="${data.inviteLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #6c5ce7 0%, #5844e3 100%); color: #ffffff; font-weight: 700; text-decoration: none; padding: 15px 36px; border-radius: 12px; font-size: 15px; box-shadow: 0 4px 25px rgba(108, 92, 231, 0.5); letter-spacing: 0.3px;">
                        Complete Company Registration →
                      </a>
                    </div>

                    <div style="border-top: 1px solid #1f1f2e; padding-top: 20px; text-align: center;">
                      <p style="color: #6e6e85; font-size: 12px; line-height: 1.5; margin: 0;">
                        This invitation link is valid for 7 days.<br/>
                        If the button above does not open, copy and paste this URL into your browser:<br/>
                        <span style="color: #6c5ce7; font-size: 11px; word-break: break-all;">${data.inviteLink}</span>
                      </p>
                    </div>
                  </div>
                `;
              }

              const info = await transporter.sendMail({
                from: `"Intelligent Placement Management System" <${gmailUser}>`,
                to: targetEmail,
                subject: mailSubject,
                html: mailHtml,
              });

              console.log(`[Local SMTP] Email successfully sent to ${targetEmail}:`, info.messageId);
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, messageId: info.messageId }));
            } catch (err: any) {
              console.error("[Local SMTP] Failed to send email:", err);
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
