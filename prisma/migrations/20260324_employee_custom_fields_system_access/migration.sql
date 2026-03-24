-- AlterTable: Employee - add new fields
ALTER TABLE "Employee" ADD COLUMN "manualSalaryEntry" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Employee" ADD COLUMN "hasSystemAccess" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Employee" ADD COLUMN "systemEmail" TEXT;
ALTER TABLE "Employee" ADD COLUMN "inviteStatus" TEXT;
ALTER TABLE "Employee" ADD COLUMN "inviteToken" TEXT;
ALTER TABLE "Employee" ADD COLUMN "invitedAt" TIMESTAMP(3);

-- CreateTable: EmployeeCustomField
CREATE TABLE "EmployeeCustomField" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL DEFAULT 'text',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeCustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EmployeeCustomValue
CREATE TABLE "EmployeeCustomValue" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "value" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeCustomValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeCustomField_clinicId_fieldKey_key" ON "EmployeeCustomField"("clinicId", "fieldKey");
CREATE UNIQUE INDEX "EmployeeCustomValue_employeeId_fieldKey_key" ON "EmployeeCustomValue"("employeeId", "fieldKey");

-- AddForeignKey
ALTER TABLE "EmployeeCustomField" ADD CONSTRAINT "EmployeeCustomField_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeCustomValue" ADD CONSTRAINT "EmployeeCustomValue_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
