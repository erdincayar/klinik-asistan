"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  UserPlus,
  UserMinus,
  Download,
  Loader2,
  Eye,
  ChevronRight,
} from "lucide-react";

/* ──────────────────────── TYPES ──────────────────────── */

interface DocumentDef {
  type: string;
  label: string;
  description: string;
}

interface Category {
  id: string;
  label: string;
  icon: typeof UserPlus;
  documents: DocumentDef[];
}

/* ──────────────────────── DATA ──────────────────────── */

const categories: Category[] = [
  {
    id: "hire",
    label: "İşe Alış",
    icon: UserPlus,
    documents: [
      { type: "is_sozlesmesi", label: "İş Sözleşmesi", description: "4857 sayılı İş Kanunu'na uygun belirsiz süreli iş sözleşmesi" },
      { type: "ise_baslama_bildirimi", label: "İşe Başlama Bildirimi", description: "SGK işe giriş bildirimi formu" },
      { type: "ozluk_formu", label: "Özlük Dosyası Formu", description: "Çalışan özlük bilgileri formu" },
      { type: "gizlilik_sozlesmesi", label: "Gizlilik Sözleşmesi", description: "Ticari sır ve gizlilik taahhütnamesi" },
    ],
  },
  {
    id: "terminate",
    label: "İşten Çıkarma",
    icon: UserMinus,
    documents: [
      { type: "istifa_dilekçesi", label: "İstifa Dilekçesi", description: "Çalışan istifa beyan dilekçesi" },
      { type: "fesih_bildirimi", label: "Fesih Bildirimi", description: "İşveren tarafından fesih bildirimi" },
      { type: "kidem_ihbar_formu", label: "Kıdem/İhbar Tazminatı Formu", description: "Kıdem ve ihbar tazminatı hesap formu" },
      { type: "ibraname", label: "İbraname", description: "İş ilişkisi sona erme ibranamesu" },
    ],
  },
];

/* ──────────────────────── PAGE ──────────────────────── */

