import "./globals.css"; import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ProofLayer | Evidence to onchain truth",
  description: "AI-powered evidence verification with X Layer attestations.",
  icons: { icon: "/icon.png", shortcut: "/icon.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
