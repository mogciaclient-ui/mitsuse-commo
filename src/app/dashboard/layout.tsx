import { AdminShell } from "@/components/admin-shell";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "いい麺亭 | 管理画面" };
export default function DashboardLayout({children}:{children:React.ReactNode}) { return <AdminShell>{children}</AdminShell>; }
