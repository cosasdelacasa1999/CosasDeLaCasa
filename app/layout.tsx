import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "El Bazar Cubides",
  description: "Venta de garage y tesoros guardados",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  other: {
    "color-scheme": "light only",
    "supported-color-schemes": "light",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#0f766e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="light" style={{ colorScheme: "light" }}>
      <head>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light" />
      </head>
      <body className="bg-[#fcfcfc] text-neutral-800" style={{ colorScheme: "light" }}>
        {children}
      </body>
    </html>
  );
}