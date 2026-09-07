import assert from "node:assert/strict";
import test from "node:test";

import { runHealthCheck } from "../netlify/functions/supabase-keep-alive.mjs";

const ENV = {
  VITE_SUPABASE_URL: "https://example.supabase.co",
  VITE_SUPABASE_ANON_KEY: "test-publishable-key",
};

function createLogger() {
  const messages = [];
  return {
    messages,
    logger: {
      info(message) {
        messages.push(message);
      },
    },
  };
}

test("successful health check returns the expected payload", async () => {
  const checkedAt = "2026-09-07T16:20:00.000Z";
  const { logger, messages } = createLogger();
  let request;

  const payload = await runHealthCheck({
    env: ENV,
    logger,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        status: 200,
        async json() {
          return { ok: true, checked_at: checkedAt };
        },
      };
    },
  });

  assert.deepEqual(payload, { ok: true, checked_at: checkedAt });
  assert.equal(
    request.url,
    "https://example.supabase.co/rest/v1/rpc/keep_alive_healthcheck",
  );
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers.apikey, ENV.VITE_SUPABASE_ANON_KEY);
  assert.equal(request.options.headers.Authorization, undefined);
  assert.equal(request.options.body, "{}");
  assert.equal(messages.length, 1);
  assert.match(messages[0], /health check succeeded/);
  assert.doesNotMatch(messages[0], /test-publishable-key/);
});

test("missing environment variables fail before making a request", async () => {
  let fetchCalled = false;

  await assert.rejects(
    runHealthCheck({
      env: {},
      fetchImpl: async () => {
        fetchCalled = true;
      },
    }),
    /Missing required environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY/,
  );

  assert.equal(fetchCalled, false);
});

test("Supabase HTTP failures are reported without response body or keys", async () => {
  await assert.rejects(
    runHealthCheck({
      env: ENV,
      fetchImpl: async () => ({
        ok: false,
        status: 503,
        async json() {
          return { message: "do not log this response body" };
        },
      }),
    }),
    (error) => {
      assert.match(error.message, /HTTP failure \(503\)/);
      assert.doesNotMatch(error.message, /test-publishable-key/);
      assert.doesNotMatch(error.message, /do not log this response body/);
      return true;
    },
  );
});

test("unexpected RPC responses are rejected", async () => {
  await assert.rejects(
    runHealthCheck({
      env: ENV,
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        async json() {
          return {
            ok: true,
            checked_at: "2026-09-07T16:20:00.000Z",
            unexpected: "application data must never appear here",
          };
        },
      }),
    }),
    /unexpected RPC response/,
  );
});
