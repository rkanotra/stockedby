import { ImageResponse } from "next/og";
export const alt = "StockedBy — Your markets. A clearer signal.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "62px 72px",
        background: "linear-gradient(115deg, #d96549, #dc684d 85%, #ed795b)",
        color: "#fff8f0",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 15,
          fontSize: 32,
          fontWeight: 700,
        }}
      >
        <span
          style={{
            display: "flex",
            background: "#091849",
            color: "#fff8f0",
            padding: "0 10px",
            borderRadius: 8,
          }}
        >
          s↗
        </span>
        stockedby.
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: 76,
          lineHeight: 1.12,
          letterSpacing: -3,
          fontWeight: 800,
          marginTop: 50,
        }}
      >
        <span>Your markets.</span>
        <span style={{ color: "#091849" }}>A clearer signal.</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: "1px solid #09184933",
          paddingTop: 25,
          marginTop: "auto",
          fontSize: 21,
          color: "#091849",
        }}
      >
        <span>India + US. News, holdings and AI research.</span>
        <span>StockedBy Research ↗</span>
      </div>
    </div>,
    size,
  );
}
