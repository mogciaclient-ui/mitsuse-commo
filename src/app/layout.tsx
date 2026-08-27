import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "いいもの三瀬 | 管理画面ログイン",
  description: "いいもの三瀬 LINE運用管理画面",
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
