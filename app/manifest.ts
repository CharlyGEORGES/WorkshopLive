import type { MetadataRoute } from "next";

// Installable sur l'écran d'accueil du téléphone de l'artisan : pas d'application native.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Le direct de l'atelier",
    short_name: "Atelier",
    start_url: "/atelier",
    display: "standalone",
    orientation: "any",
    background_color: "#1c1917",
    theme_color: "#1c1917",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
