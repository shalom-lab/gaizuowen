/**
 * DeepSeek client — runs in the BROWSER (and in Node for the test harness).
 *
 * There is no backend: the app is a static page, so the teacher's own API key
 * (BYOK, kept in localStorage) is sent straight to api.deepseek.com. Verified:
 * DeepSeek echoes Access-Control-Allow-Origin for browser origins.
 *
 * No Node APIs here so the same code path is exercised by the local harness.
 */

export const DEFAULT_BASE_URL = 'https://api.deepseek.com';
export const DEFAULT_MODEL = 'deepseek-flash';

/**
 * Vision input is cheap (<=1024 tokens/image) but thinking mode is verbose and
 * reasoning tokens are billed as output, so this ceiling needs real headroom.
 * A 4-page essay was observed using ~17k reasoning tokens.
 */
export const DEFAULT_MAX_TOKENS = 48000;

/**
 * Recover a JSON object from a model response that may be wrapped in markdown
 * or truncated mid-stream (thinking mode can exhaust max_tokens before the
 * closing brace). Salvages as many complete top-level elements as possible.
 */
export function extractJson(text) {
  let t = String(text || '').trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();

  try {
    return { data: JSON.parse(t), truncated: false };
  } catch {
    /* fall through to repair */
  }

  const start = t.indexOf('{');
  if (start === -1) throw new Error('模型未返回 JSON 内容');
  t = t.slice(start);

  // Drop a trailing incomplete string before closing braces.
  let body = t;
  const lastQuote = body.lastIndexOf('"');
  if (lastQuote !== -1 && body.length - lastQuote < 400) {
    const before = body.slice(0, lastQuote);
    const unescaped = (before.match(/(?<!\\)"/g) || []).length;
    if (unescaped % 2 === 1) body = before;
  }

  const closeBraces = (s) => {
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (const ch of s) {
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '{' || ch === '[') depth++;
      else if (ch === '}' || ch === ']') depth--;
    }
    return s + '}'.repeat(Math.max(0, depth));
  };

  // Progressively trim back to the last comma outside a string.
  const candidates = [];
  let probe = body;
  for (let i = 0; i < 400; i++) {
    const cut = probe.lastIndexOf(',');
    if (cut === -1) break;
    probe = probe.slice(0, cut);
    candidates.push(probe);
    if (candidates.length > 40) break;
  }

  for (const cand of [body, ...candidates]) {
    try {
      return { data: JSON.parse(closeBraces(cand)), truncated: true };
    } catch {
      /* keep trimming */
    }
  }

  throw new Error('模型返回的 JSON 不完整，请重试');
}

/**
 * Is this failure worth another try without the teacher's involvement?
 *
 * A blip on a phone should heal itself; only problems the teacher can actually
 * fix (bad key, no balance) should ever reach her.
 */
export function isRetryable(error) {
  const s = String((error && error.message) || error || '');
  // Things she must resolve herself — never retry these.
  if (/\b401\b|\b402\b|invalid api key|authentication|insufficient|balance/i.test(s)) return false;
  return /abort|timeout|timed out|ETIMEDOUT|ECONNRESET|ECONNREFUSED|fetch failed|network|load failed|socket|HTTP 5\d\d|\b429\b|rate limit|overload|繁忙|网络|截断|不完整/i.test(
    s
  );
}

/** Turn raw transport errors into something a teacher can act on. */
export function formatErrorMessage(error) {
  const raw = String((error && error.message) || error || '');
  if (/模型未返回 JSON|不完整/.test(raw)) return `${raw}（内容较长被截断，请重试一次）`;
  if (/\b401\b|invalid api key|authentication/i.test(raw)) return 'API Key 无效，请在设置中检查你的 DeepSeek API Key。';
  if (/\b402\b|insufficient|balance/i.test(raw)) return 'DeepSeek 账户余额不足，请先充值后再试。';
  if (/\b429\b|rate limit/i.test(raw)) return '请求过于频繁，请稍等几秒后重试。';
  if (/abort|timeout|ETIMEDOUT|ECONNRESET|fetch failed|socket hang up|networkerror|failed to fetch/i.test(raw)) {
    return '网络连接中断，请检查网络后重试。';
  }
  if (/\b5\d\d\b|overload/i.test(raw)) return 'DeepSeek 服务暂时繁忙，请稍后再试。';
  return raw || '批改失败，请稍后重试。';
}

/**
 * One chat completion with retry on transient failures.
 *
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {any[]}  opts.messages
 * @param {string} [opts.baseUrl]
 * @param {string} [opts.model]
 * @param {number} [opts.maxTokens]
 * @param {boolean}[opts.json]
 * @param {number} [opts.retries]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<{parsed:any, truncated:boolean, usage:any, elapsedMs:number}>}
 */
export async function callDeepSeek({
  apiKey,
  messages,
  baseUrl = DEFAULT_BASE_URL,
  model = DEFAULT_MODEL,
  maxTokens = DEFAULT_MAX_TOKENS,
  json = true,
  retries = 2,
  signal,
}) {
  if (!apiKey) throw new Error('未配置 DeepSeek API Key');

  const base = String(baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  let lastErr = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const startedAt = Date.now();
    try {
      const body = { model, messages, max_tokens: maxTokens, stream: false };
      if (json) body.response_format = { type: 'json_object' };

      // Bound each attempt so a stall cannot hang the UI forever.
      const controller = new AbortController();
      const onOuterAbort = () => controller.abort();
      if (signal) {
        if (signal.aborted) throw new Error('已取消');
        signal.addEventListener('abort', onOuterAbort, { once: true });
      }
      const budgetMs = Math.max(240000, maxTokens * 12);
      const timer = setTimeout(() => controller.abort(), budgetMs);

      let res;
      try {
        res = await fetch(`${base}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', onOuterAbort);
      }

      const text = await res.text();
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
        const transient = res.status === 429 || res.status >= 500;
        if (transient && attempt < retries) {
          await delay(1500 * (attempt + 1));
          continue;
        }
        throw lastErr;
      }

      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error('服务返回内容无法解析，请重试。');
      }

      const choice = (payload.choices && payload.choices[0]) || {};
      const content = (choice.message && choice.message.content) || '';
      const finish = choice.finish_reason;

      if (!content) {
        lastErr = new Error('模型返回空内容');
        if (attempt < retries) {
          await delay(1000);
          continue;
        }
        throw lastErr;
      }

      const { data, truncated } = extractJson(content);
      return {
        parsed: data,
        truncated: truncated || finish === 'length',
        usage: payload.usage,
        elapsedMs: Date.now() - startedAt,
      };
    } catch (err) {
      lastErr = err;
      const msg = String((err && err.message) || err);
      const retryable = /abort|timeout|fetch failed|ECONNRESET|ETIMEDOUT|socket|网络|load failed/i.test(msg);
      if (retryable && attempt < retries && !(signal && signal.aborted)) {
        await delay(1500 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw lastErr || new Error('批改失败');
}

/** Quick credential probe used by the settings panel. */
export async function verifyApiKey({ apiKey, baseUrl, model = DEFAULT_MODEL }) {
  const base = String(baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: '回复：ok' }],
      max_tokens: 4,
    }),
  });
  if (res.ok) return { ok: true };
  const text = await res.text();
  return { ok: false, error: formatErrorMessage(new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)) };
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
