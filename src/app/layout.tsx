import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "いい麺亭 | 管理画面ログイン",
  description: "いい麺亭 LINE運用管理画面",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
