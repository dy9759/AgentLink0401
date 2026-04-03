import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

async function proxyToHub(request: NextRequest, path: string) {
  const cookieStore = await cookies();
  const hubUrl = cookieStore.get("hub_url")?.value;
  const apiKey = cookieStore.get("api_key")?.value;

  if (!hubUrl || !apiKey) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = `${hubUrl}/api/${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };

  // Forward content-type for non-GET
  const ct = request.headers.get("content-type");
  if (ct) headers["Content-Type"] = ct;

  const body = request.method !== "GET" && request.method !== "HEAD"
    ? await request.text()
    : undefined;

  const res = await fetch(url, {
    method: request.method,
    headers,
    body,
  });

  const data = res.status === 204 ? null : await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyToHub(req, path.join("/"));
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyToHub(req, path.join("/"));
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyToHub(req, path.join("/"));
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyToHub(req, path.join("/"));
}
