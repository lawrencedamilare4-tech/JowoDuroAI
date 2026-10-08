JowoDuro AI
A decentralized, context-aware accountability sponsor for addiction recovery.

Built for the Walrus Session 8 Hackathon.

JowoDuro AI is a Telegram-based chatbot designed to act as a strict, empathetic accountability partner. By leveraging decentralized memory, it remembers a user's past triggers, coping mechanisms, and milestones, providing highly personalized intervention when the user is facing a relapse.

It solves AI Amnesia and Vector Dilution by forcing a massive LLM to extract highly structured data to the Walrus network, ensuring critical context is never lost in conversational noise.

🚀 Tech Stack
Memory Layer: Walrus Memory SDK (@mysten-incubation/memwal) for decentralized, persistent, and private user context.

AI Inference (Primary): 120B Parameter Model via Groq for ultra-fast reasoning and strict JSON schema adherence.

AI Inference (Fallback): Llama 3 8B for lightning-fast, intelligent error recovery.

Infrastructure: Supabase Edge Functions (Deno) for secure, serverless webhook execution and timeout racing.

Interface: Telegram Bot API.

✨ Key Features
Strict JSON Data Extraction:
Instead of generating fuzzy conversational summaries, the 120B model is prompted as a strict data-entry clerk. It filters conversational noise and strictly extracts critical facts into [PERSONAL INFO], [RELAPSE DATE], and [RECOMMENDATION] tags within a secure JSON payload.

Intent-Routed Hybrid Queries:
To beat vector dilution, the backend intercepts user questions and routes them to search for specific data tags rather than raw sentences. This turns the Walrus vector search into a high-precision database lookup, achieving 100% recall of crucial data.

Dynamic Streak Tracking (No SQL):
Tracks sobriety streaks entirely on-chain without a centralized Web2 database. The system injects the server's current date into the AI prompt at inference, allowing the AI to dynamically calculate days sober based on the [RELAPSE DATE] pulled from the Walrus network.

Contextual AI Error Handling & Timeout Racing:
Hides blockchain latency from the user during a crisis. Promise.race logic intercepts slow Walrus relayer responses (8000ms timeout) with empathetic grounding text. If the 120B model hallucinates bad JSON, an 8B fallback model instantly generates a conversational apology.

🧠 How the Memory Architecture Works
JowoDuro uses a highly restrictive dual-layer pipeline between Groq and Walrus Memory:

Recall & Route: When a user messages the bot, the Intent Router determines if it is a general chat or a direct data lookup. It queries the Walrus relayer for the user's dynamic namespace (jowoduro_user_${chatId}), racing the network against a strict timer to prevent latency.

Date-Injected Generation: Groq processes the Walrus context alongside injected server time. The 120B model outputs a strict JSON object containing two keys: textToSend (the conversational reply) and factToSave (highly concentrated, tagged data).

Parse & Fire-and-Forget: The Edge Function intercepts the JSON, sends the human-readable textToSend to Telegram instantly, and queues a background worker to push the factToSave to the decentralized Walrus relayer before spinning down.

📂 Project Structure
A modular, enterprise-grade edge function architecture:

Plaintext
supabase/
└── functions/
    └── jowoduro/
        ├── index.ts              # Main webhook router, intent routing & lifecycle manager
        ├── config.ts             # Environment variable validation
        └── services/
            ├── walrus.ts         # Hybrid tag-based queries & timeout racing
            └── groq.ts           # 120B JSON extraction, streak tracking & 8B fallbacks
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
https://api.telegram.org/bot<YOUR_TELEGRAM_TOKEN>/setWebhook?url=https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co/functions/v1/jowoduro
🔮 Future Roadmap
Voice Crisis Mode: Integrating whisper-large-v3 via Groq to allow users to send audio journals during panic attacks for instant, frictionless grounding.

The Clinical Handoff: Adding a /report command that aggregates a user's [RECOMMENDATION] and [RELAPSE DATE] tags into a highly structured Markdown export for human therapists.

Web3 Milestone Badges: Triggering smart contracts to mint Soulbound Tokens (NFTs) to a user's wallet when the dynamic streak tracker hits 30, 90, or 365 days of sobriety.