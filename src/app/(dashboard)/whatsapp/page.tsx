"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  MessageCircle,
  Phone,
  CheckCheck,
  AlertTriangle,
  Slash,
  Calendar,
  DollarSign,
  BarChart3,
  FileText,
  Users,
  HelpCircle,
  ChevronUp,
  X,
  Terminal,
  Wallet,
  Bell,
  UserPlus,
} from "lucide-react";
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
  isCommand?: boolean;
}

const COMMANDS = [
  { name: "randevu", description: "Bugunku randevulari listele", icon: Calendar },
  { name: "gelir", description: "Bugunun gelir ozetini goster", icon: DollarSign },
  { name: "gider", description: "Bugunun gider ozetini goster", icon: Wallet },
  { name: "rapor", description: "Gunluk/haftalik rapor", icon: BarChart3 },
  { name: "kasa", description: "Kasa durumunu goster", icon: DollarSign },
  { name: "hasta", description: "Hasta bilgisi sorgula", icon: UserPlus },
  { name: "hastalar", description: "Hasta listesini goster", icon: Users },
  { name: "hatirlatmalar", description: "Yaklaşan hatirlatmalar", icon: Bell },
  { name: "ozet", description: "Klinik genel ozeti", icon: FileText },
  { name: "yardim", description: "Tum komutlari listele", icon: HelpCircle },
];

const QUICK_COMMANDS = [
  { name: "/randevu", icon: Calendar },
  { name: "/gelir", icon: DollarSign },
  { name: "/rapor", icon: BarChart3 },
  { name: "/ozet", icon: FileText },
  { name: "/hastalar", icon: Users },
  { name: "/yardim", icon: HelpCircle },
];

const exampleMessages = [
  "Ayse Yilmaz pazartesi saat 3 botoks kontrol",
  "Kerem Inanir dolgu 5000tl alindi",
  "Nurederm urun alindi 50000tl odendi",
  "Mehmet bey yarin 10:30 dis tedavi",
  "/randevu",
  "/rapor",
  "/ozet",
  "/yardim",
];

