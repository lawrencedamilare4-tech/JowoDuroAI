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
  console.log(`[WALRUS] Recalling memory (Limit: ${retryLimit})...`);
  
  // ADDED: "sobriety streak days clean relapse milestones" to force progress tracking
  const expandedQuery = `${userText} user profile name past triggers coping strategies history sobriety streak days clean relapse milestones`;
  
  try {
    const recallResult = await memwal.recall(expandedQuery, retryLimit);
    return recallResult.results.map((r: any) => r.text).join(" | ");
    
  } catch (error) {
    if (error.message?.includes("504") && retryLimit > 1) {
        console.warn("[WALRUS] Decryption timed out. Retrying with absolute minimum limit of 1...");
        return await fetchUserContext(memwal, userText, 1);
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