import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pollo Medina® | Pollo asado al carbón desde 1989 · Servicio a domicilio",
  description: "Pollo Medina: pollo asado al carbón, papitas Galeana, cortes y botanas. Pura Vitamina desde 1989. Pide a domicilio por WhatsApp.",
  themeColor: "#e4022a",
  icons: {
    icon: "/assets/img/logo.png",
    apple: "/assets/img/logo.png",
  },
  openGraph: {
    type: "website",
    locale: "es_MX",
    title: "Pollo Medina® · Pura Vitamina desde 1989",
    description: "Pollo asado al carbón, papitas Galeana, tortillas y salsas. Pide a domicilio por WhatsApp.",
    images: "/assets/img/og.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-MX" style={{ scrollBehavior: "smooth" }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Outfit:wght@300;400;500;600;700;800&family=Luckiest+Guy&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
