import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LNSAT Control Center",
  description: "Read-only management console for LNSAT product contracts.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
