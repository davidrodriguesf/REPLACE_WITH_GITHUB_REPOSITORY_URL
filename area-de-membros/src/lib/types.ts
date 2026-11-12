export type Role = "employee" | "manager" | "admin";

export type JobRole = { id: string; name: string; description: string | null };

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  department: string | null;
  job_role_id: string | null;
  manager_id: string | null;
  hired_at: string | null;
  role: Role;
  is_active: boolean;
  company_id: string | null;
  is_super_admin: boolean;
  created_at: string;
};

export type MemberProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: Role;
  department: string | null;
  job_role: string | null;
  created_at: string;
};

export type Category = { id: string; name: string; position: number };
export type Instructor = { id: string; name: string; title: string | null; avatar_url: string | null; bio: string | null };

export type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_url: string | null;
  category_id: string | null;
  audience: "all" | "roles";
  workload_hours: number | null;
  certificate_enabled: boolean;
  is_featured: boolean;
  is_published: boolean;
  position: number;
  company_id: string | null;
  is_marketplace: boolean;
  price: number | null;
  material_url: string | null;
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

export type Trail = { id: string; title: string; description: string | null; cover_url: string | null; position: number };

export type Quiz = {
  id: string;
  course_id: string;
  lesson_id: string | null;
  kind: "quiz" | "exam";
  title: string;
  description: string | null;
  passing_score: number;
  max_attempts: number | null;
  time_limit_minutes: number | null;
  show_answers: boolean;
  is_published: boolean;
};

export type QuizAttempt = { id: string; quiz_id: string; user_id: string; score: number; correct: number; total: number; passed: boolean; submitted_at: string };

export type Certificate = { id: string; user_id: string; course_id: string; code: string; hours: number | null; issued_at: string };

export type Plan = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: "active" | "completed" | "cancelled";
  created_by: string | null;
  created_at: string;
};

export type Goal = {
  id: string;
  plan_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  course_id: string | null;
  status: "todo" | "doing" | "done";
  completed_at: string | null;
  position: number;
};

export type LibraryItem = { id: string; title: string; author: string | null; description: string | null; cover_url: string | null; file_url: string | null; category: string | null; position: number };

export type Space = { id: string; slug: string; name: string; description: string | null; admin_only_posts: boolean; position: number };
export type Post = { id: string; space_id: string; author_id: string; title: string; body: string; pinned: boolean; created_at: string };
export type Comment = { id: string; post_id: string; author_id: string; body: string; created_at: string };

export type EventItem = {
  id: string;
  title: string;
  description: string | null;
  host: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  meeting_url: string | null;
  cover_url: string | null;
  is_published: boolean;
};
