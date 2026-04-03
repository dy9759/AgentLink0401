import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Switch identity: owner ↔ agent
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const hubUrl = cookieStore.get("hub_url")?.value;
  const apiKey = cookieStore.get("api_key")?.value;

  if (!hubUrl || !apiKey) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();

  if (body.identity === "owner") {
    // Switch back to owner
    const res = NextResponse.json({ success: true, identity: "owner" });
    res.cookies.delete("agent_id");
    res.cookies.delete("agent_token");
    res.cookies.set("identity", "owner", { httpOnly: false, path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production" });
    return res;
  }

  if (body.identity === "agent" && body.agentId) {
    // Get agent token from Hub
    const tokenRes = await fetch(`${hubUrl}/api/agents/${body.agentId}/token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return NextResponse.json({ error: `Failed to get agent token: ${err}` }, { status: tokenRes.status });
    }

    const { agentId, agentToken } = await tokenRes.json();

    const res = NextResponse.json({ success: true, identity: "agent", agentId });
    const sameSiteOpts = { sameSite: "strict" as const, secure: process.env.NODE_ENV === "production" };
    res.cookies.set("agent_id", agentId, { httpOnly: false, path: "/", maxAge: 3600, ...sameSiteOpts });
    res.cookies.set("agent_token", agentToken, { httpOnly: true, path: "/", maxAge: 3600, ...sameSiteOpts });
    res.cookies.set("identity", "agent", { httpOnly: false, path: "/", maxAge: 60 * 60 * 24 * 30, ...sameSiteOpts });
    return res;
  }

  return NextResponse.json({ error: "Invalid identity" }, { status: 400 });
}
