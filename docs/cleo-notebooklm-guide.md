# Cleo v1.5 & NotebookLM: Hybrid AI, Community, and Research

## Overview
Cleo v1.5 is a next-generation, emotionally intelligent AI agent built by Huminary Labs. It leverages hybrid multi-model orchestration (LangChain), local and cloud models, and is designed for privacy, cost-efficiency, and extensibility. All documentation is structured for Google NotebookLM, enabling advanced research, Q&A, and custom workflows.

---

## Architecture & Technology

### Hybrid Model Routing (LangChain)
- **LangChain**: Cleo uses LangChain to route every user request to the optimal model (local or cloud) based on context, cost, and task type.
- **Model Choices**:
  - **Local**: HuminaryLabs models (Ollama, recommended: `llama3.1:8b`)
  - **Cloud**: OpenAI (GPT-5-mini), Groq (GPT-OSS-120B), Gemini, Anthropic, Perplexity
- **Archon**: Task-driven workflow, knowledge management, and project orchestration.
- **Supabase**: Secure backend for chat, files, and analytics.

### Why LangChain?
- **Multi-model orchestration**: Route tasks to the best model for speed, cost, or intelligence.
- **Tool calling**: Automate workflows and integrate external APIs.
- **Context management**: Handle up to 131k context window for large docs and conversations.
- **Extensibility**: Add new models, tools, and workflows easily.

---

## Local Setup & HuminaryLabs Models

- **Ollama Integration**: Cleo runs locally with Ollama. Download and run `llama3.1:8b` for best results.
- **Privacy-first**: All processing can be done locally, keeping your data private.
- **Zero cloud cost**: Use Cleo for free on your hardware.
- **How to use locally**:
  1. Install [Ollama](https://ollama.com/download)
  2. Run: `ollama pull llama3.1:8b`
  3. Set `OLLAMA_BASE_URL` in `.env.local`
  4. Start Cleo: `pnpm dev`

---

## Cloud Models & Advanced Features

- **GPT-5-mini**: Premium reasoning, 131k context window
- **GPT-OSS-120B**: Ultra-fast inference, 131k context
- **Gemini, Anthropic, Perplexity**: Specialized tasks, multimodal support
- **Automatic fallback**: Cleo routes to cloud when local is unavailable or task requires more power

---

## NotebookLM Integration

- **Docs Format**: All docs in `/docs` are Markdown, ready for NotebookLM
- **How to use**:
  1. Go to [NotebookLM](https://notebooklm.google.com/)
  2. Upload Cleo docs (Markdown, PDF, TXT)
  3. Add your own docs for custom research
  4. Use up to 50 sources, 500k words each
  5. Ask questions, generate summaries, and build knowledge graphs
- **Best Practices**:
  - Use clear titles and sections in docs
  - Reference source names in queries for focused answers
  - Mix Cleo docs with your own for richer context

---

## How Cleo Learns & Optimizes

- **Archon MCP**: Tracks tasks, knowledge, and project features for continuous improvement
- **RAG (Retrieval-Augmented Generation)**: Cleo retrieves relevant context from your docs for every answer
- **Tool calling**: Cleo can automate actions, fetch data, and integrate with external APIs
- **Community-driven**: Contributions and feedback help Cleo learn and adapt

---

## User Benefits & Use Cases

- **Privacy**: Local-first, no data leaves your device unless you choose
- **Cost**: Free local usage, cloud only when needed
- **Flexibility**: Switch between local and cloud seamlessly
- **Research**: NotebookLM integration for advanced Q&A, summarization, and mind maps
- **Extensibility**: Add new models, tools, and workflows
- **Community**: Open source, transparent, and collaborative

---

## Example: Research Workflow with Cleo & NotebookLM

1. Upload Cleo’s docs and your research papers to NotebookLM
2. Ask: "Summarize the advantages of LangChain routing in Cleo v1.5"
3. Ask: "How do I run Cleo locally with Ollama?"
4. Build a mind map of Cleo’s architecture using NotebookLM’s features
5. Mix Cleo docs with your own for custom Q&A and knowledge graphs

---

## Further Reading
- [LangChain Integration Guide](./langchain-integration.md)
- [Prompt Engineering Playbook](./prompt-engineering-playbook.md)
- [Performance Optimizations](./performance-optimizations.md)
- [Canvas Interactive Features](./canvas-interactive-features.md)
- [Web Search Tool](./web-search-tool.md)

---

## Join the Community
- GitHub: [LuisNSantana/cleo-agent](https://github.com/LuisNSantana/cleo-agent)
- Discord: [Community Invite](#)
- Contribute, share feedback, and help Cleo grow smarter!

---

## License
MIT
