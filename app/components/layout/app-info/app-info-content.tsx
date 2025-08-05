export function AppInfoContent() {
  return (
    <div className="space-y-4">
      <p className="text-foreground leading-relaxed">
        <span className="font-medium">Cleo</span> is an emotionally intelligent AI assistant by Huminary Labs
        for AI chat.
        <br />
        Multi-model, BYOK-ready, and fully self-hostable.
        <br />
        Use Claude, OpenAI, Gemini, local models, and more, all in one place.
        <br />
      </p>
      <p className="text-foreground leading-relaxed">
        The code is available on{" "}
        <a
          href="https://github.com/ibelick/zola"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          GitHub
        </a>
        .
      </p>
    </div>
  )
}
