import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0f14",
          borderRadius: 96,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 200,
              lineHeight: 1,
            }}
          >
            ⚽
          </div>
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              letterSpacing: 4,
              color: "#22c55e",
            }}
          >
            MATCHAT
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
