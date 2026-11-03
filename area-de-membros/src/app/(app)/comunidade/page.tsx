import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getMembersMap } from "@/lib/members";
import { Avatar } from "@/components/Avatar";
import { LikeButton } from "@/components/LikeButton";
import { IconChat, IconPin } from "@/components/Icons";
import { timeAgo } from "@/lib/utils";
import type { Post, Space } from "@/lib/types";
import { NewPostForm } from "./NewPostForm";

export const metadata = { title: "Comunidade" };

type PostRow = Post & { comments: { count: number }[]; post_likes: { count: number }[] };

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ espaco?: string }> }) {
  const { espaco } = await searchParams;
  const { supabase, user, profile } = await requireUser();
  const { data: spacesData } = await supabase.from("spaces").select("*").order("position");
  const spaces = (spacesData ?? []) as Space[];
  const current = spaces.find((s) => s.slug === espaco);

  let q = supabase.from("posts").select("*, comments(count), post_likes(count)").order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(50);
  if (current) q = q.eq("space_id", current.id);
  const { data } = await q;
  const posts = (data ?? []) as PostRow[];

  const [members, { data: myLikes }] = await Promise.all([
    getMembersMap(supabase, posts.map((p) => p.author_id)),
    posts.length ? supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", posts.map((p) => p.id)) : Promise.resolve({ data: [] }),
  ]);
  const liked = new Set((myLikes ?? []).map((l: { post_id: string }) => l.post_id));
  const spaceName = new Map(spaces.map((s) => [s.id, s.name]));
  const canPostSpaces = spaces.filter((s) => !s.admin_only_posts || profile.role === "admin");

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
      <aside>
        <h1 className="h-page mb-4 lg:hidden">Comunidade</h1>
        <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
          <Link href="/comunidade" className={`rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap ${!current ? "bg-navy-950 text-white" : "hover:bg-slate-100"}`}>Tudo</Link>
          {spaces.map((s) => (
            <Link key={s.id} href={`/comunidade?espaco=${s.slug}`} className={`rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap ${current?.id === s.id ? "bg-navy-950 text-white" : "hover:bg-slate-100"}`}>
              # {s.name}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="space-y-4 min-w-0">
        <div className="hidden lg:block">
          <h1 className="h-page">{current ? current.name : "Comunidade"}</h1>
          {current?.description && <p className="text-muted">{current.description}</p>}
        </div>
        <NewPostForm spaces={canPostSpaces} defaultSpaceId={current && canPostSpaces.some((s) => s.id === current.id) ? current.id : undefined} />

        {posts.map((p) => {
          const author = members.get(p.author_id);
          return (
            <article key={p.id} className={`card p-4 sm:p-5 ${p.pinned ? "border-navy-100 bg-navy-50/60" : ""}`}>
              <header className="flex items-center gap-3">
                <Avatar name={author?.full_name} url={author?.avatar_url} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">
                    {author?.full_name ?? "Membro"}
                    {author?.role === "admin" && <span className="badge bg-navy-50 text-navy-800 ml-2">Equipe</span>}
                  </p>
                  <p className="text-xs text-muted">{spaceName.get(p.space_id)} · {timeAgo(p.created_at)}</p>
                </div>
                {p.pinned && <span className="badge bg-navy-950 text-white"><IconPin className="w-3 h-3" />Fixado</span>}
              </header>
              <Link href={`/comunidade/${p.id}`} className="block mt-3">
                <h2 className="font-semibold text-slate-900 hover:text-navy-700">{p.title}</h2>
                <p className="text-sm text-slate-600 mt-1 line-clamp-3 whitespace-pre-wrap">{p.body}</p>
              </Link>
              <footer className="flex items-center gap-1 mt-3 -ml-2">
                <LikeButton postId={p.id} liked={liked.has(p.id)} count={p.post_likes[0]?.count ?? 0} />
                <Link href={`/comunidade/${p.id}`} className="btn btn-ghost btn-sm"><IconChat className="w-4 h-4" /> {p.comments[0]?.count ?? 0}</Link>
              </footer>
            </article>
          );
        })}
        {!posts.length && <p className="card p-8 text-center text-muted">Nenhuma publicação ainda. Que tal começar a conversa?</p>}
      </div>
    </div>
  );
}
