import { MODULE_DEFINITIONS } from "@/lib/onboarding/module-definitions";

export async function GET() {
  return Response.json(MODULE_DEFINITIONS);
}
