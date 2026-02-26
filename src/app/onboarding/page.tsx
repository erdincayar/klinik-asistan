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
  step: "Ad\u0131m",
  continue: "Devam Et",
  back: "Geri",
  step1Title: "Hangi Sekt\u00f6rdesiniz?",
  step1Subtitle: "\u0130\u015fletmenize en uygun \u00e7\u00f6z\u00fcm\u00fc sunabilmemiz i\u00e7in sekt\u00f6r\u00fcn\u00fcz\u00fc se\u00e7in",
  step2Suffix: "Sekt\u00f6r\u00fc",
  step2Button: "Hadi sizin i\u00e7in paket se\u00e7elim",
  step3Title: "Size Uygun Paketi Se\u00e7in",
  selectPackage: "Bu Paketi Se\u00e7",
  recommended: "\u00d6nerilen",
  step4Title: "Mod\u00fcllerinizi Se\u00e7in",
  moduleSubtitle: (limit: number) => `(${limit} mod\u00fcl se\u00e7ebilirsiniz)`,
  moduleCounter: (count: number, limit: number) => `${count}/${limit} mod\u00fcl se\u00e7ildi`,
  proOnly: "Sadece Pro pakette",
  step5Title: "Sistemi nereden y\u00f6netmek istersiniz?",
  phoneLbl: "Telefon Numaran\u0131z",
  step6Title: "Hesab\u0131n\u0131z\u0131 Olu\u015fturun",
  nameLbl: "\u0130sim",
  namePlaceholder: "Ad\u0131n\u0131z Soyad\u0131n\u0131z",
  emailLbl: "Email",
  passwordLbl: "\u015eifre",
  businessLbl: "\u0130\u015fletme Ad\u0131",
  businessPlaceholder: "\u0130\u015fletmenizin ad\u0131",
  submitBtn: "Kay\u0131t Ol ve Ba\u015fla",
  submitting: "Kay\u0131t yap\u0131l\u0131yor...",
  errorDefault: "Kay\u0131t s\u0131ras\u0131nda bir hata olu\u015ftu",
  errorSignIn: "Kay\u0131t ba\u015far\u0131l\u0131 ancak giri\u015f yap\u0131lamad\u0131. L\u00fctfen giri\u015f sayfas\u0131ndan deneyin.",
  errorGeneric: "Bir hata olu\u015ftu. L\u00fctfen tekrar deneyin.",
  bothLabel: "Her \u0130kisi",
  perMonth: "/ay",
} as const

// ── Sector Data ────────────────────────────────────────────────────────────

const SECTORS: { id: Sector; label: string; icon: typeof Stethoscope }[] = [
  { id: "SAGLIK", label: "Sa\u011fl\u0131k", icon: Stethoscope },
  { id: "RESTORAN", label: "Restoran", icon: UtensilsCrossed },
  { id: "OTEL", label: "Otel", icon: Hotel },
  { id: "KUAFOR", label: "Kuaf\u00f6r", icon: Scissors },
  { id: "GUZELLIK", label: "G\u00fczellik", icon: Sparkles },
  { id: "DIGER", label: "Di\u011fer", icon: Building2 },
]

const SECTOR_DISPLAY_NAMES: Record<Sector, string> = {
  SAGLIK: "Sa\u011fl\u0131k",
  RESTORAN: "Restoran",
  OTEL: "Otel",
  KUAFOR: "Kuaf\u00f6r",
  GUZELLIK: "G\u00fczellik",
  DIGER: "Di\u011fer",
}

const SECTOR_DESCRIPTIONS: Record<Sector, string> = {
  SAGLIK:
    "Sa\u011fl\u0131k sekt\u00f6r\u00fcnde bir klinik sahibi iseniz, sizler i\u00e7in \u00f6n muhasebe, randevu takibi, hastalarla otomatik mesajla\u015fma, randevu hat\u0131rlatma gibi hizmetleri sa\u011flayabiliriz.",
  RESTORAN:
    "Restoran sahibi iseniz, rezervasyon takibi, stok y\u00f6netimi, m\u00fc\u015fteri sadakat program\u0131, sipari\u015f y\u00f6netimi gibi hizmetleri sa\u011flayabiliriz.",
  OTEL:
    "Otel i\u015fletmecisi iseniz, oda rezervasyonu, misafir y\u00f6netimi, gelir takibi, otomatik hat\u0131rlatmalar gibi hizmetleri sa\u011flayabiliriz.",
  KUAFOR:
    "Kuaf\u00f6r salonu sahibi iseniz, randevu y\u00f6netimi, m\u00fc\u015fteri takibi, gelir-gider analizi, hat\u0131rlatma mesajlar\u0131 gibi hizmetleri sa\u011flayabiliriz.",
  GUZELLIK:
    "G\u00fczellik merkezi sahibi iseniz, randevu takibi, m\u00fc\u015fteri kay\u0131tlar\u0131, i\u015flem ge\u00e7mi\u015fi, otomatik hat\u0131rlatmalar gibi hizmetleri sa\u011flayabiliriz.",
  DIGER:
    "\u0130\u015fletmeniz i\u00e7in \u00f6zel randevu takibi, m\u00fc\u015fteri y\u00f6netimi, finansal raporlama ve otomatik mesajla\u015fma gibi hizmetleri sa\u011flayabiliriz.",
}

