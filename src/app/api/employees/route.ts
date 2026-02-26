import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const clinicId = (session.user as any).clinicId;
  if (!clinicId) return Response.json({ error: "No clinic" }, { status: 400 });

  const employees = await prisma.employee.findMany({
    where: { clinicId },
    orderBy: { createdAt: "desc" },
  });

  // Get performance data for each employee
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const employeesWithStats = await Promise.all(
    employees.map(async (emp) => {
      const [totalTreatments, monthlyTreatments] = await Promise.all([
        prisma.treatment.aggregate({
          where: { clinicId, employeeId: emp.id },
          _sum: { amount: true },
          _count: { id: true },
        }),
        prisma.treatment.aggregate({
          where: { clinicId, employeeId: emp.id, date: { gte: monthStart, lt: monthEnd } },
          _sum: { amount: true },
          _count: { id: true },
        }),
      ]);

      const totalRevenue = (totalTreatments._sum.amount || 0) / 100;
      const monthlyRevenue = (monthlyTreatments._sum.amount || 0) / 100;

      return {
        ...emp,
        totalRevenue,
        totalTreatmentCount: totalTreatments._count.id || 0,
        monthlyRevenue,
        monthlyTreatmentCount: monthlyTreatments._count.id || 0,
        totalCommission: Math.round(totalRevenue * emp.commissionRate / 100),
        monthlyCommission: Math.round(monthlyRevenue * emp.commissionRate / 100),
      };
    })
  );

  return Response.json({ employees: employeesWithStats });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const clinicId = (session.user as any).clinicId;
  if (!clinicId) return Response.json({ error: "No clinic" }, { status: 400 });

  const body = await req.json();
  const { action } = body;

  switch (action) {
    case "create": {
      const { name, role, phone, email, commissionRate } = body;
      if (!name) return Response.json({ error: "Name required" }, { status: 400 });

      const employee = await prisma.employee.create({
        data: {
          name,
          role: role || "ASISTAN",
          phone: phone || null,
          email: email || null,
          commissionRate: parseInt(commissionRate) || 0,
          isActive: true,
          clinicId,
        },
      });
      return Response.json({ success: true, employee });
    }
    case "update": {
      const { id, name, role, phone, email, commissionRate, isActive } = body;
      const employee = await prisma.employee.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(role !== undefined && { role }),
          ...(phone !== undefined && { phone }),
          ...(email !== undefined && { email }),
          ...(commissionRate !== undefined && { commissionRate: parseInt(commissionRate) }),
          ...(isActive !== undefined && { isActive }),
        },
      });
      return Response.json({ success: true, employee });
    }
    case "delete": {
      const { id } = body;
      await prisma.employee.delete({ where: { id } });
      return Response.json({ success: true });
    }
    default:
      return Response.json({ error: "Invalid action" }, { status: 400 });
  }
}
