import { requireUser } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { CourseCard } from "@/components/CourseCard";

export const metadata = { title: "Cursos" };

export default async function CoursesPage() {
  const { supabase, user, profile } = await requireUser();
  const catalog = await getCatalog(supabase, user.id, profile.role === "admin");
  return (
    <div>
      <h1 className="h-page mb-6">Todos os cursos</h1>
      {catalog.length ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{catalog.map((c) => <CourseCard key={c.id} course={c} />)}</div>
      ) : (
        <p className="card p-6 text-muted">Nenhum curso publicado ainda.</p>
      )}
    </div>
  );
}
