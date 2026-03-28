"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Send, Bot } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import WhatsAppContent from "@/components/messaging/WhatsAppContent";
import PobyAssistantContent from "@/components/messaging/PobyAssistantContent";

function TelegramStatus() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [clinicName, setClinicName] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/settings/telegram/status").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ])
      .then(([tgData, settingsData]) => {
        setConnected(!!tgData.connected);
        setClinicName(settingsData.name || "");
      })
      .catch(() => setConnected(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Send className="h-5 w-5 text-[#6366F1]" />
        <h2 className="text-lg font-semibold text-gray-900">Telegram</h2>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6">
        {connected === null ? (
          <p className="text-sm text-gray-400">Yükleniyor...</p>
        ) : connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-emerald-700">Bağlı</span>
            </div>
            <p className="text-sm text-gray-600">
              {clinicName} işletmesi Telegram bildirimleri aktif.
              Telegram üzerinden doğal dilde mesaj yazarak işletmenizi yönetebilirsiniz.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gray-300" />
              <span className="text-sm font-medium text-gray-500">Bağlı Değil</span>
            </div>
            <p className="text-sm text-gray-500">
              Telegram botu henüz bağlanmamış. Ayarlar sayfasından QR kod ile bağlantı kurabilirsiniz.
            </p>
            <a
              href="/settings"
              className="inline-flex items-center gap-2 rounded-xl bg-[#1E1E2D] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2A2A3C]"
            >
              Ayarlara Git
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MessagingPage() {
  return (
    <Tabs defaultValue="telegram">
      <TabsList>
        <TabsTrigger value="telegram">
          <Send className="mr-1.5 h-4 w-4" />
          Telegram
          <span className="ml-1.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-semibold text-green-700">Ücretsiz</span>
        </TabsTrigger>
        <TabsTrigger value="whatsapp">
          <MessageCircle className="mr-1.5 h-4 w-4" />
          WhatsApp
          <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500">Yakında</span>
        </TabsTrigger>
        <TabsTrigger value="assistant">
          <Bot className="mr-1.5 h-4 w-4" />
          Poby Asistan
        </TabsTrigger>
      </TabsList>

      <TabsContent value="telegram">
        <TelegramStatus />
      </TabsContent>

      <TabsContent value="whatsapp">
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <MessageCircle className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">WhatsApp Entegrasyonu</h3>
          <p className="mt-2 text-sm text-gray-500">WhatsApp Business API entegrasyonu yakında kullanıma açılacak.</p>
          <span className="mt-4 inline-block rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">Yakında</span>
        </div>
      </TabsContent>

      <TabsContent value="assistant">
        <PobyAssistantContent />
      </TabsContent>
    </Tabs>
  );
}
