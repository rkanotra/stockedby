import { ImageResponse } from "next/og";
export const alt = "StockedBy — Your product thinking, connected.";
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
        background: "#141a16",
        color: "#f0f3e9",
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
            background: "#d8f478",
            color: "#1c2815",
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
        <span>Big thinking.</span>
        <span style={{ color: "#d8f478" }}>Beautifully connected.</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: "1px solid #425634",
          paddingTop: 25,
          marginTop: "auto",
          fontSize: 21,
          color: "#a8bd94",
        }}
      >
        <span>Your ideas. Your standards. Your workflow.</span>
        <span>OpenAI powered ↗</span>
      </div>
    </div>,
    size,
  );
}
