// supabase/functions/jowoduro/services/gemini.ts
import { GoogleGenAI } from "npm:@google/genai";

const ai = new GoogleGenAI({ apiKey: Deno.env.get("GEMINI_API_KEY") });

// The missing fallback wrapper to survive Google's 503 traffic spikes
async function generateWithFallback(contents: any, config?: any, retryAttempt = 0): Promise<any> {
  const primaryModel = "gemini-3.5-flash-lite"; // The ultra-fast workhorse
  const fallbackModel = "gemini-3.6-flash";     // The highly stable backup
  
  const modelToUse = retryAttempt >= 2 ? fallbackModel : primaryModel;

  try {
    return await ai.models.generateContent({
      model: modelToUse,
      contents: contents,
      config: config
    });
  } catch (error: any) {
    if ((error.status === 503 || error.status === 429) && retryAttempt < 3) {
      console.warn(`[GEMINI WARNING] ${error.status} Error on ${modelToUse}. Retrying... (Attempt ${retryAttempt + 1})`);
      const delay = (1000 * Math.pow(2, retryAttempt)) + (Math.random() * 500);
      await new Promise(resolve => setTimeout(resolve, delay));
      return generateWithFallback(contents, config, retryAttempt + 1);
    }
    throw error;
  }
}

export async function transcribeAudio(audioUrl: string): Promise<string> {
  console.log("[GEMINI] Downloading audio from Telegram...");
  const audioRes = await fetch(audioUrl);
  const arrayBuffer = await audioRes.arrayBuffer();
  
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Audio = btoa(binary);

  console.log("[GEMINI] Transcribing voice note...");
  const response = await ai.models.generateContent({
    // Upgraded to Google's dedicated low-latency audio model for transcription
    model: "gemini-3.5-transcribe",
    contents: [
      { inlineData: { data: base64Audio, mimeType: "audio/ogg" } },
      "Accurately transcribe this voice note. Output only the transcription text without formatting."
    ]
  });
  
  return response.text || "";
}

export async function generateClinicalReport(userContext: string) {
  const systemInstruction = `You are a clinical psychologist analyzing a patient's decentralized memory log. 
  Output a highly structured clinical summary in 3 sections using Markdown:
  1. Core Triggers
  2. Coping Strategies & Outcomes
  3. Recovery Progress & Recommendations`;
  
  // Use the wrapper to ensure the report generation never crashes
  const response = await generateWithFallback(`Patient Log:\n${userContext || "No data yet."}`, {
    systemInstruction: systemInstruction,
    temperature: 0.3, 
  });

  return response.text || "Could not generate report.";
}

export async function generateAccountabilityResponse(userText: string, userContext: string) {
  // CONCEPTUAL INTEGRATION NOTE: For hackathon stability, we would enforce these placeholders 
  // via the Deterministic Fact Layer (the KV store I proposed) rather than relying on LLM parsing 
  // from a blob. Below shows how to structure the prompt assuming those facts are fed in.

  // conceptually fetch these from a KV store first
  const userNameFact = getHardFactFromWalrusKV(chatId, "name"); // conceptual function
  const lastRelapseFact = getHardFactFromWalrusKV(chatId, "last_relapse"); // conceptual function
  const currentBookFact = getHardFactFromWalrusKV(chatId, "current_book"); // conceptual function

  const systemInstruction = `
    You are JowoDuro, an elite, clinically-trained accountability coach.

    YOUR MISSION (MUST FOLLOW):
    1. USE THEIR NAME NATURALLY: Address the user by name occasionally, but only if the facts below prove it is known[cite: 1].
    2. ANSWER DIRECT QUESTIONS FACTUALLY: If the user explicitly asks for history, progress, or past data, answer them factually based *only* on the DETERMINISTIC FACTS block below. If the answer is not in that block, state that you do not have that specific information logged yet. Do NOT invent dates or invent milestones[cite: 1].
    3. THE SPONSOR FRAMEWORK (Crisis only): If they are venting or craving, validate their state, reference a past trigger to ground them, and give ONE highly specific, physical action[cite: 1]. Do not invent crisis data.
    4. Conversational tone, max 3 sentences. No bullet points[cite: 1].

    <<<< STRUCTURED DETERMINISTIC FACTS >>>>
    User Identity:
    - Name: ${userNameFact || "[cite: NOT STORED]"}
    - Last Stated Relapse Timeline: ${lastRelapseFact || "[cite: NOT LOGGED]"}

    Current Progress Focus:
    - Current Activity: reading "${currentBookFact || "[cite: NO ACTIVITY LOGGED]"}"
    <<<< END DETERMINISTIC FACTS >>>>

    <<< USER RAW CONVERSATION MEMORY (FUZZY CONTEXT) >>>
    ${userContext || "No past raw context found."}
    <<< END WALRUS BLOB CONTEXT >>>`;

  const response = await generateWithFallback(userText, {
    systemInstruction: systemInstruction,
    // *** Lowered temperature to 0.1 for factual precision in non-crisis moments ***
    temperature: 0.1, 
    responseMimeType: "application/json",
    // Keep your JSON schema exactly as it is...
    responseSchema: {
      type: "OBJECT",
      properties: {
        textToSend: { type: "STRING", description: "The text message to send back to the user." },
        factToSave: { type: "STRING", description: "New memory/progress to track." }
      },
      required: ["textToSend", "factToSave"]
    }
  });

  const result = JSON.parse(response.text || "{}");
  return {
    textToSend: result.textToSend || "I am here with you. What's on your mind?",
    factToSave: result.factToSave || ""
  };
}