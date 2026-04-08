import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Poby.ai — İşletmelerin AI Dostu";
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
          background: "linear-gradient(145deg, #19094D 0%, #3B1D8E 35%, #6C3CE1 70%, #5B33E1 100%)",
          fontFamily: "Inter, system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background decoration circles */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            right: "-80px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.05)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-100px",
            left: "-60px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.04)",
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "38px",
              fontWeight: 800,
              color: "#6C3CE1",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
            }}
          >
            P
          </div>
          <span
            style={{
              fontSize: "52px",
              fontWeight: 800,
              color: "white",
              letterSpacing: "-1.5px",
            }}
          >
            Poby.ai
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "42px",
            fontWeight: 700,
            color: "white",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: "16px",
          }}
        >
          İşletmelerin AI Dostu
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: "20px",
            color: "rgba(255, 255, 255, 0.7)",
            textAlign: "center",
            maxWidth: "700px",
            lineHeight: 1.5,
            marginBottom: "36px",
          }}
        >
          Klinik, restoran, kuaför, otel — işletmenizi AI ile tek platformdan yönetin.
        </div>

        {/* Feature badges */}
        <div
          style={{
            display: "flex",
            gap: "12px",
          }}
        >
          {["Randevu", "Finans", "WhatsApp Bot", "AI Asistan", "Stok"].map(
            (feature) => (
              <div
                key={feature}
                style={{
                  background: "rgba(255, 255, 255, 0.12)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "10px",
                  padding: "8px 18px",
                  fontSize: "15px",
                  color: "rgba(255, 255, 255, 0.85)",
                  fontWeight: 500,
                }}
              >
                {feature}
              </div>
            )
          )}
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: "28px",
            fontSize: "16px",
            color: "rgba(255, 255, 255, 0.4)",
            fontWeight: 500,
            letterSpacing: "0.5px",
          }}
        >
          poby.ai
        </div>
      </div>
    ),
    { ...size }
  );
}
