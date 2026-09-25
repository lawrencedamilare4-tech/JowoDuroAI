# 🛡️ JowoDuro AI

**A decentralized, context-aware accountability sponsor for addiction recovery.**  
Built for the **Walrus Session 8 Hackathon**.

JowoDuro AI is a Telegram-based chatbot designed to act as a strict, empathetic accountability partner. By leveraging decentralized memory, it remembers a user's past triggers, coping mechanisms, and milestones, providing highly personalized intervention when the user is facing a relapse.

## 🚀 Tech Stack

- **Memory Layer:** [Walrus Memory SDK](https://github.com/MystenLabs/walrus-docs) (`@mysten-incubation/memwal`) for decentralized, persistent context.
- **AI Inference:** `openai/gpt-oss-20b` via **Groq** for ultra-fast, low-latency reasoning.
- **Infrastructure:** **Supabase Edge Functions** (Deno) for secure, 24/7 serverless webhook execution.
- **Interface:** **Telegram Bot API**.

---

## ✨ Key Features

1. **Decentralized Multi-Tenant Memory:** 
   Utilizes dynamic namespaces (`jowoduro_user_${chatId}`) to cryptographically isolate and persist user data on the Walrus network, ensuring complete privacy between individual users.
2. **Intelligent Fact Extraction:** 
   Employs strict Few-Shot prompting to force the LLM to autonomously extract personal info, triggers, and its own generated advice into a `NEW_MEMORY:` tag without interrupting the natural conversation flow.
3. **Optimistic UI / Background Saving:** 
   To eliminate the 3-5 second decentralized network indexing delay, the Edge Function delivers the AI's response to the user's Telegram instantly, and handles the `memwal.rememberAndWait()` indexing in the background before the runtime spins down.

---

## 🧠 How the Memory Architecture Works

JowoDuro uses a specialized prompt engineering technique to combine empathetic conversational AI with strict data-extraction rules. 

1. **Recall:** When a user messages the bot, the system queries the Walrus relayer for their specific `chatId` namespace and injects past triggers into the system prompt context.
2. **Generation:** Groq processes the context using the `gpt-oss-20b` model. If new information is detected (e.g., "I relapsed due to work stress"), the AI appends a hidden `NEW_MEMORY: User relapsed due to work stress` tag to its output.
3. **Parse & Split:** The Edge Function intercepts the response, splits the string, sends the human-readable advice to Telegram, and securely routes the extracted fact to Walrus.

---

## 📂 Project Structure

A modular, enterprise-grade edge function architecture:

```text
supabase/
└── functions/
    └── jowoduro/
        ├── index.ts              # Main webhook router & lifecycle manager
        ├── config.ts             # Environment variable validation
        └── services/
            ├── walrus.ts         # Decentralized memory interactions
            └── groq.ts           # LLM inference & prompt engineering
            🛠️ Local Development & Deployment
Prerequisites
Supabase CLI installed.

A Telegram Bot Token from @BotFather.

API keys for Groq and Walrus Memory.

1. Environment Setup
Rename .env.example to .env or set these secrets in your Supabase Dashboard:

Code snippet
GROQ_API_KEY=your_groq_api_key
TELEGRAM_BOT_TOKEN=your_telegram_token
MEMWAL_PRIVATE_KEY=your_walrus_private_key
MEMWAL_ACCOUNT_ID=your_walrus_account_id
2. Deploy the Edge Function
Deploy the function to Supabase, explicitly bypassing JWT verification so Telegram can successfully trigger the webhook:

Bash
supabase functions deploy jowoduro --no-verify-jwt
3. Register the Telegram Webhook
Point Telegram to your newly deployed Supabase function:

Plaintext
[https://api.telegram.org/bot](https://api.telegram.org/bot)<YOUR_TELEGRAM_TOKEN>/setWebhook?url=https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co/functions/v1/jowoduro
🔮 Future Roadmap
Proactive Check-ins: Implementing a CRON job to proactively message users based on their historical trigger times (e.g., Friday nights after payday).

Relapse Analytics: Aggregating anonymized trigger data to help clinical sponsors understand macro relapse trends.

Built with ❤️ for Walrus Session 8.