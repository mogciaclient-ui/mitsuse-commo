import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "いい麺亭 お客様アンケート",
  description: "いい麺亭から、うれしいお知らせをお届けするための簡単なアンケートです。",
  openGraph: {
    title: "いい麺亭 お客様アンケート",
    description: "簡単なアンケートにご協力ください。",
    type: "website",
    locale: "ja_JP",
  },
  robots: { index: false, follow: false },
};

export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
