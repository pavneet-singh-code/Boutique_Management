export default function manifest() {
  return {
    name: "Fab_art Studio",
    short_name: "Fab_art",
    description: "Boutique order management",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ebe9e6",
    theme_color: "#ebe9e6",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
