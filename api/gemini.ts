import type { VercelRequest, VercelResponse } from "@vercel/node";

const GROQ_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-pro"];

// Retains healthy provider across warm invocations in serverless container
let preferredProvider: "groq" | "gemini" = "groq";

async function callGroq(prompt: string, systemContext?: string, apiKey?: string): Promise<string> {
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");

  const messages: { role: string; content: string }[] = [];
  if (systemContext) {
    messages.push({ role: "system", content: systemContext });
  }
  messages.push({ role: "user", content: prompt });

  let lastError: any = null;
  for (const model of GROQ_MODELS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.5,
          max_tokens: 4096,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text;
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastError = new Error(`Groq ${model} HTTP ${res.status}: ${errJson.error?.message || res.statusText}`);
      }
    } catch (e: any) {
      lastError = e;
    }
  }

  throw lastError || new Error("All Groq models failed to respond");
}

async function callGemini(prompt: string, systemContext?: string, apiKeys: string[] = []): Promise<string> {
  if (apiKeys.length === 0) throw new Error("No GEMINI API keys configured");

  const fullPrompt = systemContext
    ? `System Context:\n${systemContext}\n\nUser Question: ${prompt}\n\nProvide an intelligent, structured response.`
    : prompt;

  let lastError: any = null;

  for (let kIndex = 0; kIndex < apiKeys.length; kIndex++) {
    const apiKey = apiKeys[kIndex];
    const isBackup = kIndex > 0;

    const authModes = [
      { urlSuffix: `?key=${apiKey}`, headers: { "Content-Type": "application/json" } },
      { urlSuffix: "", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` } },
      { urlSuffix: "", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey } },
    ];

    let keyError: any = null;

    for (const model of GEMINI_MODELS) {
      for (const auth of authModes) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent${auth.urlSuffix}`;

          const res = await fetch(geminiUrl, {
            method: "POST",
            headers: auth.headers,
            body: JSON.stringify({
              contents: [{ parts: [{ text: fullPrompt }] }],
              generationConfig: { temperature: 0.5, maxOutputTokens: 4096 },
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return text;
          } else {
            const err = await res.json().catch(() => ({}));
            keyError = new Error(`Gemini ${model} HTTP ${res.status}: ${err.error?.message || res.statusText}`);
          }
        } catch (e: any) {
          keyError = e;
        }
      }
    }

    lastError = keyError;
    console.warn(`[AI Failover] Gemini key #${kIndex + 1} (${isBackup ? "Backup" : "Primary"}) failed: ${keyError?.message}. Attempting next available key...`);
  }

  throw lastError || new Error("All Gemini API keys failed to respond");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt, systemContext } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const groqKey = process.env.GROQ_API_KEY;
    const primaryGeminiKey = process.env.GEMINI_API_KEY;
    const backupGeminiKey = process.env.GEMINI_BACKUP_API_KEY;
    const geminiKeys = [primaryGeminiKey, backupGeminiKey].filter(Boolean) as string[];

    if (!groqKey && geminiKeys.length === 0) {
      return res.status(500).json({ error: "Neither GROQ_API_KEY nor GEMINI_API_KEY is configured" });
    }

    // Bidirectional automatic failover:
    // If preferredProvider is "groq", try Groq first. If it fails, switch to Gemini (primary & backup).
    // If preferredProvider is "gemini", try Gemini (primary & backup) first. If it fails, switch to Groq.
    const providersToTry = preferredProvider === "groq"
      ? ["groq", "gemini"]
      : ["gemini", "groq"];

    let lastError: any = null;

    for (const provider of providersToTry) {
      try {
        if (provider === "groq" && groqKey) {
          const text = await callGroq(prompt, systemContext, groqKey);
          preferredProvider = "groq";
          return res.status(200).json({ text, provider: "groq" });
        } else if (provider === "gemini" && geminiKeys.length > 0) {
          const text = await callGemini(prompt, systemContext, geminiKeys);
          preferredProvider = "gemini";
          return res.status(200).json({ text, provider: "gemini" });
        }
      } catch (err: any) {
        console.warn(`Primary AI provider [${provider}] failed: ${err.message}. Switching to failover provider...`);
        lastError = err;
      }
    }

    return res.status(502).json({
      error: `All AI providers failed. Last error: ${lastError?.message || "Unknown error"}`
    });
  } catch (error: any) {
    console.error("AI serverless handler error:", error);
    return res.status(500).json({ error: error.message || "Failed to query AI" });
  }
}
