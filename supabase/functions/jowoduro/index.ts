// supabase/functions/jowoduro/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { config, validateConfig } from "./config.ts";
import { initializeWalrus, fetchUserContext, saveMemoryBackground } from "./services/walrus.ts";
import { sendTypingAction, sendMessage, getVoiceFileUrl } from "./services/telegram.ts";
import { generateAccountabilityResponse, transcribeAudio, generateClinicalReport } from "./services/groq.ts";

// Resolve with a fallback if the promise takes too long
const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([
    p,
    new Promise<T>((resolve) =>
      setTimeout(() => {
        console.warn(`[TIMEOUT] Operation exceeded ${ms}ms, using fallback.`);
        resolve(fallback);
      }, ms)
    ),
  ]);

// Never save memories that describe the bot's own actions
const BOT_ACTION_RE = /^(asked user|we asked|we reminded|reminded user|bot )/i;

serve(async (req) => {
  if (req.method !== "POST") return new Response("OK");

  try {
    validateConfig();

    const body = await req.json();
    const chatId = body.message?.chat?.id?.toString();
    let userText = body.message?.text;
    const voiceId = body.message?.voice?.file_id || body.message?.audio?.file_id;

    if (!chatId) return new Response("OK");

    // Handle non-text / non-voice messages gracefully (like stickers or photos)
    if (!userText && !voiceId) {
      await sendMessage(chatId, "I can only understand text and voice notes right now. Please tell me what's on your mind.");
      return new Response("OK", { status: 200 });
    }

    // 1. SAFE Voice Note Handling
    if (voiceId && !userText) {
      try {
        await sendTypingAction(chatId).catch(console.error);
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
    if (userText === "🚨 I'm about to relapse") {
      userText = "URGENT CRISIS: I am about to relapse right this exact second. Drop all pleasantries. Give me strict, immediate, and actionable steps to physically stop me from relapsing right now. Use my past context.";
    }

    // 3. Clinical Report Handling
    if (userText === "/report" || userText === "📊 Generate Clinical Report") {
      try {
        await sendTypingAction(chatId).catch(console.error);
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

    // 4. PARALLEL Network Requests (Typing Indicator + Walrus Memory Fetch)
    console.log("[SYSTEM] Starting parallel network requests...");
    const memwal = initializeWalrus(chatId);

    const [_, userContext] = await Promise.all([
      sendTypingAction(chatId).catch(console.error),
      // 2.5s cap so a slow Walrus recall can never stall the reply
      withTimeout(
        fetchUserContext(memwal, userText).catch((error) => {
          console.error("[WALRUS ERROR] Proceeding without context:", error?.message || error);
          return "";
        }),
        8000,
        ""
      ),
    ]);

    // 5. SAFE AI Generation & 6. Parse Output
    let textToSend = "";
    let factToSave = "";

    try {
      const aiResponse = await generateAccountabilityResponse(userText, userContext);
      textToSend = aiResponse.textToSend;
      factToSave = aiResponse.factToSave;
    } catch (error) {
      console.error("[GROQ ERROR]", error);
      textToSend = "I am experiencing a brief technical glitch, but PLEASE stay strong. Do not act on your urge. Step away from whatever is triggering you right now. I am in your corner.";
    }

    // THE FINAL SAFETY NET: Never send a completely empty string to Telegram
    if (!textToSend || textToSend.trim() === "") {
      textToSend = "I am here with you. What is on your mind right now?";
    }

    // 7. Respond to user
    await sendMessage(chatId, textToSend);

    // 8. SAFE Background saving (skip empty facts and bot-action notes)
    const fact = factToSave?.trim() ?? "";
    if (fact && !BOT_ACTION_RE.test(fact)) {
      try {
        await saveMemoryBackground(memwal, fact);
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