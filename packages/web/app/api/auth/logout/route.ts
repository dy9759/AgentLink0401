import { NextResponse } from "next/server";
export async function POST() {
  const res = NextResponse.json({ success: true });
  // Clear ALL auth-related cookies
  res.cookies.delete("hub_url");
  res.cookies.delete("api_key");
  res.cookies.delete("owner_id");
  res.cookies.delete("identity");
  res.cookies.delete("agent_id");
  res.cookies.delete("agent_token");
  return res;
}
