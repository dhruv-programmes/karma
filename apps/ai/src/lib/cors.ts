import { NextResponse } from "next/server";

const ALLOW_HEADERS =
  "Authorization, Content-Type, X-Document-Context, x-vercel-ai-ui-message-stream";

export function corsHeaders(origin?: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
    "Access-Control-Expose-Headers": "x-vercel-ai-ui-message-stream",
  };
}

export function withCors(res: Response, req: Request): Response {
  const headers = new Headers(res.headers);
  const origin = req.headers.get("origin");
  for (const [k, v] of Object.entries(corsHeaders(origin))) {
    headers.set(k, v);
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export function optionsResponse(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

export function jsonError(
  status: number,
  message: string,
  req: Request
): Response {
  return withCors(
    NextResponse.json({ error: message, detail: message }, { status }),
    req
  );
}
