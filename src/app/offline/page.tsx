"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F6FA] px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Bağlantı Yok</h1>
        <p className="text-sm text-gray-500 mb-6">
          İnternet bağlantınız kesilmiş görünüyor. Bağlantınızı kontrol edip tekrar deneyin.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full rounded-xl bg-[#6366F1] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4F46E5] transition-colors"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}
