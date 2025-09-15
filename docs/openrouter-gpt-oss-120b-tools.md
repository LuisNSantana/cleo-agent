# OpenRouter GPT-OSS-120B (free) tool calling

Some OpenRouter routes do not support function/tool calling even if the base model does elsewhere. In particular, `openrouter:openai/gpt-oss-120b:free` currently lacks tool support.

What we changed:
- Marked this model as `tools: false` in the optimized tiers registry.
- Added a runtime guard in the chat API to disable tools when a non-tool model is selected.
- When tools are needed (e.g., search enabled) and a non-tool model is chosen, we swap to a known tool-capable fallback for the request: `openrouter:deepseek/deepseek-chat-v3.1:free`.

Impact:
- Users selecting Fast (OpenRouter GPT-OSS-120B free) will still chat normally.
- If a tool is required, the request transparently uses DeepSeek v3.1 for that turn to execute tools, then returns results in the same thread.

Notes:
- The Groq-hosted `gpt-oss-120b` continues to support tools via the Groq provider.
- If OpenRouter adds tool support to this route in the future, flip `tools: true` and remove the swap.
