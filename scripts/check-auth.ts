#!/usr/bin/env -S deno run --allow-read

import { walk } from "https://deno.land/std@0.224.0/fs/walk.ts";
import { relative } from "https://deno.land/std@0.224.0/path/mod.ts";

const ROOT = new URL("../", import.meta.url).pathname;
const FUNCTIONS_DIR = `${ROOT}supabase/functions`;
const IGNORED = new Set([
  "_shared",
]);

interface Violation {
  path: string;
  reason: string;
}

const violations: Violation[] = [];

for await (const entry of walk(FUNCTIONS_DIR, { maxDepth: 2, includeDirs: false, match: [/index\.ts$/] })) {
  const relPath = relative(ROOT, entry.path).replaceAll("\\", "/");
  const segments = relPath.split("/");
  if (segments.length < 3) continue;
  const fnDir = segments[2];
  if (IGNORED.has(fnDir)) continue;

  const content = await Deno.readTextFile(entry.path);

  const mentionsUserId = /\buser_id\b/.test(content) || /\.invoke\(['"].+['"],\s*{[\s\S]*body:/.test(content);
  const hasAuthGuard = /getUserFromRequest/.test(content) || /\.auth\.getUser/.test(content);

  if (mentionsUserId && !hasAuthGuard) {
    violations.push({
      path: relPath,
      reason: "File references user_id or invokes functions but does not call getUserFromRequest/auth guard.",
    });
  }
}

if (violations.length > 0) {
  console.error("Auth guard check failed:\n");
  violations.forEach((v) => {
    console.error(`- ${v.path}: ${v.reason}`);
  });
  Deno.exit(1);
}

console.log("Auth guard check passed.");

