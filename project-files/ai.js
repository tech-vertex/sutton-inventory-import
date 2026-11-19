// Minimal OpenRouter client. No dependencies; works in Node 18+, Bun, Deno and browsers.
// OpenRouter is OpenAI-compatible, so the OpenAI SDK also works with baseURL "https://openrouter.ai/api/v1".
//
//   import { ask, askJson } from "./ai.js";
//   const text = await ask("Suggest a column mapping for these headers: ...");
//   const obj = await askJson("Return {\"category\": ...} for this row: ...");
//
// The key is read from OPENROUTER_API_KEY unless you pass { apiKey }.
// Prefer calling this from a server route so the key is not shipped to the browser.

const BASE_URL = "https://openrouter.ai/api/v1";

export async function chat(messages, { model = "openrouter/auto", apiKey, ...rest } = {}) {
  const key = apiKey ?? globalThis.process?.env?.OPENROUTER_API_KEY;
  if (!key) throw new Error("Set OPENROUTER_API_KEY or pass { apiKey }");
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, ...rest }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

export const ask = (prompt, opts) => chat([{ role: "user", content: prompt }], opts);

export async function askJson(prompt, opts) {
  const text = await chat(
    [
      { role: "system", content: "Reply with a single JSON value and nothing else." },
      { role: "user", content: prompt },
    ],
    { response_format: { type: "json_object" }, ...opts },
  );
  return JSON.parse(text.replace(/^```(json)?|```$/g, "").trim());
}
