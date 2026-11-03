import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getLearning } from "@/lib/learning";
import { CourseCard, EmptyState, Row, rowItem } from "@/components/Cards";
import { IconSearch } from "@/components/Icons";

export const metadata = { title: "Catálogo" };

export default async function Catalogo({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string }> }) {
  const { q = "", cat = "" } = await searchParams;
  const { supabase, user } = await requireUser();
  const { courses, categories } = await getLearning(supabase, user.id);
  const term = q.trim().toLowerCase();
  const filtering = !!term || !!cat;
  const results = courses.filter(
    (c) =>
      (!cat || c.category_id === cat) &&
      (!term || [c.title, c.subtitle, c.description, c.categoryName, ...c.instructors.map((i) => i.name)].join(" ").toLowerCase().includes(term)),
  );

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <h1 className="h-page">Catálogo</h1>
        <form className="relative">
          <IconSearch className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
          {cat && <input type="hidden" name="cat" value={cat} />}
          <input name="q" defaultValue={q} placeholder="Buscar cursos, temas ou instrutores" className="input rounded-full pl-14 py-4 text-[17px]" />
        </form>
        <div className="no-scrollbar -mx-4 sm:mx-0 flex gap-2 overflow-x-auto px-4 sm:px-0">
          <Link href={q ? `/catalogo?q=${encodeURIComponent(q)}` : "/catalogo"} className={`chip ${!cat ? "chip-active" : ""}`}>Todos</Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/catalogo?cat=${c.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={`chip ${cat === c.id ? "chip-active" : ""}`}>{c.name}</Link>
          ))}
        </div>
      </div>

      {filtering ? (
        results.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-8">
            {results.map((c) => <CourseCard key={c.id} course={c} />)}
          </div>
        ) : (
          <EmptyState icon={<IconSearch className="w-12 h-12" />} title="Nenhum curso encontrado" text="Tente outro termo ou outra categoria." />
        )
      ) : (
        <div className="space-y-10">
          {categories.map((cat) => {
            const items = courses.filter((c) => c.category_id === cat.id);
            if (!items.length) return null;
            return (
              <Row key={cat.id} title={cat.name}>
                {items.map((c) => <CourseCard key={c.id} course={c} className={rowItem} />)}
              </Row>
            );
          })}
          {courses.some((c) => !c.category_id) && (
            <Row title="Outros cursos">
              {courses.filter((c) => !c.category_id).map((c) => <CourseCard key={c.id} course={c} className={rowItem} />)}
            </Row>
          )}
          {!courses.length && <EmptyState title="Nenhum curso disponível" text="Os cursos publicados para a sua função aparecem aqui." />}
        </div>
      )}
    </div>
  );
}