export default function HRPage() {
  const [selectedDoc, setSelectedDoc] = useState<DocumentDef | null>(null);
  const [activeCategory, setActiveCategory] = useState("hire");

  // Form state
  const [employeeName, setEmployeeName] = useState("");
  const [tcNo, setTcNo] = useState("");
  const [startDate, setStartDate] = useState("");
  const [position, setPosition] = useState("");
  const [salary, setSalary] = useState("");

  // Result state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [generatedLabel, setGeneratedLabel] = useState("");

  const previewRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (!selectedDoc) return;
    if (!employeeName || !tcNo || !startDate || !position || !salary) {
      setError("Lütfen tüm alanları doldurun.");
      return;
    }
    if (tcNo.length !== 11 || !/^\d+$/.test(tcNo)) {
      setError("TC Kimlik No 11 haneli rakamlardan oluşmalıdır.");
      return;
    }

    setLoading(true);
    setError("");
    setGeneratedContent("");

    try {
      const res = await fetch("/api/hr/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: selectedDoc.type,
          employeeName,
          tcNo,
          startDate,
          position,
          salary,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Belge oluşturulamadı.");
        return;
      }

      setGeneratedContent(data.content);
      setGeneratedLabel(data.documentLabel);
    } catch {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!previewRef.current) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${generatedLabel}</title>
          <style>
            @page { margin: 2cm; }
            body {
              font-family: 'Times New Roman', serif;
              font-size: 12pt;
              line-height: 1.6;
              color: #000;
              max-width: 210mm;
              margin: 0 auto;
              padding: 20px;
            }
            h1, h2, h3 { font-weight: bold; }
            h1 { font-size: 16pt; text-align: center; margin-bottom: 24pt; }
            h2 { font-size: 14pt; margin-top: 18pt; }
            h3 { font-size: 12pt; margin-top: 12pt; }
            p { margin: 6pt 0; text-align: justify; }
            ul, ol { margin: 6pt 0 6pt 20pt; }
            table { width: 100%; border-collapse: collapse; margin: 12pt 0; }
            th, td { border: 1px solid #000; padding: 6pt 8pt; text-align: left; font-size: 11pt; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .signature-area { margin-top: 48pt; display: flex; justify-content: space-between; }
            .signature-box { width: 45%; text-align: center; }
            .signature-line { border-top: 1px solid #000; margin-top: 48pt; padding-top: 6pt; }
            hr { border: none; border-top: 1px solid #ccc; margin: 12pt 0; }
            strong { font-weight: bold; }
          </style>
        </head>
        <body>
          ${formatContentToHTML(generatedContent)}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-gray-900">İnsan Kaynakları</h1>
        <p className="text-gray-500 mt-1">
          Türk İş Kanunu&apos;na uygun İK belgeleri oluşturun
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ──── SOL: Belge Kategorileri ──── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-4 xl:col-span-3"
        >
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <div key={cat.id}>
                  <button
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left font-semibold transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600"
                        : "text-gray-700 hover:bg-gray-50 border-l-4 border-transparent"
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {cat.label}
                  </button>
                  {isActive && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="border-t border-gray-100"
                    >
                      {cat.documents.map((doc) => {
                        const isSelected = selectedDoc?.type === doc.type;
                        return (
                          <button
                            key={doc.type}
                            onClick={() => {
                              setSelectedDoc(doc);
                              setGeneratedContent("");
                              setError("");
                            }}
                            className={`w-full flex items-center gap-2 px-4 py-2.5 pl-8 text-sm text-left transition-colors ${
                              isSelected
                                ? "bg-blue-100 text-blue-800 font-medium"
                                : "text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            <FileText className="w-4 h-4 flex-shrink-0" />
                            <span className="flex-1">{doc.label}</span>
                            {isSelected && (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Token bilgisi */}
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800">
              <strong>Token Kullanımı:</strong> Her belge oluşturma işlemi 3.000 token harcar.
            </p>
          </div>
        </motion.div>

        {/* ──── SAĞ: Form + Önizleme ──── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-8 xl:col-span-9 space-y-6"
        >
          {/* Form */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {selectedDoc ? selectedDoc.label : "Belge Bilgileri"}
            </h2>
            {selectedDoc && (
              <p className="text-sm text-gray-500 mb-4">
                {selectedDoc.description}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ad Soyad *
                </label>
                <input
                  type="text"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  placeholder="Çalışanın adı soyadı"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TC Kimlik No *
                </label>
                <input
                  type="text"
                  value={tcNo}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                    setTcNo(val);
                  }}
                  placeholder="11 haneli TC Kimlik No"
                  maxLength={11}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  İşe Başlama Tarihi *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pozisyon *
                </label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Örn: Yazılım Geliştirici"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aylık Brüt Maaş (TL) *
                </label>
                <input
                  type="text"
                  value={salary}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^\d.,]/g, "");
                    setSalary(val);
                  }}
                  placeholder="Örn: 35000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleGenerate}
                disabled={loading || !selectedDoc}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Belge Oluştur
                  </>
                )}
              </button>
              {!selectedDoc && (
                <p className="text-sm text-gray-400 self-center">
                  Önce soldaki listeden bir belge türü seçin
                </p>
              )}
            </div>
          </div>

          {/* Önizleme */}
          {generatedContent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">
                    {generatedLabel} — Önizleme
                  </h3>
                </div>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  PDF İndir
                </button>
              </div>
              <div
                ref={previewRef}
                className="p-6 md:p-10 prose prose-sm max-w-none"
                style={{ fontFamily: "'Times New Roman', serif" }}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: formatContentToHTML(generatedContent),
                  }}
                />
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

/* ──────────────────────── HELPERS ──────────────────────── */

function formatContentToHTML(markdown: string): string {
  let html = markdown
    // Headers
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Horizontal rule
    .replace(/^---$/gm, "<hr />")
    // Unordered lists
    .replace(/^[-•] (.+)$/gm, "<li>$1</li>")
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    // Line breaks → paragraphs
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br />");

  // Wrap consecutive <li> in <ul>
  html = html.replace(
    /(<li>.*?<\/li>)(?:<br \/>)?/g,
    "$1"
  );
  html = html.replace(
    /((?:<li>.*?<\/li>)+)/g,
    "<ul>$1</ul>"
  );

  return `<p>${html}</p>`;
}
