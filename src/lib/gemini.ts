// ============================================
// AI Provider — Gemini (primary) + Groq (fallback)
// ============================================

export interface AIConfessionResult {
  sinCategory: string;
  sinLevel: string;
  response: string;
  penance: string;
}

const CONFESSION_PROMPT = `You are Father Degen, the AI priest of Confessai.fun - the confessional for crypto degens. You are savage, witty, and wise. Part priest, part degen, part therapist.

Respond with ONLY valid JSON:
{"sinCategory":"one of: Greed, FOMO, Wrath, Sloth, Pride, Lust, Cope","sinLevel":"one of: Venial, Mortal, Cardinal, Unforgivable","response":"2-4 sentences. Savage but comforting. Reference their specific sin. Use crypto slang.","penance":"1-2 sentences. Specific, funny penance related to their sin."}

Be FUNNY. Reference their specific sin. Use crypto slang. Tone = disappointed father + fellow degen. ONLY output JSON.`;

const CHAT_PROMPT = `You are Father Degen, the AI priest of Confessai.fun. You live in the blockchain. Part crypto oracle, part therapist, part comedian.

Personality: Savage but caring. Use crypto slang naturally (ape, rug, diamond hands, ngmi, wagmi, dyor, ser, fren, gm). Reference blockchain concepts like scripture. Short responses (2-4 sentences) unless they ask for detail. Call everyone "my child" or "dear sinner".

You can discuss crypto trades, market analysis, emotional support for losses, celebrate wins, give penance, share wisdom, and be the spiritual guide every degen needs.`;

const VALID_CATEGORIES = ['Greed', 'FOMO', 'Wrath', 'Sloth', 'Pride', 'Lust', 'Cope'];
const VALID_LEVELS = ['Venial', 'Mortal', 'Cardinal', 'Unforgivable'];

export const SIN_SCORE_MAP: Record<string, number> = {
  Venial: 5, Mortal: 15, Cardinal: 30, Unforgivable: 50,
};

function getFallback(): AIConfessionResult {
  return {
    sinCategory: VALID_CATEGORIES[Math.floor(Math.random() * VALID_CATEGORIES.length)],
    sinLevel: VALID_LEVELS[Math.floor(Math.random() * 3) + 1],
    response: 'My child, the blockchain has witnessed your shame and even it flinches. Your confession echoes through the mempool of regret. Every degen who ever lived has walked this path.',
    penance: 'Screenshot your worst trade, post it on Twitter with no caption, and let the ratio wash away your sins.',
  };
}

// ============================================
// Low-level provider calls
// ============================================

async function callGemini(systemPrompt: string, contents: any[], jsonMode = false): Promise<string> {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 500,
          ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[Gemini ${res.status}]`, errText.slice(0, 200));
    throw new Error(`Gemini ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini empty response');
  return text;
}

async function callGroq(systemPrompt: string, messages: { role: string; content: string }[], jsonMode = false): Promise<string> {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.9,
      max_tokens: 500,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[Groq ${res.status}]`, errText.slice(0, 200));
    throw new Error(`Groq ${res.status}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq empty response');
  return text;
}

// ============================================
// Confession judging — Gemini → Groq fallback
// ============================================

export async function judgeConfession(confession: string): Promise<AIConfessionResult> {
  const userMessage = `My confession: ${confession}`;

  // Try Gemini first
  try {
    const text = await callGemini(
      CONFESSION_PROMPT,
      [{ role: 'user', parts: [{ text: userMessage }] }],
      true
    );
    const parsed = JSON.parse(text.replace(/```json\n?|```\n?/g, '').trim());
    if (!VALID_CATEGORIES.includes(parsed.sinCategory)) parsed.sinCategory = 'Cope';
    if (!VALID_LEVELS.includes(parsed.sinLevel)) parsed.sinLevel = 'Mortal';
    console.log('[AI] Confession judged via Gemini');
    return parsed;
  } catch (err) {
    console.warn('[AI] Gemini failed for confession, trying Groq...', (err as Error).message);
  }

  // Fallback to Groq
  try {
    const text = await callGroq(
      CONFESSION_PROMPT,
      [{ role: 'user', content: userMessage }],
      true
    );
    const parsed = JSON.parse(text.replace(/```json\n?|```\n?/g, '').trim());
    if (!VALID_CATEGORIES.includes(parsed.sinCategory)) parsed.sinCategory = 'Cope';
    if (!VALID_LEVELS.includes(parsed.sinLevel)) parsed.sinLevel = 'Mortal';
    console.log('[AI] Confession judged via Groq (fallback)');
    return parsed;
  } catch (err) {
    console.error('[AI] Both providers failed for confession:', (err as Error).message);
    return getFallback();
  }
}

// ============================================
// Chat — Gemini → Groq fallback
// ============================================

function sanitizeHistoryForGemini(history: { role: string; content: string }[]) {
  // Gemini needs alternating user/model, starting with user
  const cleaned: { role: string; parts: { text: string }[] }[] = [];
  for (const m of history) {
    const geminiRole = m.role === 'assistant' ? 'model' : 'user';
    const last = cleaned[cleaned.length - 1];
    if (last && last.role === geminiRole) {
      last.parts[0].text += '\n' + m.content;
    } else {
      cleaned.push({ role: geminiRole, parts: [{ text: m.content }] });
    }
  }
  if (cleaned.length === 0 || cleaned[0].role !== 'user') {
    cleaned.unshift({ role: 'user', parts: [{ text: 'Hello Father' }] });
  }
  return cleaned;
}

function sanitizeHistoryForGroq(history: { role: string; content: string }[]) {
  // Groq/OpenAI format — just ensure roles are correct
  return history.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));
}

export async function chatWithPriest(
  history: { role: string; content: string }[]
): Promise<string> {
  // Try Gemini first
  try {
    const contents = sanitizeHistoryForGemini(history);
    const text = await callGemini(CHAT_PROMPT, contents);
    console.log('[AI] Chat via Gemini');
    return text;
  } catch (err) {
    console.warn('[AI] Gemini failed for chat, trying Groq...', (err as Error).message);
  }

  // Fallback to Groq
  try {
    const messages = sanitizeHistoryForGroq(history);
    const text = await callGroq(CHAT_PROMPT, messages);
    console.log('[AI] Chat via Groq (fallback)');
    return text;
  } catch (err) {
    console.error('[AI] Both providers failed for chat:', (err as Error).message);
    return 'My child, even Father Degen needs a moment of meditation. The spirits of both realms are restless. Try again shortly.';
  }
}
