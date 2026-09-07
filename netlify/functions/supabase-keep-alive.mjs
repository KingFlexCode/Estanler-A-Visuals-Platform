const HEALTHCHECK_RPC_PATH = "/rest/v1/rpc/keep_alive_healthcheck";
const REQUIRED_ENVIRONMENT_VARIABLES = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
];

function readConfig(env) {
  const missing = REQUIRED_ENVIRONMENT_VARIABLES.filter(
    (name) => typeof env?.[name] !== "string" || env[name].trim() === "",
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  return {
    supabaseUrl: env.VITE_SUPABASE_URL.replace(/\/+$/, ""),
    publishableKey: env.VITE_SUPABASE_ANON_KEY,
  };
}

function isExpectedPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }

  const keys = Object.keys(payload).sort();
  if (keys.length !== 2 || keys[0] !== "checked_at" || keys[1] !== "ok") {
    return false;
  }

  return (
    payload.ok === true &&
    typeof payload.checked_at === "string" &&
    Number.isFinite(Date.parse(payload.checked_at))
  );
}

export async function runHealthCheck({
  env = process.env,
  fetchImpl = globalThis.fetch,
  logger = console,
} = {}) {
  const { supabaseUrl, publishableKey } = readConfig(env);

  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch API is unavailable in this runtime.");
  }

  const response = await fetchImpl(`${supabaseUrl}${HEALTHCHECK_RPC_PATH}`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      "Content-Type": "application/json",
    },
    body: "{}",
  });

  if (!response.ok) {
    throw new Error(`Supabase health check HTTP failure (${response.status}).`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Supabase health check returned an unexpected RPC response.");
  }

  if (!isExpectedPayload(payload)) {
    throw new Error("Supabase health check returned an unexpected RPC response.");
  }

  logger.info(
    `[supabase-keep-alive] health check succeeded at ${payload.checked_at}`,
  );

  return payload;
}

export default async function handler() {
  try {
    await runHealthCheck();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown health check failure.";
    console.error(`[supabase-keep-alive] health check failed: ${message}`);
    throw error;
  }
}
