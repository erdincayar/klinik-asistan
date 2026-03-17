import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Poby.ai — AI Destekli İşletme Yönetim Platformu";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4338ca 60%, #6366f1 100%)",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Logo area */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: 800,
              color: "#4338ca",
            }}
          >
            P
          </div>
          <span
            style={{
              fontSize: "48px",
              fontWeight: 800,
              color: "white",
              letterSpacing: "-1px",
            }}
          >
            Poby.ai
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "36px",
            fontWeight: 700,
            color: "white",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.3,
            marginBottom: "24px",
          }}
        >
          AI Destekli İşletme Yönetim Platformu
        </div>

        {/* Features row */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginTop: "8px",
          }}
        >
          {["WhatsApp Asistan", "Randevu Yönetimi", "Finans Takibi", "AI Pazarlama"].map(
            (feature) => (
              <div
                key={feature}
                style={{
                  background: "rgba(255, 255, 255, 0.15)",
                  borderRadius: "12px",
                  padding: "10px 20px",
                  fontSize: "16px",
                  color: "rgba(255, 255, 255, 0.9)",
                  fontWeight: 500,
                }}
              >
                {feature}
              </div>
            )
          )}
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            fontSize: "18px",
            color: "rgba(255, 255, 255, 0.6)",
            fontWeight: 500,
          }}
        >
          poby.ai
        </div>
      </div>
    ),
    { ...size }
  );
}
