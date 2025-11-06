import { ImageResponse } from "next/og"

export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default async function Image() {
  // Derive absolute base for assets to avoid localhost fallback in production
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "http://localhost:3000")

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a0c 0%, #0d0d10 100%)",
          color: "white",
          fontSize: 56,
          fontWeight: 600,
          letterSpacing: -0.5,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
          }}
        >
          {/* Logo */}
          { }
          <img
            src={new URL("/img/kyliologo.png", appUrl).toString()}
            width={200}
            height={200}
            alt="Cleo logo"
            style={{ borderRadius: 24 }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ opacity: 0.8, fontSize: 28 }}>Huminary Labs</div>
            <div>Cleo - Agent of Agents</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
