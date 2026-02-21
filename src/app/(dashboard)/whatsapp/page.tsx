"use client";

import { useState, useRef, useEffect } from "react";
import { Send, MessageCircle, Phone, CheckCheck, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  role: "user" | "system";
  content: string;
  timestamp: Date;
  parsed?: any;
  patientIsNew?: boolean;
  recordId?: string;
  success?: boolean;
}

const exampleMessages = [
  "Ayşe Yılmaz pazartesi saat 3 botoks kontrol",
  "Kerem İnanır dolgu 5000tl alındı",
  "Nurederm ürün alındı 50000tl ödendi",
  "Mehmet bey yarın 10:30 diş tedavi",
  "Zeynep hanım botoks 3500 lira",
  "Kira 25000 ödendi",
];

export default function WhatsAppPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [clinicId, setClinicId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get clinicId from session/API
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.id) setClinicId(data.id);
      })
      .catch(() => {});
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/whatsapp/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          clinicId,
          senderPhone: "test-simulator",
        }),
      });

      const data = await res.json();

      const systemMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "system",
        content: data.confirmationMessage || data.error || "Bilinmeyen yanıt",
        timestamp: new Date(),
        parsed: data.parsed,
        patientIsNew: data.patientIsNew,
        recordId: data.recordId,
        success: data.success,
      };

      setMessages((prev) => [...prev, systemMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "system",
          content: "Bağlantı hatası. Sunucu çalışıyor mu?",
          timestamp: new Date(),
          success: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeBadge = (parsed: any) => {
    if (!parsed) return null;
    switch (parsed.type) {
      case "APPOINTMENT":
        return <Badge className="bg-blue-100 text-blue-800">Randevu</Badge>;
      case "INCOME":
        return <Badge className="bg-green-100 text-green-800">Gelir</Badge>;
      case "EXPENSE":
        return <Badge className="bg-red-100 text-red-800">Gider</Badge>;
      case "ERROR":
        return <Badge className="bg-yellow-100 text-yellow-800">Hata</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b p-4 bg-green-600 text-white">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-6 w-6" />
          <div>
            <h1 className="text-lg font-bold">WhatsApp Komut Merkezi</h1>
            <p className="text-sm text-green-100">
              Mesaj yazarak randevu, gelir ve gider kaydı oluşturun
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#e5ddd5]">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Phone className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium mb-1">WhatsApp Simülatörü</p>
                <p className="text-sm text-gray-500 mb-4">
                  Doktor gibi mesaj yazın, sistem otomatik işlem yapacak
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                  {exampleMessages.map((msg, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(msg)}
                      className="text-left text-xs p-2.5 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow border"
                    >
                      {msg}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 shadow-sm ${
                    msg.role === "user"
                      ? "bg-[#dcf8c6] rounded-tr-none"
                      : "bg-white rounded-tl-none"
                  }`}
                >
                  {msg.role === "system" && msg.parsed && (
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeBadge(msg.parsed)}
                      {msg.patientIsNew && (
                        <span className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Yeni hasta
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[10px] text-gray-500">
                      {msg.timestamp.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {msg.role === "user" && (
                      <CheckCheck className="h-3 w-3 text-blue-500" />
                    )}
                  </div>
                  {msg.role === "system" && msg.parsed && msg.parsed.type !== "ERROR" && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                        Parse detayları
                      </summary>
                      <pre className="mt-1 p-2 bg-gray-50 rounded text-[10px] overflow-x-auto">
                        {JSON.stringify(msg.parsed, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-lg rounded-tl-none p-3 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3 bg-gray-100">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Mesaj yazın... (ör: Ayşe hanım yarın 3'te botoks)"
                className="flex-1 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right sidebar - info panel */}
        <div className="hidden lg:block w-80 border-l bg-white overflow-y-auto">
          <div className="p-4">
            <h2 className="font-semibold mb-3">Kullanım Kılavuzu</h2>

            <div className="space-y-4 text-sm">
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Randevu
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Format:</p>
                  <p className="italic">&quot;Hasta adı + gün + saat + işlem&quot;</p>
                  <p className="mt-1.5 font-medium text-foreground">Örnek:</p>
                  <p className="italic">&quot;Ayşe hanım pazartesi 15:00 botoks&quot;</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Gelir Kaydı
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Format:</p>
                  <p className="italic">&quot;Hasta adı + işlem + tutar TL&quot;</p>
                  <p className="mt-1.5 font-medium text-foreground">Örnek:</p>
                  <p className="italic">&quot;Kerem bey dolgu 5000tl alındı&quot;</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    Gider Kaydı
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Format:</p>
                  <p className="italic">&quot;Açıklama + tutar TL&quot;</p>
                  <p className="mt-1.5 font-medium text-foreground">Örnek:</p>
                  <p className="italic">&quot;Kira 25000 ödendi&quot;</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
