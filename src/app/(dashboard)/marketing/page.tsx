"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Megaphone, Share2, Sparkles } from "lucide-react";
import MetaAdsContent from "@/components/marketing/MetaAdsContent";
import SocialMediaContent from "@/components/marketing/SocialMediaContent";
import AiStudioContent from "@/components/marketing/AiStudioContent";

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
        <TabsTrigger value="ai-studio">
          <Sparkles className="mr-1.5 h-4 w-4" />
          AI Stüdyo
        </TabsTrigger>
      </TabsList>

      <TabsContent value="meta-ads">
        <MetaAdsContent />
      </TabsContent>

      <TabsContent value="social-media">
        <SocialMediaContent />
      </TabsContent>

      <TabsContent value="ai-studio">
        <AiStudioContent />
      </TabsContent>
    </Tabs>
  );
}
