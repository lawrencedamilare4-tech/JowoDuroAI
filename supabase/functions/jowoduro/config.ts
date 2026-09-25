// supabase/functions/jowoduro/config.ts

export const config = {
  groqKey: Deno.env.get("GROQ_API_KEY") || "",
  tgToken: Deno.env.get("TELEGRAM_BOT_TOKEN") || "",
  walrusKey: Deno.env.get("MEMWAL_PRIVATE_KEY") || "",
  walrusAccountId: Deno.env.get("MEMWAL_ACCOUNT_ID") || "",
  walrusRelayerUrl: "https://relayer.memory.walrus.xyz",
};

export function validateConfig() {
  if (!config.groqKey || !config.tgToken || !config.walrusKey || !config.walrusAccountId) {
    throw new Error("Missing required environment variables in Supabase Secrets.");
  }
}