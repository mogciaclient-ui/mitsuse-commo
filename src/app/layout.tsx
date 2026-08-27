import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "commo. 管理画面", description: "LINE運用管理ダッシュボード" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
