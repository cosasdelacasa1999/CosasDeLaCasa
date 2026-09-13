import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "El Bazar Cubides",
  description: "Venta de garage y tesoros guardados",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}