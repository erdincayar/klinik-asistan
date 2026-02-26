"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import {
  Stethoscope,
  UtensilsCrossed,
  Hotel,
  Scissors,
  Sparkles,
  Building2,
  CheckCircle,
  Check,
  ArrowLeft,
  Calendar,
  DollarSign,
  Bell,
  BarChart3,
  Image,
  Bot,
  Users,
  Lock,
  MessageCircle,
  Send,
  Smartphone,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// ── Types ──────────────────────────────────────────────────────────────────

type Sector = "SAGLIK" | "RESTORAN" | "OTEL" | "KUAFOR" | "GUZELLIK" | "DIGER"
type Plan = "BASIC" | "PRO" | ""
type MessagingPreference = "WHATSAPP" | "TELEGRAM" | "BOTH" | ""
type ModuleId =
  | "RANDEVU"
  | "FINANS"
  | "HATIRLATMA"
  | "RAPORLAMA"
  | "GORSEL"
  | "AI_CHATBOT"
  | "CALISAN"

// ── UI Text Constants (Turkish) ────────────────────────────────────────────
// Using JS string literals so \u escapes are properly interpreted.

const TEXT = {
  step: "Adım",
  continue: "Devam Et",
  back: "Geri",
  step1Title: "Hangi Sektördesiniz?",
  step1Subtitle: "İşletmenize en uygun çözümü sunabilmemiz için sektörünüzü seçin",
  step2Suffix: "Sektörü",
  step2Button: "Hadi sizin için paket seçelim",
  step3Title: "Size Uygun Paketi Seçin",
  selectPackage: "Bu Paketi Seç",
  recommended: "Önerilen",
  step4Title: "Modüllerinizi Seçin",
  moduleSubtitle: (limit: number) => `(${limit} modül seçebilirsiniz)`,
  moduleCounter: (count: number, limit: number) => `${count}/${limit} modül seçildi`,
  proOnly: "Sadece Pro pakette",
  step5Title: "Sistemi nereden yönetmek istersiniz?",
  phoneLbl: "Telefon Numaranız",
  step6Title: "Hesabınızı Oluşturun",
  nameLbl: "İsim",
  namePlaceholder: "Adınız Soyadınız",
  emailLbl: "Email",
  passwordLbl: "Şifre",
  businessLbl: "İşletme Adı",
  businessPlaceholder: "İşletmenizin adı",
  submitBtn: "Kayıt Ol ve Başla",
  submitting: "Kayıt yapılıyor...",
  errorDefault: "Kayıt sırasında bir hata oluştu",
  errorSignIn: "Kayıt başarılı ancak giriş yapılamadı. Lütfen giriş sayfasından deneyin.",
  errorGeneric: "Bir hata oluştu. Lütfen tekrar deneyin.",
  bothLabel: "Her İkisi",
  perMonth: "/ay",
} as const

// ── Sector Data ────────────────────────────────────────────────────────────

const SECTORS: { id: Sector; label: string; icon: typeof Stethoscope }[] = [
  { id: "SAGLIK", label: "Sağlık", icon: Stethoscope },
  { id: "RESTORAN", label: "Restoran", icon: UtensilsCrossed },
  { id: "OTEL", label: "Otel", icon: Hotel },
  { id: "KUAFOR", label: "Kuaför", icon: Scissors },
  { id: "GUZELLIK", label: "Güzellik", icon: Sparkles },
  { id: "DIGER", label: "Diğer", icon: Building2 },
]

const SECTOR_DISPLAY_NAMES: Record<Sector, string> = {
  SAGLIK: "Sağlık",
  RESTORAN: "Restoran",
  OTEL: "Otel",
  KUAFOR: "Kuaför",
  GUZELLIK: "Güzellik",
  DIGER: "Diğer",
}

