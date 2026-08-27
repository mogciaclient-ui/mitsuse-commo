import { LineAdminPage } from "@/components/line-admin-pages";

export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  return <LineAdminPage section={slug.join("/") || "users"} />;
}
