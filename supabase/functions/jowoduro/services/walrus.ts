// supabase/functions/jowoduro/services/walrus.ts
import { MemWal } from "npm:@mysten-incubation/memwal";
import { config } from "../config.ts";

export function initializeWalrus(chatId: string) {
  return MemWal.create({
    key: config.walrusKey,
    accountId: config.walrusAccountId,
    serverUrl: config.walrusRelayerUrl,
    namespace: `jowoduro_user_${chatId}`,
  });
}

// Start with a much smaller initial limit of 3 instead of 10
export async function fetchUserContext(memwal: any, userText: string, retryLimit = 3): Promise<string> {
  console.log(`[WALRUS] Recalling memory (Total Limit: ${retryLimit})...`);
  
  try {
    const identityLimit = 1;
    const triggerLimit = Math.max(1, retryLimit - 1);

    // Natural-language queries yield substantially higher cosine similarity
    const [identityResult, triggerResult] = await Promise.all([
            memwal.recall("The user's real name is, user provided name, identity", 1),
            memwal.recall(`${userText} past triggers coping strategies history sobriety streak days clean relapse milestones`, triggerLimit)
        ]);

    const identityText = identityResult.results.map((r: any) => r.text).join(" | ");
    const triggerText = triggerResult.results.map((r: any) => r.text).join(" | ");
    const combinedContext = [identityText, triggerText].filter(Boolean).join(" | ");
    
    console.log(`[WALRUS DEBUG CONTEXT]: "${combinedContext}"`);
    return combinedContext;
    
  } catch (error) {
    if (error.message?.includes("504") && retryLimit > 1) {
      console.warn("[WALRUS] Decryption timed out. Retrying with emergency fallback limit of 1...");
      const emergencyResult = await memwal.recall(`User name and addiction triggers: ${userText}`, 1);
      return emergencyResult.results.map((r: any) => r.text).join(" | ");
    }
    throw error;
  }
}

export async function saveMemoryBackground(memwal: any, factToSave: string) {
    console.log(`[WALRUS] Queuing memory save...`);
    
    // memwal.remember() submits the data to the relayer and returns immediately, 
    // bypassing the 60-second polling timeout of rememberAndWait()
    const response = await memwal.remember(factToSave);
    
    console.log(`[WALRUS] Successfully handed off to relayer. Job ID: ${response.jobId}`);
    return response;
}