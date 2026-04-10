/**
 * AI Client — Anthropic Claude API wrapper.
 *
 * Provides: complete() for text, completeJSON() for structured output.
 * Features: retry with exponential backoff, timeout, token tracking.
 *
 * Designed for future multi-provider support (Gemini, OpenAI) —
 * just add a new call* function and update getProvider().
 */

import 'dotenv/config';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const TIMEOUT_MS = 60000;

// ── Provider detection ──────────────────────────────────────────────────────

function hasAnthropic() {
  const k = process.env.ANTHROPIC_API_KEY;
  return !!(k && !k.startsWith('your_'));
}

export function isAvailable() {
  return hasAnthropic();
}

export function getProvider() {
  if (hasAnthropic()) return 'anthropic';
  return 'none';
}

// ── Token tracking ──────────────────────────────────────────────────────────

const usage = { inputTokens: 0, outputTokens: 0, calls: 0, errors: 0 };

export function getUsageStats() {
  return { ...usage };
}

export function resetUsageStats() {
  usage.inputTokens = 0;
  usage.outputTokens = 0;
  usage.calls = 0;
  usage.errors = 0;
}

// ── Main entry points ───────────────────────────────────────────────────────

/**
 * Call Claude with a system prompt and user message. Returns text or null.
 */
export async function complete({ system, user, maxTokens = 2048, temperature = 0.3 }) {
  if (!isAvailable()) {
    console.warn('[ai] No AI provider configured');
    return null;
  }

  try {
    const aiCall = callAnthropic({ system, user, maxTokens, temperature });
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`AI call timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
    );
    const result = await Promise.race([aiCall, timeout]);
    usage.calls++;
    return result;
  } catch (err) {
    console.warn(`[ai] Call failed: ${err.message}`);
    usage.errors++;
    return null;
  }
}

/**
 * Call Claude and parse JSON response. Returns parsed object or null.
 */
export async function completeJSON(options) {
  const response = await complete({ ...options });
  if (!response) return null;
  return parseJSON(response);
}

// ── Anthropic implementation ────────────────────────────────────────────────

async function callAnthropic({ system, user, maxTokens, temperature }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const body = {
        model: MODEL,
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: user }],
      };
      if (system) body.system = system;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      // Rate limited — wait and retry
      if (res.status === 429 || res.status === 529) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[ai] Rate limited (${res.status}), waiting ${delay}ms`);
        await sleep(delay);
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[ai] API error ${res.status}: ${errText.slice(0, 200)}`);
        if (attempt < MAX_RETRIES - 1) {
          await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
        return null;
      }

      const data = await res.json();

      // Track tokens
      if (data.usage) {
        usage.inputTokens += data.usage.input_tokens || 0;
        usage.outputTokens += data.usage.output_tokens || 0;
      }

      return data.content?.[0]?.text || null;
    } catch (err) {
      console.error(`[ai] Request error: ${err.message}`);
      if (attempt < MAX_RETRIES - 1) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
      return null;
    }
  }
  return null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseJSON(text) {
  if (!text) return null;
  let cleaned = text.trim();

  // Strip markdown code fences
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '');
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract JSON object or array
    const match = cleaned.match(/[{\[][\s\S]*[}\]]/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    console.error('[ai] Failed to parse JSON:', cleaned.slice(0, 150));
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
