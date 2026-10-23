import { createClient } from "@supabase/supabase-js";

function isValidUrl(urlString: string | undefined): boolean {
  if (!urlString) return false;
  if (urlString.includes("<") || urlString.includes(">")) return false;
  try {
    const parsed = new URL(urlString);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const rawUrl =
  typeof window !== "undefined"
    ? window.location.origin
    : (process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL);

const supabaseUrl = isValidUrl(rawUrl) ? rawUrl! : "https://placeholder.supabase.co";
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabasePublishableKey = rawKey && !rawKey.includes("<") ? rawKey : "placeholder-key";

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
