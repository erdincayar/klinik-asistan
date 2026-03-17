import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = (session.user as any).clinicId;
  if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel");

  const conversations = await prisma.clinicConversation.findMany({
    where: {
      clinicId,
      ...(channel && channel !== "all" ? { channel } : {}),
    },
    select: {
      id: true,
      channel: true,
      customerPhone: true,
      customerChatId: true,
      customerName: true,
      lastMessageAt: true,
      messages: true,
      createdAt: true,
    },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });

  // Add last message preview
  const result = conversations.map((c) => {
    const msgs = c.messages as Array<{ role: string; content: string }>;
    const lastMsg = msgs[msgs.length - 1];
    return {
      ...c,
      lastMessage: lastMsg?.content?.slice(0, 100) || "",
      messageCount: msgs.length,
      messages: undefined, // Don't send full messages in list
    };
  });

  return NextResponse.json(result);
}
