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

export async function fetchUserContext(memwal: any, userText: string, retryLimit = 10): Promise<string> {
  console.log(`[WALRUS] Recalling memory (Limit: ${retryLimit})...`);
  
  const expandedQuery = `${userText} user profile name past triggers coping strategies history`;
  
  try {
    // Try to fetch and decrypt the memories
    const recallResult = await memwal.recall(expandedQuery, retryLimit);
    return recallResult.results.map((r: any) => r.text).join(" | ");
    
  } catch (error) {
    // If the relayer times out during seal_decrypt, retry once with a much smaller load
    if (error.message?.includes("504") && retryLimit > 3) {
        console.warn("[WALRUS] Decryption timed out. Retrying with a smaller limit of 3...");
        return await fetchUserContext(memwal, userText, 3);
    }
    
    // If it fails again, throw the error to be caught by index.ts
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