// supabase/functions/jowoduro/services/telegram.ts
import { config } from "../config.ts";

export async function sendTypingAction(chatId: string) {
  try {
    await fetch(`https://api.telegram.org/bot${config.tgToken}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" }),
    });
  } catch (error) {
    console.error("[TELEGRAM TYPING ERROR]:", error);
  }
}

export async function sendMessage(chatId: string, text: string) {
  try {
    // This creates the permanent Emergency and Report buttons
    const replyMarkup = {
      keyboard: [
        [{ text: "🚨 I'm about to relapse" }],
        [{ text: "📊 Generate Clinical Report" }]
      ],
      resize_keyboard: true,
      is_persistent: true
    };

    const response = await fetch(`https://api.telegram.org/bot${config.tgToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
          chat_id: chatId, 
          text: text,
          reply_markup: replyMarkup 
      }),
    });
    console.log(`[TELEGRAM] Message sent. Status: ${response.status}`);
  } catch (error) {
    console.error("[TELEGRAM ERROR]: Failed to send message:", error);
  }
}

// Fetches the download URL for voice notes
export async function getVoiceFileUrl(fileId: string) {
  const res = await fetch(`https://api.telegram.org/bot${config.tgToken}/getFile?file_id=${fileId}`);
  const data = await res.json();
  if (data.ok) {
      return `https://api.telegram.org/file/bot${config.tgToken}/${data.result.file_path}`;
  }
  throw new Error("Failed to get Telegram file path");
}