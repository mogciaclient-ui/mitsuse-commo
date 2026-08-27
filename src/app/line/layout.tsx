import { AdminShell } from "@/components/admin-shell";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "いいもの三瀬 | LINE運用管理" };
export default function LineLayout({children}:{children:React.ReactNode}) { return <AdminShell>{children}</AdminShell>; }
