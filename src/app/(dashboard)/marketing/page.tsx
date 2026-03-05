"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Megaphone, Share2, Calendar } from "lucide-react";
import MetaAdsContent from "@/components/marketing/MetaAdsContent";
import SocialMediaContent from "@/components/marketing/SocialMediaContent";

export default function MarketingPage() {
  return (
    <Tabs defaultValue="meta-ads">
      <TabsList>
        <TabsTrigger value="meta-ads">
          <Megaphone className="mr-1.5 h-4 w-4" />
          Meta Ads
        </TabsTrigger>
        <TabsTrigger value="social-media">
          <Share2 className="mr-1.5 h-4 w-4" />
          Sosyal Medya
        </TabsTrigger>
        <TabsTrigger value="content-planning">
          <Calendar className="mr-1.5 h-4 w-4" />
          İçerik Planlama
        </TabsTrigger>
      </TabsList>

      <TabsContent value="meta-ads">
        <MetaAdsContent />
      </TabsContent>

      <TabsContent value="social-media">
        <SocialMediaContent />
      </TabsContent>

      <TabsContent value="content-planning">
        <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-gray-100 bg-white">
          <div className="text-center">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <h3 className="text-base font-semibold text-gray-900 mb-1">İçerik Planlama</h3>
            <p className="text-sm text-gray-500">Yakında gelecek...</p>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
