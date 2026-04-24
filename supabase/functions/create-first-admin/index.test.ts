import { assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { handler } from "./index.ts";

Deno.test("create-first-admin returns 401 when Authorization header is missing", async () => {
  const request = new Request("https://example.com/functions/v1/create-first-admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "new-admin@example.com",
      password: "StrongPassword123",
    }),
  });

  const response = await handler(request);
  assertEquals(response.status, 401);
});

