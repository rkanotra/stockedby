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
        background: "#0b0c10",
        color: "#f4f4f7",
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
            background: "#a998ff",
            color: "#11101a",
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
          marginTop: 50,
        }}
      >
        <span>Your markets.</span>
        <span style={{ color: "#a998ff" }}>A clearer signal.</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: "1px solid #292a34",
          paddingTop: 25,
          marginTop: "auto",
          fontSize: 21,
          color: "#a4a5b2",
        }}
      >
        <span>India + US. News, holdings and AI research.</span>
        <span>StockedBy Research ↗</span>
      </div>
    </div>,
    size,
  );
}
