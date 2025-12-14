export type ItemType = "link" | "note";

export type Item = {
  id: string;
  user_id: string;
  type: ItemType;
  title: string;
  content: string;
  tags: string[]; // stored as text[] in Postgres
  created_at: string;
  updated_at: string;
};
