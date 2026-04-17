export type ItemType = "link" | "note";
export type WorkStatus = "later" | "today" | "doing" | "done";

export type Item = {
  id: string;
  user_id: string;
  type: ItemType;
  title: string;
  content: string;
  tags: string[];
  work_status?: WorkStatus | null;
  group_id?: string | null;
  last_viewed_at?: string | null;
  created_at: string;
  updated_at: string;
  ai_summary?: string | null;
  ai_tags?: string[] | null;
  ai_category?: string | null;
  ai_status?: "pending" | "processing" | "done" | "failed" | string;
  ai_error?: string | null;
};
