import { ImageResponse } from "next/og";

export const alt = "StockedBy — Get on AI’s shopping shortlist.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "64px 80px", background: "#fafaf8", color: "#252725", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 36, fontWeight: 700 }}>
        <svg width="52" height="52" viewBox="0 0 40 40"><rect width="40" height="40" rx="11" fill="#252725"/><path d="M28 12H12v8h16v8H12" fill="none" stroke="white" strokeWidth="4"/></svg>
        stockedby<span style={{ color: "#a5442d", marginLeft: -16 }}>.</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", fontSize: 76, letterSpacing: -3, lineHeight: 1.12, marginTop: 56 }}>
        <span>Get on AI’s</span>
        <span style={{ color: "#a5442d", fontStyle: "italic", fontFamily: "serif" }}>shopping shortlist.</span>
      </div>
      <div style={{ display: "flex", marginTop: "auto", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #dedfd9", paddingTop: 28, fontSize: 23, color: "#626660" }}>
        <span>Find out where your brand stands.</span>
        <span style={{ background: "#edf3f8", padding: "12px 20px", borderRadius: 8, color: "#252725" }}>India + the Gulf ↗</span>
      </div>
    </div>,
    size
  );
}
