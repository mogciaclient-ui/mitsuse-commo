import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "いいもの三瀬",
  description: "いいもの三瀬の公式ページです。",
  applicationName: "いいもの三瀬",
  icons: {
    icon: "/images/renkon-logo.png",
    shortcut: "/images/renkon-logo.png",
    apple: "/images/renkon-logo.png",
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
