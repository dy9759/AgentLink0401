import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { hubUrl, apiKey } = await req.json();

  // Verify connection
  try {
    const res = await fetch(`${hubUrl}/api/owners/me`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Invalid Hub URL or API Key" }, { status: 401 });
    }
    const owner = await res.json();

    const response = NextResponse.json({ success: true, owner });
    response.cookies.set("hub_url", hubUrl, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30 });
    response.cookies.set("api_key", apiKey, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30 });
    response.cookies.set("owner_id", owner.ownerId, { httpOnly: false, path: "/", maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch {
    return NextResponse.json({ error: "Cannot connect to Hub" }, { status: 502 });
  }
}
