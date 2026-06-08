import "./globals.css";
import InstallPWA from "./InstallPWA";

export const metadata = {
  title: "Aveho — Espace Collectivité",
  description: "Espace Collectivité Aveho : établissements, patients, matériel, stock et commandes.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Aveho EC" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport = {
  themeColor: "#142131",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.47.0/tabler-icons.min.css" />
      </head>
      <body>
        {children}
        <InstallPWA />
      </body>
    </html>
  );
}
