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

// Only bias the recall toward recovery topics when the message is about recovery.
const RECOVERY_RE =
  /relapse|urge|craving|bet|gambl|stress|sober|streak|clean|trigger|anxious|tempt|addict|quit|slip|progress|history|report/i;

// Memories that describe the bot's own actions, not facts about the user.
const JUNK_RE = /^(asked user|we asked|we reminded|reminded user|bot )/i;

function extractTexts(result: any): string[] {
  return (result?.results ?? [])
    .map((r: any) => String(r.text ?? "").trim())
    .filter((t: string) => t && !JUNK_RE.test(t));
}

export const fetchUserContext = async (memwal: any, userText: string): Promise<string> => {
    console.log(`[WALRUS] Strict Intent-Routed Hybrid Recall...`);

    try {
        const lowerText = userText.toLowerCase();
        
        const isIdentityQuery = lowerText.includes("name") || lowerText.includes("who am i");
        const isRelapseQuery = lowerText.includes("relapse") || lowerText.includes("when last");
        
        // Expanded to catch lifestyle and media recommendations
        const isAdviceQuery = lowerText.includes("advice") || 
                              lowerText.includes("suggest") || 
                              lowerText.includes("recommend") || 
                              lowerText.includes("book") || 
                              lowerText.includes("routine") || 
                              lowerText.includes("video");

        let searchQuery = userText;
        let limit = 3; 

        if (isIdentityQuery) {
            searchQuery = "[PERSONAL INFO] the user's real name identity is"; 
        } else if (isRelapseQuery) {
            searchQuery = "[RELAPSE DATE] last stated relapse date timeline";  
        } else if (isAdviceQuery) {
            // Searches for the new recommendation tag
            searchQuery = "[RECOMMENDATION] previous advice coping strategies told suggested recommended book routine video"; 
        } else {
            searchQuery = `${userText} [RECOMMENDATION] triggers coping strategies`;
        }

        console.log(`[WALRUS] Executing hybrid query: "${searchQuery}"`);
        
        let timerId: number; 
        const timeoutPromise = new Promise((_, reject) => {
            timerId = setTimeout(() => reject(new Error("TIMEOUT_8000")), 8000);
        });

        const result: any = await Promise.race([
            memwal.recall(searchQuery, limit),
            timeoutPromise
        ]);

        clearTimeout(timerId!); 
        
        const context = result.results.map((r: any) => ` ${r.text}`).join(" | ");
        return context;
        
    } catch (error: any) {
        if (error.message === "TIMEOUT_8000") {
            console.warn("[TIMEOUT] Operation exceeded 8000ms, aborting memory fetch.");
        } else {
            console.error("[WALRUS NETWORK ERROR]", error);
        }
        return ""; 
    }
};

export async function saveMemoryBackground(memwal: any, factToSave: string) {
  console.log(`[WALRUS] Queuing memory save...`);

  // memwal.remember() submits the data to the relayer and returns immediately,
  // bypassing the 60-second polling timeout of rememberAndWait()
  const response = await memwal.remember(factToSave);

  console.log(`[WALRUS] Successfully handed off to relayer. Job ID: ${response.jobId}`);
  return response;
}