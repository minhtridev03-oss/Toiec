# AI provider setup

The application can use Gemini, OpenAI, or both for server-side import scripts.
Do not use a `VITE_` prefix for any of these values.

Add the values you need to `.env.local`:

```dotenv
# Keep the existing Gemini integration (optional when OpenAI is configured)
GEMINI_API_KEY=
GEMINI_TEXT_MODEL=gemini-2.5-flash

# OpenAI integration
OPENAI_API_KEY=
OPENAI_TEXT_MODEL=gpt-5.6-sol
OPENAI_AUDIO_MODEL=whisper-1

# Provider selection: gemini, openai, or auto
# Text imports prefer Gemini and fall back to OpenAI in auto mode.
AI_TEXT_PROVIDER=auto
# Audio imports prefer OpenAI timestamps and fall back to Gemini in auto mode.
AI_AUDIO_PROVIDER=auto
```

`OPENAI_API_KEY` and `GEMINI_API_KEY` are consumed only by Node import scripts or server-side code. They must never be exposed through client variables such as `VITE_OPENAI_API_KEY`.

For audio transcripts, `whisper-1` is used because it can return timestamped segments. Source files must be 25 MB or smaller for the OpenAI transcription endpoint.
