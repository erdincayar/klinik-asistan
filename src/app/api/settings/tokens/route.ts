// TOKEN_SYSTEM_DISABLED — Token sistemi devre dışı bırakıldı. İleride tekrar aktif edilecek.
// import { auth } from "@/lib/auth";
// import { getBalance, getHistory, addTokens } from "@/lib/token-service";

export async function GET() {
  return Response.json({ disabled: true, balance: null, history: [] });
}

export async function POST() {
  return Response.json({ disabled: true, message: "Token sistemi şu anda devre dışı." });
}
