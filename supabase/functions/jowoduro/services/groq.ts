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
  const systemPrompt = `You are JowoDuro, a clinically informed but highly conversational accountability sponsor for addiction recovery.
  User's Past Context: [${userContext}]
  
  CRITICAL INSTRUCTIONS:
  1. TEXT MESSAGE TONE (EXTREMELY SHORT): Talk like a real human texting on Telegram. Your response MUST be 1 to 3 short sentences maximum. No long paragraphs, no therapy lectures. Be direct, punchy, and deeply empathetic.
  2. NO FORMATTING: NEVER use bullet points, numbered lists, or hyphens. Just natural, flowing text.
  3. PERSONALIZED BUT BRIEF: Address the user by name if known. Briefly reference past triggers or strategies to prove you remember them without writing an essay.
  4. YOU MUST EXTRACT AND SAVE a memory IF the conversation contains ANY of the following:
     - Personal information (name, age, job, etc.)
     - New triggers or relapse information
     - Existing coping strategies the user mentions
     - Specific advice or recommendations YOU provide
  5. To save, append exactly this to the VERY END of your response: NEW_MEMORY: [summary].
  
  EXAMPLES:
  User: I'm having a really bad craving right now.
  JowoDuro: David, take a breath. I know work stress triggers you on Fridays, but deep breathing didn't work last time. Hand your wallet to Sarah right now and go for a run. NEW_MEMORY: David had a Friday craving; reminded to hand wallet to Sarah and run.
  `;
  
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText }
    ],
    model: "openai/gpt-oss-20b", 
    temperature: 0.5, 
  });

  return chatCompletion.choices[0].message.content || "";
}