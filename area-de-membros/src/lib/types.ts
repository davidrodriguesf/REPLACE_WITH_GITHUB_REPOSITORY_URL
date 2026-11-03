export type Role = "student" | "admin";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: Role;
  created_at: string;
};

export type MemberProfile = Pick<Profile, "id" | "full_name" | "avatar_url" | "bio" | "role" | "created_at">;

export type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_url: string | null;
  access_type: "paid" | "free";
  checkout_url: string | null;
  appmax_product_ids: string[];
  is_published: boolean;
  position: number;
  created_at: string;
};

export type Module = { id: string; course_id: string; title: string; position: number };

export type Lesson = {
  id: string;
  module_id: string;
  course_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  content: string | null;
  attachment_url: string | null;
  duration_minutes: number | null;
  position: number;
};

export type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  source: "purchase" | "admin";
  order_id: string | null;
  expires_at: string | null;
  created_at: string;
};

export type AccessRequest = {
  id: string;
  user_id: string;
  course_id: string;
  status: "pending" | "approved" | "rejected";
  message: string | null;
  created_at: string;
};

export type Space = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  admin_only_posts: boolean;
  position: number;
};

export type Post = {
  id: string;
  space_id: string;
  author_id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
};

export type Comment = { id: string; post_id: string; author_id: string; body: string; created_at: string };

export type EventItem = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  meeting_url: string | null;
  cover_url: string | null;
  is_published: boolean;
};
