import { supabase } from "./supabase";

export const FAVORITES_TABLE = "client_gallery_favorites";
export const FAVORITES_READY = "yes";

export function emptyFavoriteSet() {
  return new Set();
}

export { supabase };
