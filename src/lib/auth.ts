import { supabase } from "./supabase";

export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}

export async function signOut() {
  await supabase.auth.signOut();
}
