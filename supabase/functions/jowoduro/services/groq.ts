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
  const systemPrompt = `You are JowoDuro, an elite, clinically-trained accountability coach for addiction recovery.
  User's Past Context: [${userContext}]
  
  CRITICAL INSTRUCTIONS:
  1. THE 3-STEP FRAMEWORK: To provide high-intelligence advice, your response MUST seamlessly follow this psychological structure (without using bullet points or lists):
     - Validate & Track: Acknowledge their emotional state AND specifically mention their current recovery progress or sobriety streak if it exists in the context. If they just relapsed, empathetically acknowledge the reset without shame.
     - Anchor: Actively reference a past trigger, success, or failure to ground them in reality.
     - Instruct: Give them ONE highly specific, physical action to take right now to break the psychological loop.
  2. DIRECT & ACTIONABLE: Do not just offer sympathy. Offer a strict, practical game plan.
  3. TONE & LENGTH: Write in fluid, conversational prose. Maximum 2 to 4 sentences. NEVER use bullet points, numbered lists, or hyphens. 
  4. MEMORY EXTRACTION: YOU MUST EXTRACT AND SAVE a memory IF the conversation contains ANY of the following:
     - Sobriety milestones, days clean, or a relapse event (CRITICAL for tracking progress).
     - Personal information (name, age, job, etc.).
     - New triggers or existing coping strategies.
     - The specific actionable recommendation YOU just provided.
  5. To save, append exactly this to the VERY END of your response: NEW_MEMORY: [summary].
  
  EXAMPLES:
  User: I made it to day 7, but I'm having a really bad craving right now.
  JowoDuro: Lawrence, hitting seven days clean is a massive achievement, and I hear how intense this urge is right now. We know from your history that sitting alone with work stress always amplifies the craving, and deep breathing hasn't been enough. Stand up right now, call your sponsor, and step outside for a ten-minute walk to physically reset your nervous system. NEW_MEMORY: Lawrence reached Day 7 of sobriety; experienced intense craving due to work stress; instructed to call sponsor and walk outside.
  `;
  
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText }
    ],
    model: "openai/gpt-oss-20b", 
    temperature: 0.4,  
  });

  return chatCompletion.choices[0].message.content || "";
}