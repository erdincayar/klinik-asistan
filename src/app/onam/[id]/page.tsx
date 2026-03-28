"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";

interface ConsentFormData {
  id: string;
  title: string;
  description: string | null;
  content: string;
  fields: { label: string; type: string; required: boolean }[] | null;
  clinic: { name: string };
}

export default function PublicConsentFormPage() {
  const params = useParams();
  const formId = params.id as string;

  const [form, setForm] = useState<ConsentFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [patientName, setPatientName] = useState("");
  const [patientTc, setPatientTc] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [agreed, setAgreed] = useState(false);

  // Signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    fetch(`/api/consent-forms/public/${formId}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setForm(data.form))
      .catch(() => setError("Form bulunamadı veya artık aktif değil."))
      .finally(() => setLoading(false));
  }, [formId]);

  // Canvas drawing
  const getCanvasCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  }, [getCanvasCoords]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#1A1A2E";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
  }, [isDrawing, getCanvasCoords]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const handleSubmit = async () => {
    if (!patientName.trim()) {
      setError("Ad Soyad zorunludur.");
      return;
    }
    if (!agreed) {
      setError("Formu onaylamanız gerekmektedir.");
      return;
    }

    // Check required fields
    if (form?.fields) {
      for (const field of form.fields) {
        if (field.required && !fieldValues[field.label]) {
          setError(`"${field.label}" alanı zorunludur.`);
          return;
        }
      }
    }

    setSubmitting(true);
    setError("");

    try {
      const signature = hasSignature ? canvasRef.current?.toDataURL("image/png") : null;

      const res = await fetch(`/api/consent-forms/public/${formId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: patientName.trim(),
          patientTc: patientTc.trim() || null,
          signature,
          fieldValues: Object.keys(fieldValues).length > 0 ? fieldValues : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Bir hata oluştu.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#6366F1]" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Form Bulunamadı</h1>
          <p className="text-gray-500">{error || "Bu onam formu artık mevcut değil."}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Onam Formu Gönderildi</h1>
          <p className="text-gray-500">
            Teşekkürler {patientName}, onam formunuz başarıyla kaydedildi.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6FA] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <p className="text-xs font-medium text-[#6366F1] mb-1">{form.clinic.name}</p>
          <h1 className="text-xl font-bold text-gray-900">{form.title}</h1>
          {form.description && (
            <p className="text-sm text-gray-500 mt-1">{form.description}</p>
          )}
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {form.content}
          </div>
        </div>

        {/* Form Fields */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Bilgileriniz</h2>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Ad Soyad *</label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">TC Kimlik No</label>
            <input
              type="text"
              value={patientTc}
              onChange={(e) => setPatientTc(e.target.value)}
              maxLength={11}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 outline-none"
            />
          </div>

          {/* Dynamic Fields */}
          {form.fields?.map((field) => (
            <div key={field.label} className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                {field.label} {field.required && "*"}
              </label>
              {field.type === "checkbox" ? (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!fieldValues[field.label]}
                    onChange={(e) => setFieldValues({ ...fieldValues, [field.label]: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-[#6366F1]"
                  />
                  <span className="text-sm text-gray-600">{field.label}</span>
                </label>
              ) : (
                <input
                  type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                  value={fieldValues[field.label] || ""}
                  onChange={(e) => setFieldValues({ ...fieldValues, [field.label]: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 outline-none"
                />
              )}
            </div>
          ))}
        </div>

        {/* Signature */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">İmza</h2>
            {hasSignature && (
              <button onClick={clearSignature} className="text-xs text-red-500 hover:underline">
                Temizle
              </button>
            )}
          </div>
          <div className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50">
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              className="w-full cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">Parmağınız veya farenizle imzanızı çizin</p>
        </div>

        {/* Agreement & Submit */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <label className="flex items-start gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#6366F1]"
            />
            <span className="text-sm text-gray-700">
              Yukarıdaki onam formunu okudum, anladım ve kabul ediyorum.
            </span>
          </label>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 mb-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !agreed || !patientName.trim()}
            className="w-full rounded-lg bg-[#6366F1] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4F46E5] disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            ) : (
              "Onam Formunu Gönder"
            )}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Bu form {form.clinic.name} tarafından Poby.ai üzerinden oluşturulmuştur.
        </p>
      </div>
    </div>
  );
}
