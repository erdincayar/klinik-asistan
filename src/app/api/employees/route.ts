import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

async function upsertSalaryRecurring(
  clinicId: string,
  employeeId: string,
  employeeName: string,
  salaryGross: number | null,
  salaryNet: number | null,
  salarySSI: number | null,
  salaryPayDay: number | null
) {
  const existing = await prisma.recurringTransaction.findFirst({
    where: { clinicId, employeeId },
  });

  const hasSalary = salaryPayDay && salaryGross;

  if (hasSalary) {
    const amount = salaryGross / 100; // kuruştan TL'ye
    const netTL = salaryNet ? (salaryNet / 100).toLocaleString("tr-TR") : "0";
    const ssiTL = salarySSI ? (salarySSI / 100).toLocaleString("tr-TR") : "0";
    const grossTL = (salaryGross / 100).toLocaleString("tr-TR");
    const notes = `Net: ${netTL} TL, SGK: ${ssiTL} TL, Brüt: ${grossTL} TL`;

    if (existing) {
      await prisma.recurringTransaction.update({
        where: { id: existing.id },
        data: {
          name: `Maaş - ${employeeName}`,
          amount,
          dayOfMonth: salaryPayDay,
          notes,
        },
      });
    } else {
      await prisma.recurringTransaction.create({
        data: {
          clinicId,
          employeeId,
          type: "EXPENSE",
          category: "FIXED",
          name: `Maaş - ${employeeName}`,
          amount,
          dayOfMonth: salaryPayDay,
          notes,
        },
      });
    }
  } else if (existing) {
    await prisma.recurringTransaction.delete({ where: { id: existing.id } });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return Response.json({ error: "No clinic" }, { status: 400 });

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "create": {
        const {
          name, role, phone, email, commissionRate, color, permissions,
          salaryGross, salaryNet, salarySSI, salaryPayDay,
        } = body;
        if (!name) return Response.json({ error: "Name required" }, { status: 400 });

        const grossVal = salaryGross ? parseInt(salaryGross) : null;
        const netVal = salaryNet ? parseInt(salaryNet) : null;
        const ssiVal = salarySSI ? parseInt(salarySSI) : null;
        const payDayVal = salaryPayDay ? parseInt(salaryPayDay) : null;

        const employee = await prisma.employee.create({
          data: {
            name,
            role: role || "ASISTAN",
            phone: phone || null,
            email: email || null,
            commissionRate: parseInt(commissionRate) || 0,
            color: color || "#3b82f6",
            permissions: permissions || null,
            isActive: true,
            salaryGross: grossVal,
            salaryNet: netVal,
            salarySSI: ssiVal,
            salaryPayDay: payDayVal,
            clinicId,
          },
        });

        await upsertSalaryRecurring(clinicId, employee.id, name, grossVal, netVal, ssiVal, payDayVal);

        return Response.json({ success: true, employee });
      }
      case "update": {
        const {
          id, name, role, phone, email, commissionRate, isActive, color, permissions,
          salaryGross, salaryNet, salarySSI, salaryPayDay,
        } = body;
        if (!id) return Response.json({ error: "ID required" }, { status: 400 });

        const existingEmp = await prisma.employee.findFirst({
          where: { id, clinicId },
        });
        if (!existingEmp) {
          return Response.json({ error: "Calisan bulunamadi" }, { status: 404 });
        }

        const updateData: Record<string, any> = {};
        if (name !== undefined) updateData.name = name;
        if (role !== undefined) updateData.role = role;
        if (phone !== undefined) updateData.phone = phone;
        if (email !== undefined) updateData.email = email;
        if (commissionRate !== undefined) updateData.commissionRate = parseInt(commissionRate);
        if (isActive !== undefined) updateData.isActive = isActive;
        if (color !== undefined) updateData.color = color;
        if (permissions !== undefined) updateData.permissions = permissions;

        if (salaryGross !== undefined) updateData.salaryGross = salaryGross ? parseInt(salaryGross) : null;
        if (salaryNet !== undefined) updateData.salaryNet = salaryNet ? parseInt(salaryNet) : null;
        if (salarySSI !== undefined) updateData.salarySSI = salarySSI ? parseInt(salarySSI) : null;
        if (salaryPayDay !== undefined) updateData.salaryPayDay = salaryPayDay ? parseInt(salaryPayDay) : null;

        const employee = await prisma.employee.update({
          where: { id },
          data: updateData,
        });

        // Update recurring if salary fields were touched
        if (salaryGross !== undefined || salaryNet !== undefined || salarySSI !== undefined || salaryPayDay !== undefined) {
          await upsertSalaryRecurring(
            clinicId,
            id,
            employee.name,
            employee.salaryGross,
            employee.salaryNet,
            employee.salarySSI,
            employee.salaryPayDay
          );
        }

        return Response.json({ success: true, employee });
      }
      case "delete": {
        const { id } = body;
        if (!id) return Response.json({ error: "ID required" }, { status: 400 });

        const empToDelete = await prisma.employee.findFirst({
          where: { id, clinicId },
        });
        if (!empToDelete) {
          return Response.json({ error: "Çalışan bulunamadı" }, { status: 404 });
        }

        // Delete associated recurring transactions first
        await prisma.recurringTransaction.deleteMany({
          where: { employeeId: id, clinicId },
        });

        await prisma.employee.delete({ where: { id } });
        return Response.json({ success: true });
      }
      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
