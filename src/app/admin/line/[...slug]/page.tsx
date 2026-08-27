import { LineAdminPage } from "@/components/line-admin-pages";
import { redirect } from "next/navigation";

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const query = await searchParams;
  const section = slug.join("/") || "users";
  const legacy: Record<string, string> = {
    segments: "/line/users?view=segments",
    surveys: "/line/users?view=responses",
    "surveys/current": "/line/users?view=responses",
    "broadcasts/composer": "/line/broadcasts?view=compose",
    analytics: "/line/broadcasts?view=analysis",
    "ai-suggestions": "/line/broadcasts?view=ai",
  };
  if (legacy[section]) {
    const target = typeof query.target === "string" ? `&target=${encodeURIComponent(query.target)}` : "";
    redirect(`${legacy[section]}${section === "broadcasts/composer" ? target : ""}`);
  }
  return <LineAdminPage section={section} />;
}
