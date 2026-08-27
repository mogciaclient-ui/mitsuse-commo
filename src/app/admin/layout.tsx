import { AdminShell } from "@/components/admin-shell";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "いいもの三瀬 | 管理画面" };
export default function AdminLayout({children}:{children:React.ReactNode}) { return <AdminShell>{children}</AdminShell>; }
