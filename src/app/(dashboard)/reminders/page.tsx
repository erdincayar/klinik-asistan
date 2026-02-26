"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Send,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

// --- Types ---

interface PendingReminder {
  patientId: string;
  patientName: string;
  phone: string | null;
  treatmentCategory: string;
  lastTreatmentDate: string;
  daysSince: number;
  intervalDays: number;
}

interface ReminderLog {
  id: string;
  patientId: string;
  patient: { name: string };
  messageContent: string;
  channel: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
}

interface ReminderRule {
  id: string;
  treatmentCategory: string;
  intervalDays: number;
  messageTemplate: string;
  isActive: boolean;
  createdAt: string;
}

interface PatientResult {
  id: string;
  name: string;
  phone: string | null;
  preferences: Array<{ id: string; type: string }>;
  visitPattern: {
    averageVisitDays: number | null;
    lastVisitDate: string | null;
    totalVisits: number;
    lastCategory: string | null;
  } | null;
}

interface Stats {
  pendingCount: number;
  sentToday: number;
  sentMonth: number;
}

// --- Constants ---

const PREFERENCE_TYPES = [
  { value: "INDIRIM_SEVER", label: "Indirim Sever" },
  { value: "HEDIYE_SEVER", label: "Hediye Sever" },
  { value: "ARKADASIYLA_GELIR", label: "Arkadasiyla Gelir" },
  { value: "SADIK_MUSTERI", label: "Sadik Musteri" },
  { value: "FIYAT_HASSAS", label: "Fiyat Hassas" },
];

const TREATMENT_CATEGORIES = [
  { value: "BOTOX", label: "Botoks" },
  { value: "DOLGU", label: "Dolgu" },
  { value: "DIS_TEDAVI", label: "Dis Tedavi" },
  { value: "GENEL", label: "Genel" },
];

const CATEGORY_LABELS: Record<string, string> = {
  BOTOX: "Botoks",
  DOLGU: "Dolgu",
  DIS_TEDAVI: "Dis Tedavi",
  GENEL: "Genel",
};

// --- Component ---

