#!/usr/bin/env -S deno run --allow-env --allow-net

const accessToken = Deno.env.get("SUPABASE_ACCESS_TOKEN");
const projectRef = Deno.env.get("SUPABASE_PROJECT_REF");
const webhookUrl = Deno.env.get("ALERT_WEBHOOK_URL");
const functionsEnv = Deno.env.get("MONITORED_FUNCTIONS") ?? "llm-chat,create-payment,jiva-embeddings-ingest";
const lookbackMinutes = Number(Deno.env.get("LOOKBACK_MINUTES") ?? "5");

if (!accessToken || !projectRef || !webhookUrl) {
  console.error("SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF и ALERT_WEBHOOK_URL обязательны.");
  Deno.exit(1);
}

const monitoredFunctions = functionsEnv
  .split(",")
  .map((f) => f.trim())
  .filter(Boolean);

if (!monitoredFunctions.length) {
  console.error("Список функций пуст. Укажите MONITORED_FUNCTIONS.");
  Deno.exit(1);
}

const since = new Date(Date.now() - lookbackMinutes * 60 * 1000).toISOString();

async function fetchLogs(fn: string) {
  const url = new URL(`https://api.supabase.com/v1/projects/${projectRef}/logs`);
  url.searchParams.set("limit", "200");
  url.searchParams.set("level", "error");
  url.searchParams.set("search", `function_name:${fn}`);
  url.searchParams.set("since", since);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch logs for ${fn}: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data?.result ?? [];
}

async function sendAlert(entries: Array<{ message: string; function_name?: string; event_message?: string }>) {
  if (!entries.length) return;

  const lines = entries.slice(0, 5).map((entry) => {
    const fn = entry.function_name ?? entry.event_message ?? "unknown";
    const msg = entry.message?.slice(0, 500) ?? "No message";
    return `• ${fn}: ${msg}`;
  });

  const payload = {
    text: `⚠️ Supabase errors (${new Date().toLocaleString()}):\n${lines.join("\n")}`,
  };

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

const alerts: Array<{ message: string; function_name?: string; event_message?: string }> = [];

for (const fn of monitoredFunctions) {
  try {
    const logs = await fetchLogs(fn);
    alerts.push(...logs.map((log: any) => ({ message: log.message || log.msg || "", function_name: fn })));
  } catch (error) {
    console.error(`[monitoring] ${fn} failed:`, error);
  }
}

if (!alerts.length) {
  console.log("Ошибок не найдено.");
  Deno.exit(0);
}

await sendAlert(alerts);
console.log(`Отправлено уведомление по ${alerts.length} ошибкам.`);

