import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMembersMap } from "@/lib/members";
import { deleteComment, deletePost, togglePin } from "../../actions";
import { Avatar } from "@/components/Avatar";
import { LikeButton } from "@/components/LikeButton";
import { ConfirmButton } from "@/components/ui";
import { IconPin } from "@/components/Icons";
import { formatDateTime, timeAgo } from "@/lib/utils";
import type { Comment, Post } from "@/lib/types";
import { CommentForm } from "./CommentForm";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await requireUser();
  const { data: post } = await supabase.from("posts").select("*, spaces(name, slug)").eq("id", id).maybeSingle<Post & { spaces: { name: string; slug: string } | null }>();
  if (!post) notFound();

  const [{ data: comments }, { count: likes }, { data: myLike }] = await Promise.all([
    supabase.from("comments").select("*").eq("post_id", id).order("created_at"),
    supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", id),
    supabase.from("post_likes").select("post_id").eq("post_id", id).eq("user_id", user.id).maybeSingle(),
  ]);
  const list = (comments ?? []) as Comment[];
  const members = await getMembersMap(supabase, [post.author_id, ...list.map((c) => c.author_id)]);
  const author = members.get(post.author_id);
  const isAdmin = profile.role === "admin";
  const canDelete = isAdmin || post.author_id === user.id;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Link href={post.spaces ? `/comunidade?espaco=${post.spaces.slug}` : "/comunidade"} className="link text-sm">← {post.spaces?.name ?? "Comunidade"}</Link>
      <article className="card p-5 sm:p-6">
        <header className="flex items-center gap-3">
          <Avatar name={author?.full_name} url={author?.avatar_url} size={44} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold">
              {author?.full_name ?? "Membro"}
              {author?.role === "admin" && <span className="badge bg-brand-50 text-navy-800 ml-2">Equipe</span>}
            </p>
            <p className="text-xs text-muted">{formatDateTime(post.created_at)}</p>
          </div>
          {post.pinned && <span className="badge bg-brand-600 text-white"><IconPin className="w-3 h-3" />Fixado</span>}
        </header>
        <h1 className="text-xl sm:text-2xl font-bold mt-4">{post.title}</h1>
        <div className="prose-lite mt-3">{post.body}</div>
        <footer className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-slate-100">
          <LikeButton postId={post.id} liked={!!myLike} count={likes ?? 0} />
          <span className="flex-1" />
          {isAdmin && (
            <form action={togglePin}>
              <input type="hidden" name="post_id" value={post.id} />
              <input type="hidden" name="pinned" value={post.pinned ? "1" : "0"} />
              <button className="btn btn-ghost btn-sm"><IconPin className="w-4 h-4" />{post.pinned ? "Desafixar" : "Fixar"}</button>
            </form>
          )}
          {canDelete && (
            <form action={deletePost}>
              <input type="hidden" name="post_id" value={post.id} />
              <ConfirmButton message="Excluir esta publicação?" className="btn-sm">Excluir</ConfirmButton>
            </form>
          )}
        </footer>
      </article>

      <section className="card p-5 sm:p-6 space-y-5">
        <h2 className="h-section">{list.length} comentário{list.length === 1 ? "" : "s"}</h2>
        {list.map((c) => {
          const a = members.get(c.author_id);
          return (
            <div key={c.id} className="flex gap-3">
              <Avatar name={a?.full_name} url={a?.avatar_url} size={34} />
              <div className="flex-1 min-w-0">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold">
                    {a?.full_name ?? "Membro"}
                    {a?.role === "admin" && <span className="badge bg-brand-50 text-navy-800 ml-2">Equipe</span>}
                  </p>
                  <p className="text-sm prose-lite mt-1">{c.body}</p>
                </div>
                <div className="flex items-center gap-2 mt-1 px-2 text-xs text-muted">
                  {timeAgo(c.created_at)}
                  {(isAdmin || c.author_id === user.id) && (
                    <form action={deleteComment}>
                      <input type="hidden" name="comment_id" value={c.id} />
                      <input type="hidden" name="post_id" value={post.id} />
                      <button className="hover:text-red-600 cursor-pointer">Excluir</button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <CommentForm postId={post.id} />
      </section>
    </div>
  );
}
