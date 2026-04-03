import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { hubUrl, username, password } = await req.json();

  if (!hubUrl || !username || !password) {
    return NextResponse.json({ error: "Hub URL, username, and password required" }, { status: 400 });
  }

  try {
    // Call Hub login endpoint
    const loginRes = await fetch(`${hubUrl}/api/owners/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!loginRes.ok) {
      const err = await loginRes.json().catch(() => ({ error: "Login failed" }));
      return NextResponse.json({ error: err.error || "Invalid credentials" }, { status: loginRes.status });
    }

    const { ownerId, apiKey, name } = await loginRes.json();

    // Set cookies (same as API key login)
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
