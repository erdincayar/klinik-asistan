-- CreateTable: ClinicServiceName
CREATE TABLE "ClinicServiceName" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicServiceName_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ClinicCategory
CREATE TABLE "ClinicCategory" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CustomerCustomColumn
CREATE TABLE "CustomerCustomColumn" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "columnName" TEXT NOT NULL,
    "columnKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerCustomColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CustomerCustomValue
CREATE TABLE "CustomerCustomValue" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "columnKey" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerCustomValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TransactionCustomField
CREATE TABLE "TransactionCustomField" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL DEFAULT 'text',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionCustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TransactionCustomValue
CREATE TABLE "TransactionCustomValue" (
    "id" TEXT NOT NULL,
    "treatmentId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "TransactionCustomValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClinicServiceName_clinicId_name_key" ON "ClinicServiceName"("clinicId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicCategory_clinicId_name_key" ON "ClinicCategory"("clinicId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerCustomColumn_clinicId_columnKey_key" ON "CustomerCustomColumn"("clinicId", "columnKey");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerCustomValue_customerId_columnKey_key" ON "CustomerCustomValue"("customerId", "columnKey");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionCustomField_clinicId_fieldKey_key" ON "TransactionCustomField"("clinicId", "fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionCustomValue_treatmentId_fieldKey_key" ON "TransactionCustomValue"("treatmentId", "fieldKey");

-- AddForeignKey
ALTER TABLE "ClinicServiceName" ADD CONSTRAINT "ClinicServiceName_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicCategory" ADD CONSTRAINT "ClinicCategory_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerCustomColumn" ADD CONSTRAINT "CustomerCustomColumn_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerCustomValue" ADD CONSTRAINT "CustomerCustomValue_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionCustomField" ADD CONSTRAINT "TransactionCustomField_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionCustomValue" ADD CONSTRAINT "TransactionCustomValue_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
