import { assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { handler } from "./index.ts";

const URL = "https://example.com/functions/v1/auto-comment-post";

Deno.test("auto-comment-post: OPTIONS returns CORS headers", async () => {
  const res = await handler(new Request(URL, { method: "OPTIONS" }));
  assertEquals(res.status, 200);
});

Deno.test("auto-comment-post: returns 403 without secret or JWT", async () => {
  const res = await handler(
    new Request(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: "abc", postContent: "hello" }),
    }),
  );
  assertEquals(res.status, 403);
  const body = await res.json();
  assertEquals(body.error, "Forbidden");
});

Deno.test("auto-comment-post: returns 403 with wrong internal secret", async () => {
  const res = await handler(
    new Request(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": "definitely-wrong-secret",
      },
      body: JSON.stringify({ postId: "abc", postContent: "hello" }),
    }),
  );
  assertEquals(res.status, 403);
});

Deno.test("auto-comment-post: returns 400 when postId/postContent missing (with valid secret)", async () => {
  const secret = Deno.env.get("INTERNAL_FUNCTION_SECRET");
  if (!secret) {
    console.warn("[skip] INTERNAL_FUNCTION_SECRET not set in test env");
    return;
  }
  const res = await handler(
    new Request(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": secret,
      },
      body: JSON.stringify({}),
    }),
  );
  assertEquals(res.status, 400);
});