const SECTOR_DESCRIPTIONS: Record<Sector, string> = {
  SAGLIK:
    "Sağlık sektöründe bir klinik sahibi iseniz, sizler için ön muhasebe, randevu takibi, hastalarla otomatik mesajlaşma, randevu hatırlatma gibi hizmetleri sağlayabiliriz.",
  RESTORAN:
    "Restoran sahibi iseniz, rezervasyon takibi, stok yönetimi, müşteri sadakat programı, sipariş yönetimi gibi hizmetleri sağlayabiliriz.",
  OTEL:
    "Otel işletmecisi iseniz, oda rezervasyonu, misafir yönetimi, gelir takibi, otomatik hatırlatmalar gibi hizmetleri sağlayabiliriz.",
  KUAFOR:
    "Kuaför salonu sahibi iseniz, randevu yönetimi, müşteri takibi, gelir-gider analizi, hatırlatma mesajları gibi hizmetleri sağlayabiliriz.",
  GUZELLIK:
    "Güzellik merkezi sahibi iseniz, randevu takibi, müşteri kayıtları, işlem geçmişi, otomatik hatırlatmalar gibi hizmetleri sağlayabiliriz.",
  DIGER:
    "İşletmeniz için özel randevu takibi, müşteri yönetimi, finansal raporlama ve otomatik mesajlaşma gibi hizmetleri sağlayabiliriz.",
}

const SECTOR_FEATURES: Record<Sector, string[]> = {
  SAGLIK: [
    "Hasta kaydı ve geçmiş yönetimi",
    "Randevu takibi ve hatırlatma",
    "Gelir-gider ve ön muhasebe",
    "WhatsApp ile otomatik mesajlaşma",
    "AI destekli asistan",
  ],
  RESTORAN: [
    "Rezervasyon yönetimi",
    "Stok ve envanter takibi",
    "Müşteri sadakat programı",
    "Sipariş yönetimi",
    "Gelir-gider analizi",
  ],
  OTEL: [
    "Oda rezervasyon sistemi",
    "Misafir kayıt yönetimi",
    "Gelir takibi ve raporlama",
    "Otomatik hatırlatmalar",
    "Kanal yönetimi",
  ],
  KUAFOR: [
    "Randevu yönetimi",
    "Müşteri kayıt ve geçmiş",
    "Gelir-gider analizi",
    "SMS/WhatsApp hatırlatma",
    "Çalışan ve prim takibi",
  ],
  GUZELLIK: [
    "Randevu ve seans takibi",
    "Müşteri kayıtları ve geçmiş",
    "İşlem geçmişi ve notlar",
    "Otomatik hatırlatmalar",
    "Finansal raporlama",
  ],
  DIGER: [
    "Randevu/rezervasyon takibi",
    "Müşteri yönetimi",
    "Finansal raporlama",
    "Otomatik mesajlaşma",
    "AI destekli asistan",
  ],
}

// ── Package Data ───────────────────────────────────────────────────────────

const BASIC_FEATURES = [
  "3 modül seçebilme hakkı",
  "WhatsApp VEYA Telegram entegrasyonu",
  "Temel raporlama",
  "100 müşteri/hasta kaydı",
  "Email destek",
]

const PRO_FEATURES = [
  "7 modül seçebilme hakkı",
  "WhatsApp VE Telegram entegrasyonu",
  "Gelişmiş raporlama ve grafikler",
  "Sınırsız müşteri/hasta kaydı",
  "Öncelikli destek",
  "Görsel üretme modülü",
  "Çalışan & prim yönetimi",
]

// ── Module Data ────────────────────────────────────────────────────────────

const MODULES: {
  id: ModuleId
  label: string
  icon: typeof Calendar
  proOnly: boolean
}[] = [
  { id: "RANDEVU", label: "Randevu Takip", icon: Calendar, proOnly: false },
  { id: "FINANS", label: "Finans Yönetimi", icon: DollarSign, proOnly: false },
  { id: "HATIRLATMA", label: "Hatırlatma Sistemi", icon: Bell, proOnly: false },
  { id: "RAPORLAMA", label: "Raporlama & Analitik", icon: BarChart3, proOnly: false },
  { id: "GORSEL", label: "Görsel Üretme", icon: Image, proOnly: true },
  { id: "AI_CHATBOT", label: "AI Chatbot Destek", icon: Bot, proOnly: false },
  { id: "CALISAN", label: "Çalışan & Prim Yönetimi", icon: Users, proOnly: true },
]

// ── Messaging Options ──────────────────────────────────────────────────────