export default function WhatsAppPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [clinicId, setClinicId] = useState("");
  const [showQuickCommands, setShowQuickCommands] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteCommands, setAutocompleteCommands] = useState(COMMANDS);
  const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

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

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update autocomplete when input changes
  useEffect(() => {
    if (input.startsWith("/")) {
      const query = input.slice(1).toLowerCase();
      const filtered = COMMANDS.filter((cmd) =>
        cmd.name.toLowerCase().startsWith(query)
      );
      setAutocompleteCommands(filtered);
      setShowAutocomplete(filtered.length > 0);
      setSelectedAutocompleteIndex(0);
    } else {
      setShowAutocomplete(false);
    }
  }, [input]);

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
    setShowAutocomplete(false);

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
        content: data.confirmationMessage || data.error || "Bilinmeyen yanit",
        timestamp: new Date(),
        parsed: data.parsed,
        patientIsNew: data.patientIsNew,
        recordId: data.recordId,
        success: data.success,
        isCommand: data.isCommand || false,
      };

      setMessages((prev) => [...prev, systemMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "system",
          content: "Baglanti hatasi. Sunucu calisiyor mu?",
          timestamp: new Date(),
          success: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutocompleteSelect = useCallback(
    (commandName: string) => {
      setInput("/" + commandName);
      setShowAutocomplete(false);
      inputRef.current?.focus();
    },
    []
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showAutocomplete) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedAutocompleteIndex((prev) =>
          prev < autocompleteCommands.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedAutocompleteIndex((prev) =>
          prev > 0 ? prev - 1 : autocompleteCommands.length - 1
        );
      } else if (e.key === "Tab" || (e.key === "Enter" && autocompleteCommands.length > 0)) {
        e.preventDefault();
        handleAutocompleteSelect(autocompleteCommands[selectedAutocompleteIndex].name);
      } else if (e.key === "Escape") {
        setShowAutocomplete(false);
      }
    }
  };

  const isCommandResponse = (msg: Message): boolean => {
    if (msg.isCommand) return true;
    // Detect command responses by specific emoji patterns
    const commandEmojis = [
      "\u{1F4C5}", // 📅
      "\u{1F4B0}", // 💰
      "\u{1F4CA}", // 📊
      "\u{1F4CB}", // 📋
      "\u{1F3E5}", // 🏥
      "\u{2753}",  // ❓
      "\u{1F514}", // 🔔
      "\u{1F465}", // 👥
      "\u{1F4B8}", // 💸
      "\u{2695}",  // ⚕
    ];
    return commandEmojis.some((emoji) => msg.content.includes(emoji));
  };

  const getTypeBadge = (msg: Message) => {
    if (isCommandResponse(msg)) {
      return <Badge className="bg-purple-100 text-purple-800">Komut</Badge>;
    }
    if (!msg.parsed) return null;
    switch (msg.parsed.type) {
      case "APPOINTMENT":
        return <Badge className="bg-blue-100 text-blue-800">Randevu</Badge>;
      case "INCOME":
        return <Badge className="bg-green-100 text-green-800">Gelir</Badge>;
      case "EXPENSE":
        return <Badge className="bg-red-100 text-red-800">Gider</Badge>;
      case "AMBIGUOUS":
        return <Badge className="bg-orange-100 text-orange-800">Belirsiz</Badge>;
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
              Mesaj yazarak randevu, gelir ve gider kaydi olusturun
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
                <p className="text-gray-600 font-medium mb-1">WhatsApp Simulatoru</p>
                <p className="text-sm text-gray-500 mb-4">
                  Doktor gibi mesaj yazin, sistem otomatik islem yapacak
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                  {exampleMessages.map((msg, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (msg.startsWith("/")) {
                          setInput(msg);
                          inputRef.current?.focus();
                        } else {
                          sendMessage(msg);
                        }
                      }}
                      className={`text-left text-xs p-2.5 rounded-lg shadow-sm hover:shadow-md transition-shadow border ${
                        msg.startsWith("/")
                          ? "bg-purple-50 border-purple-200 text-purple-700 font-mono"
                          : "bg-white"
                      }`}
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
                  {msg.role === "system" && (
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeBadge(msg)}
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
                        Parse detaylari
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

          {/* Quick command buttons */}
          {showQuickCommands && (
            <div className="border-t bg-white px-3 py-2">
              <div className="flex items-center gap-2 flex-wrap">
                {QUICK_COMMANDS.map((cmd) => {
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.name}
                      onClick={() => {
                        setInput(cmd.name);
                        setShowQuickCommands(false);
                        inputRef.current?.focus();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors"
                    >
                      <Icon className="h-3 w-3" />
                      {cmd.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Input area with autocomplete */}
          <div className="border-t p-3 bg-gray-100 relative">
            {/* Autocomplete dropdown */}
            {showAutocomplete && (
              <div
                ref={autocompleteRef}
                className="absolute bottom-full left-3 right-3 mb-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-y-auto z-50"
              >
                <div className="p-1">
                  {autocompleteCommands.map((cmd, index) => {
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.name}
                        onClick={() => handleAutocompleteSelect(cmd.name)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                          index === selectedAutocompleteIndex
                            ? "bg-purple-50 text-purple-800"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <Icon className="h-4 w-4 text-purple-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="text-sm font-mono font-medium">/{cmd.name}</span>
                          <span className="text-xs text-gray-500 ml-2">{cmd.description}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (showAutocomplete && autocompleteCommands.length > 0) {
                  // If autocomplete is open, first select the command, don't send
                  return;
                }
                sendMessage(input);
              }}
              className="flex gap-2"
            >
              {/* Slash command toggle button */}
              <button
                type="button"
                onClick={() => setShowQuickCommands((prev) => !prev)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                  showQuickCommands
                    ? "bg-purple-600 text-white"
                    : "bg-white text-gray-500 border border-gray-300 hover:bg-gray-50"
                }`}
                title="Hizli komutlar"
              >
                {showQuickCommands ? <X className="h-4 w-4" /> : <Slash className="h-4 w-4" />}
              </button>

              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Mesaj yazin... (/ ile komut veya dogal dil)"
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
            <h2 className="font-semibold mb-3">Kullanim Kilavuzu</h2>

            <div className="space-y-4 text-sm">
              {/* Komutlar Section */}
              <Card className="border-purple-200">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-purple-500" />
                    Komutlar
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="space-y-1.5">
                    {COMMANDS.map((cmd) => {
                      const Icon = cmd.icon;
                      return (
                        <button
                          key={cmd.name}
                          onClick={() => {
                            setInput("/" + cmd.name);
                            inputRef.current?.focus();
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs hover:bg-purple-50 transition-colors group"
                        >
                          <Icon className="h-3 w-3 text-purple-400 group-hover:text-purple-600 flex-shrink-0" />
                          <span className="font-mono text-purple-700 font-medium">/{cmd.name}</span>
                          <span className="text-muted-foreground truncate">{cmd.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Randevu
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Format:</p>
                  <p className="italic">&quot;Hasta adi + gun + saat + islem&quot;</p>
                  <p className="mt-1.5 font-medium text-foreground">Ornek:</p>
                  <p className="italic">&quot;Ayse hanim pazartesi 15:00 botoks&quot;</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Gelir Kaydi
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Format:</p>
                  <p className="italic">&quot;Hasta adi + islem + tutar TL&quot;</p>
                  <p className="mt-1.5 font-medium text-foreground">Ornek:</p>
                  <p className="italic">&quot;Kerem bey dolgu 5000tl alindi&quot;</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    Gider Kaydi
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Format:</p>
                  <p className="italic">&quot;Aciklama + tutar TL&quot;</p>
                  <p className="mt-1.5 font-medium text-foreground">Ornek:</p>
                  <p className="italic">&quot;Kira 25000 odendi&quot;</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
