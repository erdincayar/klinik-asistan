"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Send } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import WhatsAppContent from "@/components/messaging/WhatsAppContent";

function TelegramStatus() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [clinicName, setClinicName] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setConnected(!!data.telegramChatId);
        setClinicName(data.name || "");
      })
      .catch(() => setConnected(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Send className="h-5 w-5 text-blue-500" />
        <h2 className="text-lg font-semibold text-gray-900">Telegram</h2>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
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
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
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
    <Tabs defaultValue="whatsapp">
      <TabsList>
        <TabsTrigger value="whatsapp">
          <MessageCircle className="mr-1.5 h-4 w-4" />
          WhatsApp
        </TabsTrigger>
        <TabsTrigger value="telegram">
          <Send className="mr-1.5 h-4 w-4" />
          Telegram
        </TabsTrigger>
      </TabsList>

      <TabsContent value="whatsapp">
        <WhatsAppContent />
      </TabsContent>

      <TabsContent value="telegram">
        <TelegramStatus />
      </TabsContent>
    </Tabs>
  );
}
