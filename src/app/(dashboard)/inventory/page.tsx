"use client";

import { useState, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ProductsTab from "@/components/inventory/ProductsTab";
import AlarmsTab from "@/components/inventory/AlarmsTab";
import FixedAssetsTab from "@/components/inventory/FixedAssetsTab";
import MovementsTab from "@/components/inventory/MovementsTab";
import ReportTab from "@/components/inventory/ReportTab";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState("products");
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stok Takibi</h1>
        <p className="text-muted-foreground">
          Ürün, stok hareketi ve rapor yönetimi
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="products">Ürünler</TabsTrigger>
          <TabsTrigger value="alarms">Alarmlar</TabsTrigger>
          <TabsTrigger value="assets">Demirbaş</TabsTrigger>
          <TabsTrigger value="movements">Stok Hareketleri</TabsTrigger>
          <TabsTrigger value="report">Stok Raporu</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <ProductsTab onDataChange={triggerRefresh} />
        </TabsContent>
        <TabsContent value="alarms">
          <AlarmsTab />
        </TabsContent>
        <TabsContent value="assets">
          <FixedAssetsTab />
        </TabsContent>
        <TabsContent value="movements">
          <MovementsTab key={`movements-${refreshKey}`} />
        </TabsContent>
        <TabsContent value="report">
          <ReportTab key={`report-${refreshKey}`} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
