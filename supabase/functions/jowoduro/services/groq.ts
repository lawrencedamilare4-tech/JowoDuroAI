// supabase/functions/jowoduro/services/groq.ts
import Groq from "npm:groq-sdk";
import { config } from "../config.ts";

const groq = new Groq({ apiKey: config.groqKey });

const FALLBACK_TEXT = "I am here with you. What's on your mind?";

export async function transcribeAudio(audioUrl: string): Promise<string> {
  console.log("[GROQ] Downloading audio from Telegram...");
  const audioRes = await fetch(audioUrl);
  const blob = await audioRes.blob();
  const file = new File([blob], "voice.ogg", { type: "audio/ogg" });

  console.log("[GROQ] Transcribing with Whisper-Large-V3...");
  const transcription = await groq.audio.transcriptions.create({
    file: file,
    model: "whisper-large-v3",
  });
  return transcription.text;
}

export async function generateClinicalReport(userContext: string) {
  const systemPrompt = `You are a clinical psychologist analyzing a patient's decentralized memory log. 
Review the following facts, triggers, and advice.
Output a highly structured clinical summary in 3 sections using Markdown:
1. Core Triggers
2. Coping Strategies & Outcomes
3. Recovery Progress & Recommendations

CRITICAL FORMATTING: Do not use excessive hyphens, em-dashes, or chaotic punctuation. Keep sentences professional, empathetic, and strictly based on the provided log.`;

  console.log("[GROQ] Requesting clinical report...");

  // Cast to any: reasoning params may not be in older groq-sdk type definitions
  const params: any = {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Patient Log:\n${userContext || "No data yet."}` },
    ],
    model: "openai/gpt-oss-120b",
    // Reasoning tokens count toward this limit, so leave room for the answer
    max_completion_tokens: 1500,
    temperature: 0.3,
    reasoning_effort: "low",
    include_reasoning: false,
  };

  const chatCompletion = await groq.chat.completions.create(params);
  const choice = chatCompletion.choices[0];

  if (!choice?.message?.content) {
    console.error("[GROQ] Empty report. finish_reason:", choice?.finish_reason);
  }

  return choice?.message?.content || "Could not generate report.";
}

export async function generateAccountabilityResponse(userText: string, userContext: string) {
  const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  const systemPrompt = `You are JowoDuro, a strict but empathetic accountability sponsor.

TODAY'S DATE: ${today}

YOUR MEMORY (PAST CONTEXT ABOUT THIS USER):
${userContext || "No past memory found."}

CRITICAL RULES:
1. USE THEIR NAME NATURALLY: Address them by name occasionally.
2. ANSWER DIRECT QUESTIONS: Answer explicitly using the memory above. If data is missing, state: "I just checked your decentralized memory log, but I do not have a record of [missing data] saved yet."
3. STREAK TRACKING: If the user asks for their streak, look at their [RELAPSE DATE] in memory and compare it to TODAY'S DATE to calculate exactly how many days they have been sober. Celebrate their milestone.
4. THE SPONSOR FRAMEWORK & RECOMMENDATIONS: If they are venting, validate their state and give ONE highly specific, physical action. If they ask for general advice, books, routines, or videos, provide a helpful, tailored recommendation.
5. CONVERSATIONAL TONE: Maximum 3 sentences. Text message style. No hyphens, no bullet points.

OUTPUT FORMAT REQUIREMENT:
You are a machine API. You must output ONLY a raw JSON object. 
If you provide a new recommendation or the user provides a new fact, your 'textToSend' MUST explicitly state that you are saving this to their decentralized memory.
Start your response exactly with { and end exactly with }.

EXAMPLE OUTPUT (FOR A RECOMMENDATION):
{
  "textToSend": "I highly recommend 'Atomic Habits' by James Clear to help rebuild your routine. It focuses on small, 1% changes. I am saving this recommendation to your memory now.",
  "factToSave": "[RECOMMENDATION] Recommended the book 'Atomic Habits' by James Clear to build better habits."
}

JSON SCHEMA AND STRICT SAVING RULES:
{
  "textToSend": "The conversational reply to the user.",
  "factToSave": "YOU MUST STRICTLY EXTRACT DATA HERE. If the user mentions 1) PERSONAL INFO, 2) RELAPSE TIMELINE (e.g. 'I relapsed today' or a specific date), or if you provide 3) NEW ADVICE/RECOMMENDATIONS (Books, routines, videos), summarize it using the prefixes [PERSONAL INFO], [RELAPSE DATE], or [RECOMMENDATION]. If NONE of these occur, output an empty string \"\"."
}`;
  
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText }
    ],
    model: "openai/gpt-oss-120b", 
    temperature: 0.2, 
    max_tokens: 350,
    reasoning_format: "hidden"
  });

  const rawText = chatCompletion.choices[0]?.message?.content || "{}";
  const cleanJsonText = rawText.substring(rawText.indexOf('{'), rawText.lastIndexOf('}') + 1).trim();

  try {
    const result = JSON.parse(cleanJsonText || "{}");
    const safeText = result.textToSend || "I am here with you. What's on your mind?";
    const safeFact = result.factToSave || ""; 
    
    console.log(`[GROQ EXTRACTED FACT]: "${safeFact}"`);
    
    return {
      textToSend: safeText,
      factToSave: safeFact
    };
    
  } catch (error: any) {
    console.error("[GROQ ERROR DETECTED]", error);

    if (error?.status === 429 || error?.error?.code === "rate_limit_exceeded") {
        return { 
            textToSend: "My system needs a quick breather, but I am right here. Step away from whatever is triggering you for exactly one minute.", 
            factToSave: "" 
        };
    } 
    if (error?.message?.toLowerCase().includes("timeout") || error?.status >= 500) {
        return { 
            textToSend: "My network is running slow right now, but your sobriety is my priority. Keep holding on.", 
            factToSave: "" 
        };
    }

    if (error instanceof SyntaxError) {
        try {
            console.log("[GROQ] Attempting intelligent AI error recovery...");
            const recoveryChat = await groq.chat.completions.create({
                messages: [
                    { 
                        role: "system", 
                        content: `You are JowoDuro, a strict accountability sponsor. You just tried to analyze the user's message, but your internal logic crashed. Write a 1-to-2 sentence message telling the user you got a bit scrambled, and ask them to tell you exactly how they are feeling right now to refocus.`
                    }
                ],
                model: "llama3-8b-8192", 
                temperature: 0.5, 
                max_tokens: 80,
            });

            return {
                textToSend: recoveryChat.choices[0]?.message?.content || "I got a bit scrambled. Let's refocus. How are you feeling?",
                factToSave: ""
            };
        } catch (recoveryError) {
            return {
                textToSend: "I got a bit scrambled trying to process that. Let's refocus. What is on your mind?",
                factToSave: ""
            };
        }
    }

    return {
      textToSend: "I just had a slight connection hiccup on my end. Take a deep breath. What is on your mind?",
      factToSave: ""
    };
  }
}