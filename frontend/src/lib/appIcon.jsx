import { ImageResponse } from "next/og";

// App icon: white needle-and-thread "F" on WhatsApp-style green.
export function renderAppIcon(size) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1daa61",
          color: "white",
          fontSize: size * 0.56,
          fontWeight: 700,
          fontFamily: "serif",
        }}
      >
        F
      </div>
    ),
    { width: size, height: size }
  );
}