const SECTOR_FEATURES: Record<Sector, string[]> = {
  SAGLIK: [
    "Hasta kayd\u0131 ve ge\u00e7mi\u015f y\u00f6netimi",
    "Randevu takibi ve hat\u0131rlatma",
    "Gelir-gider ve \u00f6n muhasebe",
    "WhatsApp ile otomatik mesajla\u015fma",
    "AI destekli asistan",
  ],
  RESTORAN: [
    "Rezervasyon y\u00f6netimi",
    "Stok ve envanter takibi",
    "M\u00fc\u015fteri sadakat program\u0131",
    "Sipari\u015f y\u00f6netimi",
    "Gelir-gider analizi",
  ],
  OTEL: [
    "Oda rezervasyon sistemi",
    "Misafir kay\u0131t y\u00f6netimi",
    "Gelir takibi ve raporlama",
    "Otomatik hat\u0131rlatmalar",
    "Kanal y\u00f6netimi",
  ],
  KUAFOR: [
    "Randevu y\u00f6netimi",
    "M\u00fc\u015fteri kay\u0131t ve ge\u00e7mi\u015f",
    "Gelir-gider analizi",
    "SMS/WhatsApp hat\u0131rlatma",
    "\u00c7al\u0131\u015fan ve prim takibi",
  ],
  GUZELLIK: [
    "Randevu ve seans takibi",
    "M\u00fc\u015fteri kay\u0131tlar\u0131 ve ge\u00e7mi\u015f",
    "\u0130\u015flem ge\u00e7mi\u015fi ve notlar",
    "Otomatik hat\u0131rlatmalar",
    "Finansal raporlama",
  ],
  DIGER: [
    "Randevu/rezervasyon takibi",
    "M\u00fc\u015fteri y\u00f6netimi",
    "Finansal raporlama",
    "Otomatik mesajla\u015fma",
    "AI destekli asistan",
  ],
}

// ── Package Data ───────────────────────────────────────────────────────────

const BASIC_FEATURES = [
  "3 mod\u00fcl se\u00e7ebilme hakk\u0131",
  "WhatsApp VEYA Telegram entegrasyonu",
  "Temel raporlama",
  "100 m\u00fc\u015fteri/hasta kayd\u0131",
  "Email destek",
]

const PRO_FEATURES = [
  "7 mod\u00fcl se\u00e7ebilme hakk\u0131",
  "WhatsApp VE Telegram entegrasyonu",
  "Geli\u015fmi\u015f raporlama ve grafikler",
  "S\u0131n\u0131rs\u0131z m\u00fc\u015fteri/hasta kayd\u0131",
  "\u00d6ncelikli destek",
  "G\u00f6rsel \u00fcretme mod\u00fcl\u00fc",
  "\u00c7al\u0131\u015fan & prim y\u00f6netimi",
]

// ── Module Data ────────────────────────────────────────────────────────────

const MODULES: {
  id: ModuleId
  label: string
  icon: typeof Calendar
  proOnly: boolean
}[] = [
  { id: "RANDEVU", label: "Randevu Takip", icon: Calendar, proOnly: false },
  { id: "FINANS", label: "Finans Y\u00f6netimi", icon: DollarSign, proOnly: false },
  { id: "HATIRLATMA", label: "Hat\u0131rlatma Sistemi", icon: Bell, proOnly: false },
  { id: "RAPORLAMA", label: "Raporlama & Analitik", icon: BarChart3, proOnly: false },
  { id: "GORSEL", label: "G\u00f6rsel \u00dcretme", icon: Image, proOnly: true },
  { id: "AI_CHATBOT", label: "AI Chatbot Destek", icon: Bot, proOnly: false },
  { id: "CALISAN", label: "\u00c7al\u0131\u015fan & Prim Y\u00f6netimi", icon: Users, proOnly: true },
]

// ── Messaging Options ──────────────────────────────────────────────────────

const MESSAGING_OPTIONS: {
  id: "WHATSAPP" | "TELEGRAM" | "BOTH"
  label: string
  icon: typeof MessageCircle
}[] = [
  { id: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
  { id: "TELEGRAM", label: "Telegram", icon: Send },
  { id: "BOTH", label: "Her \u0130kisi", icon: Smartphone },
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
