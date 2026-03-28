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
      include: {
        customValues: true,
        commissionTiers: { orderBy: { sortOrder: "asc" } },
      },
    });

    // Get performance data for each employee
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const employeesWithStats = await Promise.all(
      employees.map(async (emp) => {
        const [totalTreatments, monthlyTreatments, monthlyAppointments] = await Promise.all([
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
          prisma.appointment.findMany({
            where: { clinicId, employeeId: emp.id, date: { gte: monthStart, lt: monthEnd } },
            select: { id: true, treatmentType: true, date: true, status: true },
          }),
        ]);

        const totalRevenue = (totalTreatments._sum.amount || 0) / 100;
        const monthlyRevenue = (monthlyTreatments._sum.amount || 0) / 100;

        // Collect distinct treatment types from appointments
        const appointmentTypes = Array.from(new Set(monthlyAppointments.map((a) => a.treatmentType)));

        // Calculate commission — tiered or flat
        function calcCommission(revenue: number): number {
          if (emp.tieredCommission && emp.commissionTiers.length > 0) {
            // Find the highest tier that the revenue qualifies for
            const tiers = [...emp.commissionTiers].sort((a, b) => b.minRevenue - a.minRevenue);
            for (const tier of tiers) {
              if (revenue * 100 >= tier.minRevenue) {
                return Math.round(revenue * tier.commissionPct / 100);
              }
            }
            return 0; // Below minimum tier
          }
          return Math.round(revenue * emp.commissionRate / 100);
        }

        return {
          ...emp,
          totalRevenue,
          totalTreatmentCount: totalTreatments._count.id || 0,
          monthlyRevenue,
          monthlyTreatmentCount: monthlyTreatments._count.id || 0,
          totalCommission: calcCommission(totalRevenue),
          monthlyCommission: calcCommission(monthlyRevenue),
          monthlyAppointmentCount: monthlyAppointments.length,
          appointmentTypes,
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
          salaryGross, salaryNet, salarySSI, salaryPayDay, manualSalaryEntry,
          tieredCommission, commissionTiers,
        } = body;
        if (!name) return Response.json({ error: "Name required" }, { status: 400 });

        const grossVal = salaryGross ? parseInt(salaryGross) : null;
        const netVal = salaryNet ? parseInt(salaryNet) : null;
        const ssiVal = salarySSI ? parseInt(salarySSI) : null;
        const payDayVal = salaryPayDay ? parseInt(salaryPayDay) : null;

        const employee = await prisma.employee.create({
          data: {
            name,
            role: role || "",
            phone: phone || null,
            email: email || null,
            commissionRate: parseInt(commissionRate) || 0,
            tieredCommission: tieredCommission || false,
            color: color || "#3b82f6",
            permissions: permissions || null,
            isActive: true,
            salaryGross: grossVal,
            salaryNet: netVal,
            salarySSI: ssiVal,
            salaryPayDay: payDayVal,
            manualSalaryEntry: manualSalaryEntry || false,
            clinicId,
          },
        });

        // Create commission tiers if tiered commission is enabled
        if (tieredCommission && Array.isArray(commissionTiers) && commissionTiers.length > 0) {
          await prisma.commissionTier.createMany({
            data: commissionTiers.map((tier: any, i: number) => ({
              employeeId: employee.id,
              minRevenue: Math.round(parseFloat(tier.minRevenue) * 100),
              commissionPct: parseFloat(tier.commissionPct),
              sortOrder: i,
            })),
          });
        }

        await upsertSalaryRecurring(clinicId, employee.id, name, grossVal, netVal, ssiVal, payDayVal);

        return Response.json({ success: true, employee });
      }
      case "update": {
        const {
          id, name, role, phone, email, commissionRate, isActive, color, permissions,
          salaryGross, salaryNet, salarySSI, salaryPayDay, manualSalaryEntry, updateMode,
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
        if (body.tieredCommission !== undefined) updateData.tieredCommission = body.tieredCommission;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (color !== undefined) updateData.color = color;
        if (permissions !== undefined) updateData.permissions = permissions;
        if (manualSalaryEntry !== undefined) updateData.manualSalaryEntry = manualSalaryEntry;

        if (salaryGross !== undefined) updateData.salaryGross = salaryGross ? parseInt(salaryGross) : null;
        if (salaryNet !== undefined) updateData.salaryNet = salaryNet ? parseInt(salaryNet) : null;
        if (salarySSI !== undefined) updateData.salarySSI = salarySSI ? parseInt(salarySSI) : null;
        if (salaryPayDay !== undefined) updateData.salaryPayDay = salaryPayDay ? parseInt(salaryPayDay) : null;

        const employee = await prisma.employee.update({
          where: { id },
          data: updateData,
        });

        // Update commission tiers if provided
        if (body.commissionTiers !== undefined) {
          // Delete existing tiers
          await prisma.commissionTier.deleteMany({ where: { employeeId: id } });
          // Create new tiers
          if (body.tieredCommission && Array.isArray(body.commissionTiers) && body.commissionTiers.length > 0) {
            await prisma.commissionTier.createMany({
              data: body.commissionTiers.map((tier: any, i: number) => ({
                employeeId: id,
                minRevenue: Math.round(parseFloat(tier.minRevenue) * 100),
                commissionPct: parseFloat(tier.commissionPct),
                sortOrder: i,
              })),
            });
          }
        }

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

          // If updateMode is all_history or correction, update all past recurring payments
          if (updateMode === "all_history" || updateMode === "correction") {
            const recurringTx = await prisma.recurringTransaction.findFirst({
              where: { clinicId, employeeId: id },
            });
            if (recurringTx) {
              const newAmount = employee.salaryGross ? employee.salaryGross / 100 : 0;
              await prisma.recurringPayment.updateMany({
                where: { recurringTransactionId: recurringTx.id },
                data: { amount: newAmount },
              });
            }
          }
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
