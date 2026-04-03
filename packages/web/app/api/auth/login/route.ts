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

    const cookieOpts = {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "strict" as const,
      secure: process.env.NODE_ENV === "production",
    };

    const response = NextResponse.json({ success: true, owner });
    response.cookies.set("hub_url", hubUrl, cookieOpts);
    response.cookies.set("api_key", apiKey, cookieOpts);
    response.cookies.set("owner_id", owner.ownerId, { ...cookieOpts, httpOnly: false });
    return response;
  } catch {
    return NextResponse.json({ error: "Cannot connect to Hub" }, { status: 502 });
  }
}
