import { ImageResponse } from "next/og";

// Site-wide default OG/Twitter image (Next.js file convention — applies to
// every route that doesn't define its own opengraph-image.js). Uses the
// real brand tokens from app/globals.css (hard rule 5's design source of
// truth), not an external asset — no logo file exists to embed, and this
// avoids a build-time network fetch for a custom font just for one image.
export const alt = "StockedBy — does AI recommend your brand?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 90px",
          background: "#FCFBF7",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 56 }}>
          <span style={{ fontSize: 44, fontWeight: 800, color: "#16180F" }}>stocked</span>
          <span
            style={{
              fontSize: 44,
              fontWeight: 800,
              color: "#16180F",
              background: "#FFC53D",
              padding: "2px 14px",
              borderRadius: 10,
              marginLeft: 2,
            }}
          >
            by
          </span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.15,
            color: "#16180F",
            maxWidth: 920,
          }}
        >
          Does AI recommend your brand — or your competitor?
        </div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 28, color: "#666355" }}>
          Free AI visibility test for India, UAE and Saudi Arabia
        </div>
      </div>
    ),
    { ...size }
  );
}
