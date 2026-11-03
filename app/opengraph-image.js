import { ImageResponse } from "next/og";
export const alt = "StockedBy — Your investments, in context.";
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
        background: "#f8f9fc",
        color: "#192b42",
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
            background: "#ad6414",
            color: "#ffffff",
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
        <span>Less noise.</span>
        <span style={{ color: "#ad6414" }}>More perspective.</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: "1px solid #dce3ec",
          paddingTop: 25,
          marginTop: "auto",
          fontSize: 21,
          color: "#536279",
        }}
      >
        <span>India. UAE. US. Your investments, in context.</span>
        <span>StockedBy Research ↗</span>
      </div>
    </div>,
    size,
  );
}
