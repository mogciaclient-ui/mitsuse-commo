import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "いいもの三瀬 お客様アンケート",
  description: "いいもの三瀬から、うれしいお知らせをお届けするための簡単なアンケートです。",
  openGraph: {
    title: "いいもの三瀬 お客様アンケート",
    description: "簡単なアンケートにご協力ください。",
    type: "website",
    locale: "ja_JP",
  },
  robots: { index: false, follow: false },
};

export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
