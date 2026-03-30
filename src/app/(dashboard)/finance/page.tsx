"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DollarSign, BarChart3, Upload, Wallet } from "lucide-react";
import FinanceOverview from "@/components/finance/FinanceOverview";
import FinancialReportsContent from "@/components/finance/FinancialReportsContent";
import InvoiceUploadContent from "@/components/finance/InvoiceUploadContent";
import DebtTrackingContent from "@/components/finance/DebtTrackingContent";

export default function FinancePage() {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">
          <DollarSign className="mr-1.5 h-4 w-4" />
          Gelir/Gider
        </TabsTrigger>
        <TabsTrigger value="debts">
          <Wallet className="mr-1.5 h-4 w-4" />
          Cari Hesap
        </TabsTrigger>
        <TabsTrigger value="reports">
          <BarChart3 className="mr-1.5 h-4 w-4" />
          Mali Tablo
        </TabsTrigger>
        <TabsTrigger value="invoices">
          <Upload className="mr-1.5 h-4 w-4" />
          Fatura Yükleme
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <FinanceOverview />
      </TabsContent>

      <TabsContent value="debts">
        <DebtTrackingContent />
      </TabsContent>

      <TabsContent value="reports">
        <FinancialReportsContent />
      </TabsContent>

      <TabsContent value="invoices">
        <InvoiceUploadContent />
      </TabsContent>
    </Tabs>
  );
}
