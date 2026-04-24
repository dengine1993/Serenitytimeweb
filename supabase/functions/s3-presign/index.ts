import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_FOLDERS = ['avatars', 'community', 'chat', 'audio'] as const;
type FolderType = typeof ALLOWED_FOLDERS[number];

// Helper to convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Helper to convert ArrayBuffer to hex string
function bytesToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// HMAC-SHA256 using Web Crypto API
async function hmacSha256(key: Uint8Array | string, data: string): Promise<Uint8Array> {
  const keyData = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  // Convert to ArrayBuffer to satisfy Deno's stricter types
  const keyBuffer = keyData.buffer.slice(keyData.byteOffset, keyData.byteOffset + keyData.byteLength) as ArrayBuffer;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  return new Uint8Array(signature);
}

// SHA-256 hash
async function sha256(data: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return bytesToHex(hashBuffer);
}

// Generate AWS Signature v4
async function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<Uint8Array> {
  const kDate = await hmacSha256('AWS4' + secretKey, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  return kSigning;
}

// Create presigned URL using AWS Signature v4
async function createPresignedUrl(
  endpoint: string,
  bucket: string,
  key: string,
  accessKeyId: string,
  secretAccessKey: string,
  contentType: string,
  expiresIn: number = 300
): Promise<string> {
  const region = 'ru-1';
  const service = 's3';
  // Normalize endpoint - remove trailing slash to avoid double slashes
  const cleanEndpoint = endpoint.replace(/\/+$/, '');
  const url = new URL(cleanEndpoint);
  const host = url.host;
  
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const signedHeaders = 'host';
  
  // Build canonical query string (sorted)
  const queryParams = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${accessKeyId}/${credentialScope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', expiresIn.toString()],
    ['X-Amz-SignedHeaders', signedHeaders],
  ];
  
  const canonicalQuerystring = queryParams
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  
  // Build canonical request
  const canonicalUri = `/${bucket}/${key}`;
  const canonicalHeaders = `host:${host}\n`;
  const payloadHash = 'UNSIGNED-PAYLOAD';
  
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  
  // Create string to sign
  const canonicalRequestHash = await sha256(canonicalRequest);
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');
  
  // Calculate signature
  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signatureBytes = await hmacSha256(signingKey, stringToSign);
  const signatureBuffer = signatureBytes.buffer.slice(signatureBytes.byteOffset, signatureBytes.byteOffset + signatureBytes.byteLength) as ArrayBuffer;
  const signature = bytesToHex(signatureBuffer);
  
  // Build final URL (use cleanEndpoint to avoid double slashes)
  return `${cleanEndpoint}/${bucket}/${key}?${canonicalQuerystring}&X-Amz-Signature=${signature}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const s3AccessKeyId = Deno.env.get('S3_ACCESS_KEY_ID');
    const s3SecretAccessKey = Deno.env.get('S3_SECRET_ACCESS_KEY');
    const s3Endpoint = Deno.env.get('S3_ENDPOINT');
    const s3Bucket = Deno.env.get('S3_BUCKET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!s3AccessKeyId || !s3SecretAccessKey || !s3Endpoint || !s3Bucket) {
      console.error('Missing S3 configuration');
      return new Response(
        JSON.stringify({ error: 'S3 configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { folder, fileName, contentType } = await req.json();

    // Validate folder
    if (!folder || !ALLOWED_FOLDERS.includes(folder as FolderType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid folder. Must be one of: ' + ALLOWED_FOLDERS.join(', ') }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate fileName
    if (!fileName || typeof fileName !== 'string') {
      return new Response(
        JSON.stringify({ error: 'fileName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate contentType
    if (!contentType || typeof contentType !== 'string') {
      return new Response(
        JSON.stringify({ error: 'contentType is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize fileName - remove path traversal attempts
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Generate unique key
    const timestamp = Date.now();
    const key = `${folder}/${user.id}/${timestamp}_${sanitizedFileName}`;

    console.log(`Generating presigned URL for: ${key}`);

    // Generate presigned URL using native Web Crypto API
    const presignedUrl = await createPresignedUrl(
      s3Endpoint,
      s3Bucket,
      key,
      s3AccessKeyId,
      s3SecretAccessKey,
      contentType,
      300 // 5 minutes
    );

    // Generate public URL (normalize endpoint)
    const cleanS3Endpoint = s3Endpoint.replace(/\/+$/, '');
    const publicUrl = `${cleanS3Endpoint}/${s3Bucket}/${key}`;

    console.log(`Generated presigned URL for user ${user.id}, key: ${key}`);

    return new Response(
      JSON.stringify({ 
        presignedUrl, 
        publicUrl,
        key 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in s3-presign:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
