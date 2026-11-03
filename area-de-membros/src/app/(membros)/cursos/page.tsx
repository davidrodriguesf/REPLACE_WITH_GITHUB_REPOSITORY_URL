import { requireUser } from "@/lib/auth";
import { getCatalog, type CatalogCourse } from "@/lib/catalog";
import { CourseCard } from "@/components/CourseCard";

export const metadata = { title: "Cursos" };

function Grid({ title, items }: { title: string; items: CatalogCourse[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="h-row mb-3">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-5">
        {items.map((c) => <CourseCard key={c.id} course={c} />)}
      </div>
    </section>
  );
}

export default async function CoursesPage() {
  const { supabase, user, profile } = await requireUser();
  const catalog = await getCatalog(supabase, user.id, profile.role === "admin");
  return (
    <div className="space-y-10">
      <h1 className="h-page">Cursos</h1>
      <Grid title="Meus cursos" items={catalog.filter((c) => c.status === "enrolled")} />
      <Grid title="Gratuitos" items={catalog.filter((c) => c.status === "free_locked" || c.status === "pending")} />
      <Grid title="Desbloqueie mais" items={catalog.filter((c) => c.status === "paid_locked")} />
      {!catalog.length && <p className="card p-6 text-muted">Nenhum curso publicado ainda.</p>}
    </div>
  );
}
