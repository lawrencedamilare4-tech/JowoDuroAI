// supabase/functions/jowoduro/services/groq.ts
import Groq from "npm:groq-sdk";
import { config } from "../config.ts";

const groq = new Groq({ apiKey: config.groqKey });

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
  const chatCompletion = await groq.chat.completions.create({
      messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Patient Log:\n${userContext || "No data yet."}` }
      ],
      model: "openai/gpt-oss-20b", 
      max_tokens: 450,
      temperature: 0.3, // Extremely low temperature for clinical, structured accuracy
  });

  return chatCompletion.choices[0].message.content || "Could not generate report.";
}

export async function generateAccountabilityResponse(userText: string, userContext: string) {
  const systemPrompt = `You are JowoDuro, a strict but empathetic accountability sponsor.

YOUR MEMORY (PAST CONTEXT ABOUT THIS USER):
${userContext || "No past memory found."}

CRITICAL RULES:
1. USE THEIR NAME NATURALLY: Look at the memory above for the user's name. Address them by name occasionally to build rapport, but DO NOT start every single message with their name. Speak to them like a real human texting a friend.
2. ANSWER DIRECT QUESTIONS: If the user explicitly asks about their history, name, progress, or past data (e.g., "What is my name?", "When was my last relapse?"), answer them directly and factually using the memory above. Do NOT give advice unless asked.
3. THE SPONSOR FRAMEWORK (For Advice/Crisis): If they are venting, craving, or struggling, validate their state, reference a past trigger to ground them, and give ONE highly specific, physical action. No vague platitudes.
4. CONVERSATIONAL TONE: Maximum 3 sentences. Text message style. No hyphens, no bullet points.
5. SAVE NEW MEMORIES: If they mention new triggers, progress, or their name, append exactly this at the end: NEW_MEMORY: [summary].`;
  
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText }
    ],
    // Keeping the highly compliant 20B model
    model: "openai/gpt-oss-20b", 
    temperature: 0.3, 
    max_tokens: 150, 
  });

  return chatCompletion.choices[0].message.content || "";
}