import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { hubUrl, name, username, password } = await req.json();

  if (!hubUrl || !name) {
    return NextResponse.json({ error: "Hub URL and name required" }, { status: 400 });
  }

  try {
    // Create owner on Hub
    const createRes = await fetch(`${hubUrl}/api/owners`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, password }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({ error: "Registration failed" }));
      return NextResponse.json({ error: err.error || "Registration failed" }, { status: createRes.status });
    }

    const { ownerId, apiKey } = await createRes.json();

    // Auto-login: set cookies
    const cookieOpts = {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "strict" as const,
      secure: process.env.NODE_ENV === "production",
    };

    const response = NextResponse.json({ success: true, owner: { ownerId, name } });
    response.cookies.set("hub_url", hubUrl, cookieOpts);
    response.cookies.set("api_key", apiKey, cookieOpts);
    response.cookies.set("owner_id", ownerId, { ...cookieOpts, httpOnly: false });
    return response;
  } catch {
    return NextResponse.json({ error: "Cannot connect to Hub" }, { status: 502 });
  }
}
