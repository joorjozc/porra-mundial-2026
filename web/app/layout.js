import "./globals.css";

export const metadata = {
  title: "Porra Mundial 2026",
  description: "Porra del Mundial 2026 — clasificación y pronósticos",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
