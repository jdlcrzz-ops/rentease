import type { Metadata, Viewport } from "next";
import { Roboto_Flex } from "next/font/google";
import "./globals.css";

// Roboto Flex is the variable typeface used by Material 3 Expressive.
const robotoFlex = Roboto_Flex({
  subsets: ["latin"],
  variable: "--font-roboto-flex",
  display: "swap",
  axes: ["wdth", "opsz"],
});

export const metadata: Metadata = {
  title: "RentEase",
  description: "Manage your rooms, tenants and payments in one place.",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4FAFA" },
    { media: "(prefers-color-scheme: dark)", color: "#0E1514" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={robotoFlex.variable}>
      <body>{children}</body>
    </html>
  );
}