const MESSAGING_OPTIONS: {
  id: "WHATSAPP" | "TELEGRAM" | "BOTH"
  label: string
  icon: typeof MessageCircle
}[] = [
  { id: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
  { id: "TELEGRAM", label: "Telegram", icon: Send },
  { id: "BOTH", label: "Her İkisi", icon: Smartphone },
]

// ── Component ──────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState(1)
  const [sector, setSector] = useState<Sector | "">("")
  const [plan, setPlan] = useState<Plan>("")
  const [selectedModules, setSelectedModules] = useState<ModuleId[]>([])
  const [messagingPreference, setMessagingPreference] =
    useState<MessagingPreference>("")
  const [phone, setPhone] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [clinicName, setClinicName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const totalSteps = 6
  const moduleLimit = plan === "PRO" ? 7 : 3

  function goNext() {
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
  }

  function goBack() {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  function handleSectorSelect(s: Sector) {
    setSector(s)
  }

  function handlePlanSelect(p: "BASIC" | "PRO") {
    setPlan(p)
    setSelectedModules([])
  }

  function handleModuleToggle(moduleId: ModuleId) {
    setSelectedModules((prev) => {
      if (prev.includes(moduleId)) {
        return prev.filter((m) => m !== moduleId)
      }
      if (prev.length >= moduleLimit) {
        return prev
      }
      return [...prev, moduleId]
    })
  }

  function handleMessagingSelect(pref: "WHATSAPP" | "TELEGRAM" | "BOTH") {
    setMessagingPreference(pref)
  }

  async function handleSubmit() {
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          clinicName,
          sector,
          plan,
          selectedModules,
          messagingPreference,
          phone,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || TEXT.errorDefault)
        return
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (signInResult?.error) {
        setError(TEXT.errorSignIn)
        return
      }

      router.push("/dashboard")
    } catch {
      setError(TEXT.errorGeneric)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map(
              (step) => (
                <div key={step} className="flex items-center">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                      step < currentStep
                        ? "bg-primary text-primary-foreground"
                        : step === currentStep
                          ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {step < currentStep ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      step
                    )}
                  </div>
                </div>
              )
            )}
          </div>
          <div className="relative h-2 w-full rounded-full bg-muted">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-300"
              style={{
                width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
              }}
            />
          </div>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {TEXT.step} {currentStep} / {totalSteps}
          </p>
        </div>

        {/* Back Button */}
        {currentStep > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {TEXT.back}
          </Button>
        )}

        {/* Step 1 - Sector Selection */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight">
                {TEXT.step1Title}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {TEXT.step1Subtitle}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {SECTORS.map(({ id, label, icon: Icon }) => (
                <Card
                  key={id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    sector === id
                      ? "ring-2 ring-primary border-primary"
                      : "hover:border-muted-foreground/30"
                  )}
                  onClick={() => handleSectorSelect(id)}
                >
                  <CardContent className="flex flex-col items-center justify-center p-6">
                    <Icon
                      className={cn(
                        "mb-3 h-10 w-10",
                        sector === id
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm font-medium",
                        sector === id ? "text-primary" : ""
                      )}
                    >
                      {label}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button
              className="w-full"
              size="lg"
              disabled={!sector}
              onClick={goNext}
            >
              {TEXT.continue}
            </Button>
          </div>
        )}

        {/* Step 2 - Sector Description */}
        {currentStep === 2 && sector && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight">
                {SECTOR_DISPLAY_NAMES[sector]} {TEXT.step2Suffix}
              </h1>
            </div>

            <Card>
              <CardContent className="p-6">
                <p className="mb-6 text-muted-foreground leading-relaxed">
                  {SECTOR_DESCRIPTIONS[sector]}
                </p>

                <div className="space-y-3">
                  {SECTOR_FEATURES[sector].map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button className="w-full" size="lg" onClick={goNext}>
              {TEXT.step2Button}
            </Button>
          </div>
        )}

        {/* Step 3 - Package Selection */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight">
                {TEXT.step3Title}
              </h1>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* BASIC Card */}
              <Card
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  plan === "BASIC"
                    ? "ring-2 ring-primary border-primary"
                    : ""
                )}
                onClick={() => handlePlanSelect("BASIC")}
              >
                <CardHeader>
                  <CardTitle className="text-xl">Basic</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">$29</span>
                    <span className="text-muted-foreground"> {TEXT.perMonth}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {BASIC_FEATURES.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePlanSelect("BASIC")
                      goNext()
                    }}
                  >
                    {TEXT.selectPackage}
                  </Button>
                </CardContent>
              </Card>

              {/* PRO Card */}
              <Card
                className={cn(
                  "relative cursor-pointer transition-all hover:shadow-md",
                  plan === "PRO"
                    ? "ring-2 ring-primary border-primary"
                    : "ring-1 ring-primary/30"
                )}
                onClick={() => handlePlanSelect("PRO")}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge>{TEXT.recommended}</Badge>
                </div>
                <CardHeader className="pt-8">
                  <CardTitle className="text-xl">Pro</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">$69</span>
                    <span className="text-muted-foreground"> {TEXT.perMonth}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {PRO_FEATURES.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                  <Button
                    className="mt-4 w-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePlanSelect("PRO")
                      goNext()
                    }}
                  >
                    {TEXT.selectPackage}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 4 - Module Selection */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight">
                {TEXT.step4Title}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {TEXT.moduleSubtitle(moduleLimit)}
              </p>
            </div>

            <div className="text-center">
              <Badge variant="secondary" className="text-sm">
                {TEXT.moduleCounter(selectedModules.length, moduleLimit)}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {MODULES.map(({ id, label, icon: Icon, proOnly }) => {
                const isSelected = selectedModules.includes(id)
                const isLockedByPlan = proOnly && plan === "BASIC"
                const isLimitReached =
                  selectedModules.length >= moduleLimit && !isSelected
                const isDisabled = isLockedByPlan || isLimitReached

                return (
                  <Card
                    key={id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      isSelected
                        ? "ring-2 ring-primary border-primary"
                        : "",
                      isDisabled
                        ? "opacity-50 cursor-not-allowed hover:shadow-none"
                        : ""
                    )}
                    onClick={() => {
                      if (!isDisabled) {
                        handleModuleToggle(id)
                      }
                    }}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {isLockedByPlan ? (
                          <Lock className="h-5 w-5" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium">{label}</span>
                        {isLockedByPlan && (
                          <p className="text-xs text-muted-foreground">
                            {TEXT.proOnly}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <Button
              className="w-full"
              size="lg"
              disabled={selectedModules.length === 0}
              onClick={goNext}
            >
              {TEXT.continue}
            </Button>
          </div>
        )}

        {/* Step 5 - Messaging Preference */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight">
                {TEXT.step5Title}
              </h1>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {MESSAGING_OPTIONS.map(({ id, label, icon: Icon }) => (
                <Card
                  key={id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    messagingPreference === id
                      ? "ring-2 ring-primary border-primary"
                      : ""
                  )}
                  onClick={() => handleMessagingSelect(id)}
                >
                  <CardContent className="flex flex-col items-center justify-center p-6">
                    <Icon
                      className={cn(
                        "mb-3 h-10 w-10",
                        messagingPreference === id
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm font-medium",
                        messagingPreference === id ? "text-primary" : ""
                      )}
                    >
                      {label}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{TEXT.phoneLbl}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+90 5XX XXX XX XX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              size="lg"
              disabled={!messagingPreference}
              onClick={goNext}
            >
              {TEXT.continue}
            </Button>
          </div>
        )}

        {/* Step 6 - Registration */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight">
                {TEXT.step6Title}
              </h1>
            </div>

            <Card>
              <CardContent className="space-y-4 p-6">
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">{TEXT.nameLbl}</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder={TEXT.namePlaceholder}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{TEXT.emailLbl}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ornek@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{TEXT.passwordLbl}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="******"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clinicName">{TEXT.businessLbl}</Label>
                  <Input
                    id="clinicName"
                    type="text"
                    placeholder={TEXT.businessPlaceholder}
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  disabled={
                    loading || !name || !email || !password || !clinicName
                  }
                  onClick={handleSubmit}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {TEXT.submitting}
                    </>
                  ) : (
                    TEXT.submitBtn
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
