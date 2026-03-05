import { prisma } from "./prisma";

const DEFAULT_BALANCE = 50000;

export async function getBalance(clinicId: string) {
  let balance = await prisma.tokenBalance.findUnique({
    where: { clinicId },
  });

  if (!balance) {
    balance = await prisma.tokenBalance.create({
      data: { clinicId, balance: DEFAULT_BALANCE },
    });
  }

  return balance;
}

export async function checkBalance(clinicId: string, cost: number): Promise<boolean> {
  const balance = await getBalance(clinicId);
  return balance.balance >= cost;
}

export async function deductTokens(
  clinicId: string,
  action: string,
  cost: number,
  description?: string
) {
  const balance = await getBalance(clinicId);
  const newBalance = Math.max(0, balance.balance - cost);

  const [updated] = await prisma.$transaction([
    prisma.tokenBalance.update({
      where: { clinicId },
      data: {
        balance: newBalance,
        totalUsed: { increment: cost },
      },
    }),
    prisma.tokenTransaction.create({
      data: {
        clinicId,
        type: "USE",
        amount: cost,
        action,
        description: description || action,
        balanceAfter: newBalance,
      },
    }),
  ]);

  return updated;
}

export async function addTokens(
  clinicId: string,
  amount: number,
  description?: string
) {
  const balance = await getBalance(clinicId);
  const newBalance = balance.balance + amount;

  const [updated] = await prisma.$transaction([
    prisma.tokenBalance.update({
      where: { clinicId },
      data: {
        balance: newBalance,
        totalBought: { increment: amount },
      },
    }),
    prisma.tokenTransaction.create({
      data: {
        clinicId,
        type: "ADD",
        amount,
        action: "TOKEN_PURCHASE",
        description: description || "Token eklendi",
        balanceAfter: newBalance,
      },
    }),
  ]);

  return updated;
}

export async function getHistory(clinicId: string, limit = 50) {
  return prisma.tokenTransaction.findMany({
    where: { clinicId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
