import type { Metadata } from "next";
import { connection } from "next/server";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AlphaTravel",
    template: "%s · AlphaTravel",
  },
  description: "Il sistema operativo per pellegrinaggi e viaggi di gruppo.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
