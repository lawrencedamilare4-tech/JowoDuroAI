// supabase/functions/jowoduro/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { config, validateConfig } from "./config.ts";
import { initializeWalrus, fetchUserContext, saveMemoryBackground } from "./services/walrus.ts";
import { generateAccountabilityResponse, transcribeAudio, generateClinicalReport } from "./services/groq.ts";
import { sendTypingAction, sendMessage, getVoiceFileUrl } from "./services/telegram.ts";

serve(async (req) => {
  if (req.method !== "POST") return new Response("OK");

  try {
    validateConfig();

    const body = await req.json();
    const chatId = body.message?.chat?.id?.toString();
    let userText = body.message?.text;
    const voiceId = body.message?.voice?.file_id || body.message?.audio?.file_id;

    if (!chatId) return new Response("OK");

    // 0. Fire typing indicator instantly (Fire and forget so it never hangs the function)
    await sendTypingAction(chatId); 

    // Handle non-text / non-voice messages gracefully (like stickers or photos)
    if (!userText && !voiceId) {
        await sendMessage(chatId, "I can only understand text and voice notes right now. Please tell me what's on your mind.");
        return new Response("OK", { status: 200 });
    }

    // 1. SAFE Voice Note Handling
    if (voiceId && !userText) {
        try {
            console.log(`[VOICE] Received audio file: ${voiceId}`);
            const audioUrl = await getVoiceFileUrl(voiceId);
            userText = await transcribeAudio(audioUrl); 
        } catch (error) {
            console.error("[VOICE ERROR]", error);
            await sendMessage(chatId, "I'm having trouble processing audio right now. Please type your message.");
            return new Response("OK", { status: 200 });
        }
    }

    if (!userText) return new Response("OK");
    console.log(`[PROCESSING] Message from ${chatId}: "${userText}"`);

    // 2. THE EMERGENCY INTERCEPTOR
    // If they press the button, we secretly rewrite their prompt to force Groq into crisis mode.
    if (userText === "🚨 I'm about to relapse") {
        userText = "URGENT CRISIS: I am about to relapse right this exact second. Drop all pleasantries. Give me strict, immediate, and actionable steps to physically stop me from relapsing right now. Use my past context.";
    }

    // 3. Clinical Report Handling
    if (userText === "/report" || userText === "📊 Generate Clinical Report") {
        try {
            const memwal = initializeWalrus(chatId);
            const userContext = await fetchUserContext(memwal, "everything");
            const report = await generateClinicalReport(userContext);
            await sendMessage(chatId, `📊 **JowoDuro Clinical Report**\n\n${report}`);
        } catch (error) {
            console.error("[REPORT ERROR]", error);
            await sendMessage(chatId, "I couldn't pull your full report right now, but I am still here to talk.");
        }
        return new Response("OK", { status: 200 });
    }

    // 4. SAFE Memory Fetching
    const memwal = initializeWalrus(chatId);
    let userContext = "";
    try {
        userContext = await fetchUserContext(memwal, userText); 
    } catch (error) {
        console.error("[WALRUS ERROR] Failed to fetch memory. Proceeding without context.");
        // We continue anyway so the user doesn't get ignored!
        console.error("[WALRUS ERROR] Failed to fetch memory. EXACT ERROR:", error.message || error);
    }

    // 5. SAFE AI Generation
    let aiResponse = "";
    try {
        aiResponse = await generateAccountabilityResponse(userText, userContext);
    } catch (error) {
        console.error("[GROQ ERROR]", error);
        // If Groq goes down or rate-limits us, give them a hardcoded lifeline so they are never abandoned.
        aiResponse = "I am experiencing a brief technical glitch, but PLEASE stay strong. Do not act on your urge. Step away from whatever is triggering you right now. I am in your corner.";
    }
    
    // 6. Parse output for memories
    let textToSend = aiResponse;
    let factToSave = "";
    if (aiResponse.includes("NEW_MEMORY:")) {
      const split = aiResponse.split("NEW_MEMORY:");
      textToSend = split[0].trim(); 
      factToSave = split[1].trim(); 
    }

    // 7. Respond to user
    await sendMessage(chatId, textToSend);

    // 8. SAFE Background saving
    if (factToSave) {
      try {
          await saveMemoryBackground(memwal, factToSave);
      } catch (error) {
          console.error("[WALRUS SAVE ERROR]", error);
      }
    }

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("[FATAL SYSTEM ERROR]:", error);
    return new Response("Error", { status: 500 });
  }
});