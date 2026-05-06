// Shared SMTP sender for transactional emails.
// Raw SMTP over TLS — no denomailer dependency.
// All content encoded as base64 to avoid quoted-printable issues on Timeweb webmail.
// Reads SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD from env.

export const DEFAULT_FROM_EMAIL = "info@newdawnjourney.com";
export const DEFAULT_FROM_NAME = "Восход";

export interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  fromEmail?: string;
  fromName?: string;
}

export interface SendMailResult {
  ok: boolean;
  error?: string;
}

function getConfig() {
  const host = Deno.env.get("SMTP_HOST")?.trim();
  const portRaw = Deno.env.get("SMTP_PORT")?.trim();
  const user = Deno.env.get("SMTP_USER")?.trim();
  const pass = Deno.env.get("SMTP_PASSWORD");

  if (!host || !portRaw || !user || !pass) {
    return null;
  }
  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    return null;
  }
  const tls = port === 465;
  return { host, port, user, pass, tls };
}

// RFC 2047 base64 encoded-word for headers (subject, from name)
function encodeRfc2047(text: string): string {
  // Only encode if non-ASCII
  if (/^[\x20-\x7E]*$/.test(text)) return text;
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

// Base64-encode a UTF-8 string, with line wrapping at 76 chars
function base64Body(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const raw = btoa(binary);
  // Wrap at 76 characters per RFC 2045
  const lines: string[] = [];
  for (let i = 0; i < raw.length; i += 76) {
    lines.push(raw.slice(i, i + 76));
  }
  return lines.join("\r\n");
}

// Simple plain-text extraction from HTML
function htmlToPlain(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function readLine(reader: ReadableStreamDefaultReader<Uint8Array>, buffer: { data: string }): Promise<string> {
  while (true) {
    const idx = buffer.data.indexOf("\r\n");
    if (idx !== -1) {
      const line = buffer.data.slice(0, idx);
      buffer.data = buffer.data.slice(idx + 2);
      return line;
    }
    const { value, done } = await reader.read();
    if (done) throw new Error("Connection closed unexpectedly");
    buffer.data += decoder.decode(value, { stream: true });
  }
}

async function readResponse(reader: ReadableStreamDefaultReader<Uint8Array>, buffer: { data: string }): Promise<{ code: number; text: string }> {
  let fullText = "";
  while (true) {
    const line = await readLine(reader, buffer);
    fullText += line + "\n";
    const code = parseInt(line.slice(0, 3), 10);
    // Multi-line response: "250-..." continues, "250 ..." is final
    if (line.length >= 4 && line[3] === "-") continue;
    return { code, text: fullText.trim() };
  }
}

async function writeCmd(writer: WritableStreamDefaultWriter<Uint8Array>, ...parts: string[]) {
  const line = parts.join(" ") + "\r\n";
  await writer.write(encoder.encode(line));
}

async function writeCmdAndAssert(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  reader: ReadableStreamDefaultReader<Uint8Array>,
  buffer: { data: string },
  expectedCode: number,
  ...parts: string[]
): Promise<string> {
  await writeCmd(writer, ...parts);
  const resp = await readResponse(reader, buffer);
  if (resp.code !== expectedCode) {
    throw new Error(`SMTP expected ${expectedCode}, got ${resp.code}: ${resp.text}`);
  }
  return resp.text;
}

export async function sendMail(params: SendMailParams): Promise<SendMailResult> {
  const cfg = getConfig();
  if (!cfg) {
    const msg = "SMTP not configured (SMTP_HOST/PORT/USER/PASSWORD missing)";
    console.warn("[smtp]", msg);
    return { ok: false, error: msg };
  }

  const fromEmail = params.fromEmail ?? DEFAULT_FROM_EMAIL;
  const fromName = params.fromName ?? DEFAULT_FROM_NAME;

  const timeoutMs = 15_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let conn: Deno.TlsConn | Deno.TcpConn | null = null;

  try {
    // Connect
    if (cfg.tls) {
      conn = await Deno.connectTls({ hostname: cfg.host, port: cfg.port });
    } else {
      conn = await Deno.connect({ hostname: cfg.host, port: cfg.port });
    }

    const readable = conn.readable.getReader();
    const writable = conn.writable.getWriter();
    const buf = { data: "" };

    // Greeting
    const greeting = await readResponse(readable, buf);
    if (greeting.code !== 220) throw new Error(`SMTP greeting failed: ${greeting.text}`);

    // EHLO
    await writeCmdAndAssert(writable, readable, buf, 250, "EHLO", "localhost");

    // AUTH LOGIN
    await writeCmd(writable, "AUTH LOGIN");
    const authResp = await readResponse(readable, buf);
    if (authResp.code !== 334) throw new Error(`AUTH LOGIN rejected: ${authResp.text}`);

    await writeCmd(writable, btoa(cfg.user));
    const userResp = await readResponse(readable, buf);
    if (userResp.code !== 334) throw new Error(`AUTH username rejected: ${userResp.text}`);

    await writeCmd(writable, btoa(cfg.pass));
    const passResp = await readResponse(readable, buf);
    if (passResp.code !== 235) throw new Error(`AUTH password rejected: ${passResp.text}`);

    // MAIL FROM
    await writeCmdAndAssert(writable, readable, buf, 250, `MAIL FROM:<${fromEmail}>`);

    // RCPT TO
    await writeCmdAndAssert(writable, readable, buf, 250, `RCPT TO:<${params.to}>`);

    // DATA
    await writeCmdAndAssert(writable, readable, buf, 354, "DATA");

    // Build MIME message
    const boundary = "----=_Part_" + crypto.randomUUID().replace(/-/g, "");
    const encodedSubject = encodeRfc2047(params.subject);
    const encodedFromName = encodeRfc2047(fromName);
    const plainText = htmlToPlain(params.html);

    const headers = [
      `From: ${encodedFromName} <${fromEmail}>`,
      `To: <${params.to}>`,
      `Subject: ${encodedSubject}`,
      `Date: ${new Date().toUTCString()}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ];
    if (params.replyTo) {
      headers.push(`Reply-To: <${params.replyTo}>`);
    }

    const plainBase64 = base64Body(plainText);
    const htmlBase64 = base64Body(params.html);

    const message = [
      ...headers,
      "",
      `--${boundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: base64`,
      "",
      plainBase64,
      "",
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: base64`,
      "",
      htmlBase64,
      "",
      `--${boundary}--`,
    ].join("\r\n");

    // Send message data, then terminate with \r\n.\r\n
    await writable.write(encoder.encode(message + "\r\n.\r\n"));
    const dataResp = await readResponse(readable, buf);
    if (dataResp.code !== 250) throw new Error(`DATA rejected: ${dataResp.text}`);

    // QUIT
    try {
      await writeCmd(writable, "QUIT");
    } catch {
      // ignore
    }

    clearTimeout(timer);
    return { ok: true };
  } catch (e) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[smtp] send failed", msg);
    return { ok: false, error: msg.slice(0, 500) };
  } finally {
    try {
      conn?.close();
    } catch {
      // ignore
    }
  }
}