export default function RemindersPage() {
  const [activeTab, setActiveTab] = useState("pending");

  // Stats
  const [stats, setStats] = useState<Stats>({ pendingCount: 0, sentToday: 0, sentMonth: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  // Pending
  const [pendingList, setPendingList] = useState<PendingReminder[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);

  // History
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Rules
  const [rules, setRules] = useState<ReminderRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [showNewRuleForm, setShowNewRuleForm] = useState(false);
  const [newRule, setNewRule] = useState({
    treatmentCategory: "BOTOX",
    intervalDays: "180",
    messageTemplate: "Sayin {hasta}, {islem} kontrolunuz icin randevu zamaniniz gelmistir.",
  });
  const [creatingRule, setCreatingRule] = useState(false);

  // Preferences
  const [patientSearch, setPatientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<PatientResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // --- Data Fetchers ---

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/reminders?tab=stats");
      if (res.ok) {
        const data = await res.json();
        setStats({
          pendingCount: data.pendingCount ?? 0,
          sentToday: data.sentToday ?? 0,
          sentMonth: data.sentMonth ?? 0,
        });
      }
    } catch {
      // silently fail
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await fetch("/api/reminders?tab=pending");
      if (res.ok) {
        const data = await res.json();
        setPendingList(data.pending ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch("/api/reminders?tab=history");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const fetchRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const res = await fetch("/api/reminders?tab=rules");
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setRulesLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchPending();
  }, [fetchStats, fetchPending]);

  // Fetch tab-specific data on tab change
  useEffect(() => {
    if (activeTab === "history") fetchHistory();
    if (activeTab === "rules") fetchRules();
  }, [activeTab, fetchHistory, fetchRules]);

  // --- Actions ---

  const handleSendReminder = async (item: PendingReminder) => {
    setSendingId(item.patientId);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_reminder",
          patientId: item.patientId,
          treatmentCategory: item.treatmentCategory,
          lastTreatmentDate: item.lastTreatmentDate,
          intervalDays: item.intervalDays,
        }),
      });
      if (res.ok) {
        // Remove from pending list
        setPendingList((prev) => prev.filter((p) => p.patientId !== item.patientId));
        fetchStats();
      }
    } catch {
      // silently fail
    } finally {
      setSendingId(null);
    }
  };

  const handleSendAll = async () => {
    setSendingAll(true);
    for (const item of pendingList) {
      try {
        await fetch("/api/reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "send_reminder",
            patientId: item.patientId,
            treatmentCategory: item.treatmentCategory,
            lastTreatmentDate: item.lastTreatmentDate,
            intervalDays: item.intervalDays,
          }),
        });
      } catch {
        // continue with next
      }
    }
    setPendingList([]);
    fetchStats();
    setSendingAll(false);
  };

  const handleCreateRule = async () => {
    if (!newRule.treatmentCategory || !newRule.intervalDays || !newRule.messageTemplate) return;
    setCreatingRule(true);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_rule",
          treatmentCategory: newRule.treatmentCategory,
          intervalDays: newRule.intervalDays,
          messageTemplate: newRule.messageTemplate,
        }),
      });
      if (res.ok) {
        setShowNewRuleForm(false);
        setNewRule({
          treatmentCategory: "BOTOX",
          intervalDays: "180",
          messageTemplate: "Sayin {hasta}, {islem} kontrolunuz icin randevu zamaniniz gelmistir.",
        });
        fetchRules();
      }
    } catch {
      // silently fail
    } finally {
      setCreatingRule(false);
    }
  };

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_rule", ruleId, isActive }),
      });
      if (res.ok) {
        setRules((prev) =>
          prev.map((r) => (r.id === ruleId ? { ...r, isActive } : r))
        );
      }
    } catch {
      // silently fail
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_rule", ruleId }),
      });
      if (res.ok) {
        setRules((prev) => prev.filter((r) => r.id !== ruleId));
      }
    } catch {
      // silently fail
    }
  };

  const handleSearchPatients = async () => {
    if (!patientSearch.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search_patients", query: patientSearch.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.patients ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setSearching(false);
    }
  };

  const handleSelectPatient = (patient: PatientResult) => {
    setSelectedPatient(patient);
    setSelectedPreferences(patient.preferences.map((p) => p.type));
  };

  const handleSavePreferences = async () => {
    if (!selectedPatient) return;
    setSavingPrefs(true);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_preferences",
          patientId: selectedPatient.id,
          preferences: selectedPreferences,
        }),
      });
      if (res.ok) {
        // Update selected patient locally
        setSelectedPatient((prev) =>
          prev
            ? {
                ...prev,
                preferences: selectedPreferences.map((type) => ({ id: "", type })),
              }
            : null
        );
      }
    } catch {
      // silently fail
    } finally {
      setSavingPrefs(false);
    }
  };

  const togglePreference = (prefType: string) => {
    setSelectedPreferences((prev) =>
      prev.includes(prefType)
        ? prev.filter((p) => p !== prefType)
        : [...prev, prefType]
    );
  };

  // --- Status badge helper ---

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SENT":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Gonderildi
          </Badge>
        );
      case "FAILED":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="h-3 w-3 mr-1" />
            Basarisiz
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="h-3 w-3 mr-1" />
            Bekliyor
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // --- Render ---

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Bell className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Hatirlatmalar</h1>
            <p className="text-sm text-muted-foreground">
              Hasta hatirlatmalarini yonetin ve gonderin
            </p>
          </div>
        </div>
        <Button
          onClick={handleSendAll}
          disabled={sendingAll || pendingList.length === 0}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Send className="h-4 w-4 mr-2" />
          {sendingAll ? "Gonderiliyor..." : "Hatirlatmalari Gonder"}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bekleyen
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats.pendingCount}
            </div>
            <p className="text-xs text-muted-foreground">hatirlatma bekliyor</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bugun Gonderilen
            </CardTitle>
            <Send className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats.sentToday}
            </div>
            <p className="text-xs text-muted-foreground">bugun gonderildi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bu Ay Gonderilen
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats.sentMonth}
            </div>
            <p className="text-xs text-muted-foreground">bu ay gonderildi</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">Bekleyenler</TabsTrigger>
          <TabsTrigger value="history">Gecmis</TabsTrigger>
          <TabsTrigger value="rules">Kurallar</TabsTrigger>
          <TabsTrigger value="preferences">Tercihler</TabsTrigger>
        </TabsList>

        {/* ==================== BEKLEYENLER TAB ==================== */}
        <TabsContent value="pending">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Bekleyen Hatirlatmalar</CardTitle>
              {pendingList.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSendAll}
                  disabled={sendingAll}
                >
                  <Send className="h-3 w-3 mr-1" />
                  Tumunu Gonder ({pendingList.length})
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Yukleniyor...
                </div>
              ) : pendingList.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    Bekleyen hatirlatma bulunmuyor
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tum hastalar guncel gorunuyor
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingList.map((item) => (
                    <div
                      key={`${item.patientId}-${item.treatmentCategory}`}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{item.patientName}</span>
                          <Badge variant="secondary" className="text-xs">
                            {item.treatmentCategory}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.daysSince} gun once
                          </span>
                          {item.phone && (
                            <span className="truncate">{item.phone}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSendReminder(item)}
                        disabled={sendingId === item.patientId || sendingAll}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        {sendingId === item.patientId ? "Gonderiliyor..." : "Gonder"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== GECMIS TAB ==================== */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Gonderim Gecmisi</CardTitle>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Yukleniyor...
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    Henuz gonderilmis hatirlatma yok
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{log.patient.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {log.channel}
                          </Badge>
                          {getStatusBadge(log.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {log.messageContent}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== KURALLAR TAB ==================== */}
        <TabsContent value="rules">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Hatirlatma Kurallari</CardTitle>
              <Button
                size="sm"
                onClick={() => setShowNewRuleForm((prev) => !prev)}
                variant={showNewRuleForm ? "outline" : "default"}
              >
                <Plus className="h-3 w-3 mr-1" />
                {showNewRuleForm ? "Iptal" : "Yeni Kural"}
              </Button>
            </CardHeader>
            <CardContent>
              {/* New Rule Form */}
              {showNewRuleForm && (
                <div className="mb-6 p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h3 className="font-medium">Yeni Hatirlatma Kurali</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rule-category">Islem Kategorisi</Label>
                      <Select
                        id="rule-category"
                        value={newRule.treatmentCategory}
                        onChange={(e) =>
                          setNewRule((prev) => ({
                            ...prev,
                            treatmentCategory: e.target.value,
                          }))
                        }
                      >
                        {TREATMENT_CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rule-interval">Aralik (gun)</Label>
                      <Input
                        id="rule-interval"
                        type="number"
                        min="1"
                        value={newRule.intervalDays}
                        onChange={(e) =>
                          setNewRule((prev) => ({
                            ...prev,
                            intervalDays: e.target.value,
                          }))
                        }
                        placeholder="180"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rule-template">Mesaj Sablonu</Label>
                    <Textarea
                      id="rule-template"
                      rows={3}
                      value={newRule.messageTemplate}
                      onChange={(e) =>
                        setNewRule((prev) => ({
                          ...prev,
                          messageTemplate: e.target.value,
                        }))
                      }
                      placeholder="Sayin {hasta}, {islem} kontrolunuz icin randevu zamaniniz gelmistir."
                    />
                    <p className="text-xs text-muted-foreground">
                      Degiskenler: {"{hasta}"}, {"{islem}"}, {"{gun}"}
                    </p>
                  </div>

                  <Button onClick={handleCreateRule} disabled={creatingRule}>
                    {creatingRule ? "Kaydediliyor..." : "Kurali Kaydet"}
                  </Button>
                </div>
              )}

              {/* Rules List */}
              {rulesLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Yukleniyor...
                </div>
              ) : rules.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    Henuz hatirlatma kurali olusturulmanis
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Yeni bir kural olusturmak icin yukardaki butona tiklayin
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border rounded-lg transition-colors ${
                        rule.isActive
                          ? "hover:bg-muted/50"
                          : "opacity-60 bg-muted/20"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary">
                            {CATEGORY_LABELS[rule.treatmentCategory] ||
                              rule.treatmentCategory}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Her {rule.intervalDays} gunde bir
                          </span>
                          {rule.isActive ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              Aktif
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">
                              Pasif
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {rule.messageTemplate}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleToggleRule(rule.id, !rule.isActive)
                          }
                          title={rule.isActive ? "Pasife al" : "Aktif et"}
                        >
                          {rule.isActive ? (
                            <ToggleRight className="h-5 w-5 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-gray-400" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteRule(rule.id)}
                          title="Kurali sil"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== TERCIHLER TAB ==================== */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hasta Tercihleri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Patient Search */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Hasta adi ile arayIn..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearchPatients();
                    }}
                    className="pl-9"
                  />
                </div>
                <Button
                  onClick={handleSearchPatients}
                  disabled={searching || !patientSearch.trim()}
                  variant="outline"
                >
                  {searching ? "Araniyor..." : "Ara"}
                </Button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && !selectedPatient && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Sonuclar ({searchResults.length})
                  </Label>
                  {searchResults.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => handleSelectPatient(patient)}
                      className="w-full text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{patient.name}</span>
                          {patient.phone && (
                            <span className="text-sm text-muted-foreground ml-2">
                              {patient.phone}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {patient.preferences.map((pref) => (
                            <Badge
                              key={pref.id}
                              variant="outline"
                              className="text-xs"
                            >
                              {PREFERENCE_TYPES.find(
                                (pt) => pt.value === pref.type
                              )?.label || pref.type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Patient Detail */}
              {selectedPatient && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {selectedPatient.name}
                      </h3>
                      {selectedPatient.phone && (
                        <p className="text-sm text-muted-foreground">
                          {selectedPatient.phone}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedPatient(null);
                        setSelectedPreferences([]);
                      }}
                    >
                      Geri
                    </Button>
                  </div>

                  {/* Visit Pattern Info */}
                  {selectedPatient.visitPattern && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground">
                          Ortalama Ziyaret Araligi
                        </p>
                        <p className="text-lg font-semibold">
                          {selectedPatient.visitPattern.averageVisitDays != null
                            ? `${selectedPatient.visitPattern.averageVisitDays} gun`
                            : "Bilinmiyor"}
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground">
                          Toplam Ziyaret
                        </p>
                        <p className="text-lg font-semibold">
                          {selectedPatient.visitPattern.totalVisits}
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground">
                          Son Ziyaret
                        </p>
                        <p className="text-lg font-semibold">
                          {selectedPatient.visitPattern.lastVisitDate
                            ? formatDate(selectedPatient.visitPattern.lastVisitDate)
                            : "Bilinmiyor"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Preferences Checkboxes */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">
                      Hasta Tercihleri
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {PREFERENCE_TYPES.map((pref) => {
                        const isChecked = selectedPreferences.includes(
                          pref.value
                        );
                        return (
                          <label
                            key={pref.value}
                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                              isChecked
                                ? "bg-orange-50 border-orange-300"
                                : "hover:bg-muted/50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePreference(pref.value)}
                              className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                            />
                            <span
                              className={`text-sm ${
                                isChecked
                                  ? "font-medium text-orange-800"
                                  : "text-foreground"
                              }`}
                            >
                              {pref.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <Button
                    onClick={handleSavePreferences}
                    disabled={savingPrefs}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {savingPrefs ? "Kaydediliyor..." : "Tercihleri Kaydet"}
                  </Button>
                </div>
              )}

              {/* Empty state when no search */}
              {searchResults.length === 0 && !selectedPatient && !searching && (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    Tercihlerini duzenlemek icin bir hasta arayin
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
