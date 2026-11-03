import { toggleLike } from "@/app/(membros)/actions";
import { IconHeart } from "./Icons";

export function LikeButton({ postId, liked, count }: { postId: string; liked: boolean; count: number }) {
  return (
    <form action={toggleLike}>
      <input type="hidden" name="post_id" value={postId} />
      <input type="hidden" name="liked" value={liked ? "1" : "0"} />
      <button className={`btn btn-ghost btn-sm ${liked ? "text-rose-600" : ""}`} aria-pressed={liked}>
        <IconHeart className={`w-4 h-4 ${liked ? "fill-rose-500 stroke-rose-500" : ""}`} /> {count}
      </button>
    </form>
  );
}
