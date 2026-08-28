import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "いいもの三瀬 お客様アンケート",
  description: "いいもの三瀬から、うれしいお知らせをお届けするための簡単なアンケートです。",
  applicationName: "いいもの三瀬 お客様アンケート",
  openGraph: {
    title: "いいもの三瀬 お客様アンケート",
    description: "いいもの三瀬から、うれしいお知らせをお届けするための簡単なアンケートです。",
    siteName: "いいもの三瀬",
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary",
    title: "いいもの三瀬 お客様アンケート",
    description: "いいもの三瀬から、うれしいお知らせをお届けするための簡単なアンケートです。",
  },
  robots: { index: false, follow: false },
};

export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
