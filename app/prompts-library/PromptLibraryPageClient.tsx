"use client"

import Link from "next/link"
import Image from "next/image"
import { useMemo, useState } from "react"
import { Sparkles, Compass, Rocket, Share2, Layers, MessageSquare, Clock4, Quote, ChevronDown, ChevronUp, Zap } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PromptCard, type PromptExample } from "@/components/docs/PromptCard"
import { PromptCopyButton } from "@/components/docs/PromptCopyButton"
import { EditablePromptView } from "@/components/docs/EditablePromptView"
import { cn } from "@/lib/utils"

const heroStats = [
  { label: "Techniques", value: "50+", detail: "proven patterns" },
  { label: "Categories", value: "8", detail: "use cases" },
  { label: "Updated", value: "2025", detail: "latest practices" },
]

type PersonaId = "all" | "writing" | "coding" | "analysis" | "productivity" | "learning" | "creative"

interface LibraryPrompt extends PromptExample {
  tags: string[]
  persona: PersonaId
  maturity: "starter" | "advanced"
}

const personaFilters: { id: PersonaId; label: string }[] = [
  { id: "all", label: "All Categories" },
  { id: "writing", label: "✍️ Writing" },
  { id: "coding", label: "💻 Coding" },
  { id: "analysis", label: "📊 Analysis" },
  { id: "productivity", label: "⚡ Productivity" },
  { id: "learning", label: "📚 Learning" },
  { id: "creative", label: "🎨 Creative" },
]

const tagFilters = [
  "beginner",
  "advanced",
  "business",
  "technical",
  "creative",
  "research",
  "automation",
]

const promptLibrary: LibraryPrompt[] = [
  // WRITING CATEGORY
  {
    category: "Writing",
    title: "Professional Email Refiner",
    description: "Transform casual messages into polished professional emails while keeping your voice.",
    modelHint: "ChatGPT, Claude, Gemini",
    prompt: `I need you to refine this message into a professional email:

[PASTE YOUR DRAFT HERE]

Requirements:
- Keep the core message and my authentic voice
- Fix grammar and improve clarity
- Adjust tone to be professional yet warm
- Suggest a clear subject line
- Format with proper paragraphs and spacing`,
    tags: ["beginner", "business"],
    persona: "writing",
    maturity: "starter",
  },
  {
    category: "Writing",
    title: "Content Repurposing Engine",
    description: "Turn one piece of content into multiple formats (thread, LinkedIn post, email, blog outline).",
    modelHint: "GPT-4, Claude Sonnet",
    prompt: `Take this content and repurpose it into 4 formats:

[PASTE ORIGINAL CONTENT]

Create:
1. Twitter/X thread (8-12 tweets, hooks + thread structure)
2. LinkedIn post (engaging opener, 3-4 key points, CTA)
3. Email newsletter section (conversational, scannable)
4. Blog post outline (H2/H3 structure with key points)

Keep the core insights but adapt tone and format for each platform.`,
    tags: ["advanced", "business", "creative"],
    persona: "writing",
    maturity: "advanced",
  },

  // CODING CATEGORY
  {
    category: "Coding",
    title: "Code Explainer & Documentation",
    description: "Get clear explanations of complex code with inline comments and documentation.",
    modelHint: "GPT-4, Claude, Gemini Pro",
    prompt: `Explain this code step-by-step:

\`\`\`
[PASTE CODE HERE]
\`\`\`

Provide:
1. High-level summary (what it does)
2. Line-by-line explanation for complex parts
3. Key concepts/patterns used
4. Potential issues or improvements
5. Sample documentation block

Target audience: [junior developer / code reviewer / documentation]`,
    tags: ["beginner", "technical"],
    persona: "coding",
    maturity: "starter",
  },
  {
    category: "Coding",
    title: "Debug Assistant",
    description: "Systematic debugging help with root cause analysis and fix suggestions.",
    modelHint: "GPT-4, Claude Sonnet",
    prompt: `I'm seeing this error:

**Error message:** [PASTE ERROR]

**Code context:**
\`\`\`
[PASTE RELEVANT CODE]
\`\`\`

**What I've tried:** [DESCRIBE ATTEMPTS]

Help me:
1. Identify the root cause
2. Explain why it's happening
3. Provide 2-3 potential solutions (ranked by likelihood)
4. Share best practices to prevent this in future`,
    tags: ["advanced", "technical"],
    persona: "coding",
    maturity: "advanced",
  },

  // ANALYSIS CATEGORY
  {
    category: "Analysis",
    title: "Data Insight Extractor",
    description: "Turn raw data or reports into actionable insights with clear recommendations.",
    modelHint: "GPT-4, Claude",
    prompt: `Analyze this data and extract insights:

[PASTE DATA / REPORT / METRICS]

Provide:
1. **Key Findings** (3-5 bullets with confidence level: high/medium/low)
2. **Trends & Patterns** (what's changing and why it matters)
3. **Anomalies** (unexpected data points worth investigating)
4. **Actionable Recommendations** (prioritized by impact vs effort)
5. **Questions to Explore** (what additional data would help)

Format for executive summary.`,
    tags: ["business", "advanced"],
    persona: "analysis",
    maturity: "advanced",
  },
  {
    category: "Analysis",
    title: "Competitive Intelligence Brief",
    description: "Synthesize competitor research into strategic insights.",
    modelHint: "GPT-4, Claude",
    prompt: `Create a competitive intelligence brief:

**Competitors:** [LIST NAMES]
**Focus areas:** [e.g., pricing, features, marketing, positioning]

**Available data:**
[PASTE RESEARCH / LINKS / NOTES]

Deliver:
1. Comparison matrix (key differentiators)
2. Strengths & Weaknesses analysis
3. Market positioning map
4. Strategic opportunities (gaps we can exploit)
5. Threats to monitor

Keep it scannable for leadership review.`,
    tags: ["business", "research", "advanced"],
    persona: "analysis",
    maturity: "advanced",
  },

  // PRODUCTIVITY CATEGORY
  {
    category: "Productivity",
    title: "Meeting Notes → Action Items",
    description: "Convert messy meeting notes into clear action items with owners and deadlines.",
    modelHint: "ChatGPT, Claude, Gemini",
    prompt: `Transform these meeting notes into structured action items:

[PASTE NOTES]

Extract:
1. **Decisions Made** (what was agreed)
2. **Action Items** (task, owner, deadline, priority)
3. **Open Questions** (what needs clarification)
4. **Follow-up Topics** (for next meeting)

Format as:
- [ ] Task description (@owner, due: DATE, priority: H/M/L)`,
    tags: ["beginner", "business", "automation"],
    persona: "productivity",
    maturity: "starter",
  },
  {
    category: "Productivity",
    title: "Email Inbox Triage",
    description: "Categorize and prioritize a batch of emails with suggested responses.",
    modelHint: "GPT-4, Claude",
    prompt: `Help me triage these emails:

[PASTE EMAIL SUBJECTS AND PREVIEWS]

For each, provide:
1. Category (Urgent, Important, FYI, Spam/Low-priority)
2. Suggested action (Reply now, Schedule for later, Delegate, Archive)
3. 1-sentence summary of what it's about
4. Draft response (if action = Reply now)

Prioritize by impact and urgency.`,
    tags: ["business", "automation", "advanced"],
    persona: "productivity",
    maturity: "advanced",
  },

  // LEARNING CATEGORY
  {
    category: "Learning",
    title: "Explain Like I'm 5 (ELI5)",
    description: "Break down complex topics into simple, beginner-friendly explanations.",
    modelHint: "ChatGPT, Claude, Gemini",
    prompt: `Explain this concept in simple terms:

**Topic:** [PASTE TOPIC]

Requirements:
1. Start with a simple analogy or real-world example
2. Build up complexity gradually (3 levels: basic → intermediate → advanced)
3. Use concrete examples instead of jargon
4. End with "why it matters" practical application
5. Suggest 2-3 resources to learn more

Target audience: [complete beginner / career changer / student]`,
    tags: ["beginner", "research"],
    persona: "learning",
    maturity: "starter",
  },
  {
    category: "Learning",
    title: "Study Guide Generator",
    description: "Create comprehensive study materials from articles, lectures, or textbooks.",
    modelHint: "GPT-4, Claude",
    prompt: `Generate a study guide from this material:

[PASTE CONTENT / ARTICLE / LECTURE NOTES]

Include:
1. **Key Concepts** (definitions + examples)
2. **Summary** (3-5 bullet points)
3. **Practice Questions** (5 questions with answers)
4. **Memory Aids** (mnemonics, analogies, visual cues)
5. **Real-world Applications** (how to use this knowledge)
6. **Further Reading** (related topics to explore)

Format for efficient review and retention.`,
    tags: ["research", "advanced"],
    persona: "learning",
    maturity: "advanced",
  },

  // CREATIVE CATEGORY
  {
    category: "Creative",
    title: "Brainstorm Catalyst",
    description: "Generate diverse creative ideas with different thinking frameworks.",
    modelHint: "GPT-4, Claude",
    prompt: `Help me brainstorm ideas for:

**Challenge/Goal:** [DESCRIBE WHAT YOU NEED IDEAS FOR]
**Constraints:** [budget, timeline, resources]
**Target audience:** [who is this for]

Generate 15 ideas using these lenses:
1. **Conventional** (3 safe, proven approaches)
2. **Ambitious** (3 bold, high-impact ideas)
3. **Unconventional** (3 creative, unexpected angles)
4. **Low-effort wins** (3 quick wins you could test this week)
5. **Future-forward** (3 emerging trends to leverage)

For each, include: concept + why it could work + first step.`,
    tags: ["creative", "business", "advanced"],
    persona: "creative",
    maturity: "advanced",
  },
  {
    category: "Creative",
    title: "Story Structure Helper",
    description: "Develop compelling narratives for presentations, pitches, or content.",
    modelHint: "ChatGPT, Claude, Gemini",
    prompt: `Help me structure a story:

**Goal:** [pitch, presentation, article, case study]
**Key message:** [what you want audience to remember]
**Audience:** [who they are and what they care about]
**Available elements:** [facts, data, quotes, examples you have]

Structure using:
1. **Hook** (opening that grabs attention)
2. **Context** (set the scene, establish stakes)
3. **Conflict/Challenge** (problem or tension)
4. **Journey** (attempts, learnings, turning points)
5. **Resolution** (outcome and transformation)
6. **Takeaway** (memorable lesson or CTA)

Include transitions and pacing notes.`,
    tags: ["creative", "business", "beginner"],
    persona: "creative",
    maturity: "starter",
  },
]

const promptPacks = [
  {
    id: "productivity-essentials",
    title: "Productivity Essentials",
    icon: Clock4,
    gradient: "from-brand-violet/20 via-background to-background",
    summary: "Must-have prompts for email management, meeting notes, and daily workflows.",
    blueprint: [
      "Transform meetings into structured action items with owners",
      "Triage inbox batches and draft priority responses",
      "Create daily task breakdowns from project goals",
      "Automate repetitive communication workflows",
    ],
    sample: `Turn these meeting notes into action items:

[PASTE NOTES]

Format as checklist with:
- [ ] Task (@owner, due: DATE, priority: H/M/L)`,
    bestModel: "ChatGPT, Claude, Gemini",
    tags: ["productivity", "business", "beginner"],
  },
  {
    id: "writing-pack",
    title: "Professional Writing Pack",
    icon: Quote,
    gradient: "from-brand-cyan/20 via-background to-background",
    summary: "Refine emails, repurpose content, and craft compelling narratives for any platform.",
    blueprint: [
      "Polish casual messages into professional emails",
      "Repurpose one piece into multiple formats (thread, post, email)",
      "Generate hooks and opening lines that grab attention",
      "Structure stories for pitches and presentations",
    ],
    sample: `Repurpose this content into:
1. Twitter thread (8-10 tweets)
2. LinkedIn post (engaging format)
3. Email newsletter section

[PASTE CONTENT]`,
    bestModel: "GPT-4, Claude Sonnet",
    tags: ["writing", "creative", "business"],
  },
  {
    id: "learning-accelerator",
    title: "Learning Accelerator",
    icon: Layers,
    gradient: "from-emerald-500/20 via-background to-background",
    summary: "Master new topics fast with ELI5 breakdowns, study guides, and practice questions.",
    blueprint: [
      "Break down complex topics into simple analogies",
      "Generate study materials from articles or lectures",
      "Create practice questions with detailed answers",
      "Build progressive learning paths (basic → advanced)",
    ],
    sample: `Explain this concept in simple terms:

[TOPIC]

Use analogies, concrete examples, and build from basic to advanced.`,
    bestModel: "ChatGPT, Claude, Gemini Pro",
    tags: ["learning", "research", "beginner"],
  },
  {
    id: "code-companion",
    title: "Code Companion",
    icon: Sparkles,
    gradient: "from-blue-500/20 via-background to-background",
    summary: "Debug faster, document better, and understand code with AI-powered explanations.",
    blueprint: [
      "Get step-by-step code explanations with inline comments",
      "Systematic debugging with root cause analysis",
      "Auto-generate documentation from code",
      "Learn patterns and best practices from examples",
    ],
    sample: `Explain this code and suggest improvements:

\`\`\`
[PASTE CODE]
\`\`\``,
    bestModel: "GPT-4, Claude Sonnet, Gemini Pro",
    tags: ["coding", "technical", "advanced"],
  },
]

const guestModeRecipes = [
  {
    title: "Getting Started Template",
    context: "Perfect first prompt for anyone new to AI assistants.",
    focus: "Onboarding",
    prompt: `I'm new to using AI assistants. Help me get started:

1. Ask me 2-3 questions to understand my goals
2. Suggest 3 practical ways I could use you right now
3. Give me a simple first task to try

Keep it conversational and beginner-friendly.`,
  },
  {
    title: "Context Setter",
    context: "Establish your role and needs upfront for better responses.",
    focus: "Productivity",
    prompt: `Before we start, here's my context:

**My role:** [your job title / situation]
**Current goal:** [what you're trying to accomplish]
**Timeline:** [deadline or urgency]
**Constraints:** [budget, tools, resources available]

Based on this, help me [specific request].`,
  },
  {
    title: "Quick Quality Check",
    context: "Verify AI responses against your source material.",
    focus: "Analysis",
    prompt: `I need you to fact-check your previous response against this source:

[PASTE SOURCE MATERIAL]

For each claim you made:
1. Verify if it appears in the source (✓ or ✗)
2. Flag any inferences or extrapolations
3. Suggest better questions if data is missing`,
  },
]

const shareSteps = [
  {
    title: "Copy & Customize",
    detail: "Take any prompt template and adapt it for your specific use case, industry, or workflow.",
  },
  {
    title: "Test & Iterate",
    detail: "Try prompts with different AI models (ChatGPT, Claude, Gemini) to find what works best for you.",
  },
  {
    title: "Share Improvements",
    detail: "Found a great variation? Share it back with the community to help others level up their prompting.",
  },
]

const communityLinks = [
  {
    title: "GitHub: Prompt Templates",
    description: "Browse community-contributed prompts and workflows.",
    href: "https://github.com/LuisNSantana/cleo-agent",
  },
  {
    title: "Suggest a Prompt",
    description: "Share your best prompts to be featured in the library.",
    href: "mailto:hello@imankieai.com?subject=Prompt%20Library%20Contribution",
  },
]

export default function PromptLibraryPageClient() {
  const [query, setQuery] = useState("")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectedPersona, setSelectedPersona] = useState<PersonaId>("all")
  const [activePackId, setActivePackId] = useState(promptPacks[0].id)

  const filteredPrompts = useMemo(() => {
    return promptLibrary.filter((prompt) => {
      const normalizedQuery = query.trim().toLowerCase()
      const matchesQuery = !normalizedQuery
        || prompt.title.toLowerCase().includes(normalizedQuery)
        || prompt.description.toLowerCase().includes(normalizedQuery)
        || prompt.prompt.toLowerCase().includes(normalizedQuery)
        || prompt.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))

      const matchesTag = selectedTag ? prompt.tags.includes(selectedTag) : true
      const matchesPersona = selectedPersona === "all" ? true : prompt.persona === selectedPersona

      return matchesQuery && matchesTag && matchesPersona
    })
  }, [query, selectedTag, selectedPersona])

  const activePack = promptPacks.find((pack) => pack.id === activePackId) ?? promptPacks[0]

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-background via-surface to-surface-subtle text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--color-brand-cyan)/0.12),_transparent_60%)]" aria-hidden />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-4 pb-20 pt-12 sm:px-6 lg:px-8">
        {/* Hero */}
        <section id="getting-started" className="rounded-3xl border border-border/40 bg-gradient-to-br from-card via-card/60 to-background/80 p-8 shadow-xl backdrop-blur-sm overflow-hidden relative">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_hsl(var(--color-brand-violet)/0.15),_transparent_50%)] animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_hsl(var(--color-brand-cyan)/0.15),_transparent_50%)] animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
          
          <div className="relative flex flex-col gap-10 lg:flex-row lg:items-center">
            <div className="flex-1 space-y-6">
              <div className="flex items-center gap-3">
                <Badge className="bg-brand-violet/10 text-brand-violet border-brand-violet/20 animate-in fade-in slide-in-from-left duration-500">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Universal Prompt Library
                </Badge>
                <Badge className="bg-gradient-to-r from-brand-violet to-brand-cyan text-white border-0 animate-in fade-in slide-in-from-right duration-500 delay-100">
                  <Zap className="h-3 w-3 mr-1" />
                  New: Interactive Mode
                </Badge>
              </div>
              
              <div className="flex items-start gap-4 animate-in fade-in slide-in-from-bottom duration-700 delay-200">
                <div className="relative">
                  <div className="absolute inset-0 bg-brand-violet/20 rounded-xl blur-xl animate-pulse" style={{ animationDuration: '3s' }} />
                  <Image 
                    src="/img/logoankie.png" 
                    alt="Ankie AI" 
                    width={56} 
                    height={56} 
                    className="relative rounded-xl ring-2 ring-brand-violet/20 hover:ring-brand-violet/40 transition-all hover:scale-105" 
                  />
                </div>
                <div className="space-y-4 flex-1">
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl bg-gradient-to-r from-brand-violet via-brand-cyan to-brand-violet bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                    Prompt Engineering Essentials
                  </h1>
                  <p className="max-w-2xl text-base text-muted-foreground leading-relaxed">
                    Professional prompt templates for <span className="text-foreground font-medium">ChatGPT, Claude, Gemini</span>, and any LLM. 
                    Boost productivity with proven patterns for writing, coding, analysis, and creative work.
                  </p>
                </div>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-3 animate-in fade-in slide-in-from-bottom duration-700 delay-300">
                {heroStats.map((stat, i) => (
                  <div key={stat.label} className="rounded-2xl border border-border/30 bg-gradient-to-br from-brand-violet/5 to-brand-cyan/5 backdrop-blur-sm px-4 py-3 hover:border-brand-violet/50 transition-all hover:scale-105" style={{ animationDelay: `${i * 100}ms` }}>
                    <p className="text-2xl font-semibold bg-gradient-to-r from-brand-violet to-brand-cyan bg-clip-text text-transparent">{stat.value}</p>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/90">{stat.label}</p>
                    <p className="text-[11px] text-muted-foreground/70">{stat.detail}</p>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-bottom duration-700 delay-400">
                <Button size="lg" className="bg-gradient-to-r from-brand-violet to-brand-cyan text-white hover:opacity-90 shadow-lg hover:shadow-xl transition-all" asChild>
                  <Link href="#interactive-playground">
                    <Zap className="mr-2 h-4 w-4" />
                    Try Interactive Mode
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-border/50 hover:bg-surface/50 hover:border-brand-violet/30" asChild>
                  <Link href="#prompt-finder">
                    <Compass className="mr-2 h-4 w-4" />
                    Explore Prompts
                  </Link>
                </Button>
              </div>
            </div>
            
            <Card className="flex-1 border-border/50 bg-card/30 backdrop-blur-sm shadow-2xl animate-in fade-in slide-in-from-right duration-700 delay-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-brand-cyan" />
                  Featured Starter Prompt
                </CardTitle>
                <CardDescription>
                  Perfect for your first AI conversation—adaptable to any use case.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <EditablePromptView 
                  template={`I'm exploring how AI can help with [YOUR SPECIFIC TASK/GOAL].

Please:
1. Ask me 2-3 clarifying questions about my situation
2. Suggest 3 practical next steps I can take
3. Explain your reasoning briefly

Let's start simple and iterate from there.`}
                  description="Replace the variable above to get personalized guidance"
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-brand-violet" />
                  <span>Tip: Click the purple chip to customize for your needs!</span>
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* INNOVATIVE FEATURE: Interactive Prompt Playground */}
        <section id="interactive-playground" className="space-y-6">
          <div className="text-center space-y-3">
            <Badge className="bg-gradient-to-r from-brand-violet to-brand-cyan text-white border-0">
              <Zap className="h-3 w-3 mr-1" />
              New: Interactive Playground
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight">
              Click. Edit. Copy. Done.
            </h2>
            <p className="max-w-2xl mx-auto text-muted-foreground">
              No more manual find-and-replace. Click any variable chip, customize it inline, and copy your personalized prompt instantly.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Example 1: Professional Email */}
            <Card className="border-brand-violet/30 bg-gradient-to-br from-brand-violet/5 via-background to-background shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Try it: Professional Email Writer</CardTitle>
                <CardDescription>
                  Click the purple chips below to customize this email template
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EditablePromptView
                  template={`Refine this message into a professional email:

[PASTE YOUR DRAFT]

Requirements:
- Tone: [TONE - e.g., formal, friendly, urgent]
- Recipient: [RECIPIENT ROLE]
- Goal: [WHAT YOU WANT TO ACHIEVE]
- Key points to emphasize: [MAIN POINTS]

Include a clear subject line and proper formatting.`}
                  title="Email Refiner Template"
                  description="Perfect for transforming casual messages into polished emails"
                />
              </CardContent>
            </Card>

            {/* Example 2: Code Debugger */}
            <Card className="border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/5 via-background to-background shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Try it: Code Debug Assistant</CardTitle>
                <CardDescription>
                  Customize this debugging template for your specific issue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EditablePromptView
                  template={`Debug this [PROGRAMMING LANGUAGE] code:

**Error:**
[PASTE ERROR MESSAGE]

**Code:**
\`\`\`
[PASTE CODE]
\`\`\`

**Context:** [WHAT YOU WERE TRYING TO DO]

Provide:
1. Root cause analysis
2. Step-by-step fix
3. Prevention tips`}
                  title="Debug Helper Template"
                  description="Get systematic debugging help for any programming language"
                />
              </CardContent>
            </Card>
          </div>

          {/* Feature highlights */}
          <div className="grid gap-4 sm:grid-cols-3 mt-8">
            <Card className="border-border/50 bg-card/30 backdrop-blur-sm text-center p-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-brand-violet/10 flex items-center justify-center mb-3">
                <Sparkles className="h-6 w-6 text-brand-violet" />
              </div>
              <h4 className="font-semibold mb-2">Smart Detection</h4>
              <p className="text-sm text-muted-foreground">
                Automatically finds [PLACEHOLDERS] and makes them editable
              </p>
            </Card>
            <Card className="border-border/50 bg-card/30 backdrop-blur-sm text-center p-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-brand-cyan/10 flex items-center justify-center mb-3">
                <Zap className="h-6 w-6 text-brand-cyan" />
              </div>
              <h4 className="font-semibold mb-2">Real-time Preview</h4>
              <p className="text-sm text-muted-foreground">
                See your customized prompt update as you type
              </p>
            </Card>
            <Card className="border-border/50 bg-card/30 backdrop-blur-sm text-center p-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                <Rocket className="h-6 w-6 text-green-500" />
              </div>
              <h4 className="font-semibold mb-2">One-click Copy</h4>
              <p className="text-sm text-muted-foreground">
                Copy your personalized prompt ready to paste into any AI
              </p>
            </Card>
          </div>
        </section>

        {/* Finder */}
        <section id="prompt-finder" className="space-y-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Compass className="h-5 w-5 text-brand-violet" />
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-brand-violet/80">Search</p>
                <h2 className="text-2xl font-semibold">Find the perfect prompt</h2>
              </div>
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Filter by category, tag, or search keywords. Each prompt is optimized for modern LLMs and real-world productivity workflows.
            </p>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-card/30 p-4 backdrop-blur-sm">
            <Input
              placeholder="e.g. 'summarize documents', 'write email', 'debug code'"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-12 border-border bg-surface/60 placeholder:text-muted-foreground"
            />
            <div className="flex flex-wrap gap-2">
              {tagFilters.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTag === tag ? "default" : "secondary"}
                  onClick={() => setSelectedTag((prev) => (prev === tag ? null : tag))}
                  className={cn(
                    "cursor-pointer border border-border/50 px-3 py-1 text-xs",
                    selectedTag === tag
                      ? "bg-brand-violet text-white"
                      : "bg-transparent hover:bg-surface/50"
                  )}
                >
                  #{tag}
                </Badge>
              ))}
              {selectedTag && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedTag(null)} className="text-xs text-muted-foreground">
                  Clear filter
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {personaFilters.map((persona) => (
                <Button
                  key={persona.id}
                  size="sm"
                  variant={selectedPersona === persona.id ? "default" : "outline"}
                  onClick={() => setSelectedPersona(persona.id)}
                  className={cn(
                    "rounded-full border-white/20 text-xs uppercase tracking-wide",
                    selectedPersona === persona.id
                      ? "bg-white text-slate-900"
                      : "bg-transparent text-white hover:bg-white/10"
                  )}
                >
                  {persona.label}
                </Button>
              ))}
            </div>
          </div>
        </section>

        <section id="tasks" className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-violet/80">Results</p>
              <h3 className="text-xl font-semibold">{filteredPrompts.length} prompts ready to copy</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedPersona === "all" ? "All categories" : `Filtered by ${personaFilters.find((p) => p.id === selectedPersona)?.label}`}
              {selectedTag ? ` · #${selectedTag}` : ""}
            </p>
          </div>
          {filteredPrompts.length === 0 ? (
            <Card className="border-border bg-card/50">
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                No prompts found with those filters. Try a different keyword or remove a tag.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredPrompts.map((prompt) => (
                <div key={prompt.title} className="space-y-3 rounded-2xl border border-border bg-card/30 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="bg-brand-violet/10 text-[10px] uppercase tracking-widest text-brand-violet">
                      {prompt.category}
                    </Badge>
                    <span>{prompt.maturity === "starter" ? "Starter" : "Advanced"}</span>
                  </div>
                  <PromptCard ex={prompt} />
                  <div className="flex flex-wrap gap-2">
                    {prompt.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Prompt packs */}
        <section id="build-agents" className="space-y-6">
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-brand-violet" />
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-violet/80">Prompt packs</p>
              <h3 className="text-2xl font-semibold">Multi-prompt workflows</h3>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-[250px,1fr]">
            <div className="flex flex-col gap-2">
              {promptPacks.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => setActivePackId(pack.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
                    pack.id === activePackId
                      ? "border-brand-violet/60 bg-brand-violet/10"
                      : "border-border bg-transparent text-muted-foreground hover:border-border/80"
                  )}
                >
                  <pack.icon className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium">{pack.title}</p>
                    <p className="text-xs opacity-60">{pack.summary}</p>
                  </div>
                </button>
              ))}
            </div>
            <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <activePack.icon className="h-5 w-5 text-brand-violet" />
                  {activePack.title}
                </CardTitle>
                <CardDescription>
                  Recommended model: {activePack.bestModel}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Blueprint</p>
                  <ul className="mt-2 space-y-2 text-sm">
                    {activePack.blueprint.map((step) => (
                      <li key={step} className="flex items-start gap-2">
                        <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-brand-violet" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Base prompt</p>
                  <pre className="rounded-2xl border border-border bg-surface/60 p-4 text-xs leading-relaxed">{activePack.sample}</pre>
                  <PromptCopyButton text={activePack.sample} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {activePack.tags.map((tag) => (
                    <Badge key={tag} className="bg-brand-violet/10 text-brand-violet">#{tag}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Quick Start */}
        <section id="pwa" className="space-y-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-brand-cyan" />
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-cyan/80">Quick Start</p>
              <h3 className="text-2xl font-semibold">Essential starter prompts</h3>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {guestModeRecipes.map((recipe) => (
              <Card key={recipe.title} className="border-border/50 bg-card/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">{recipe.title}</CardTitle>
                  <CardDescription>{recipe.context}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Badge className="bg-brand-cyan/10 text-brand-cyan">{recipe.focus}</Badge>
                  <pre className="rounded-2xl border border-border bg-surface/60 p-3 text-xs leading-relaxed">{recipe.prompt}</pre>
                  <PromptCopyButton text={recipe.prompt} />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Community */}
        <section id="dashboard" className="space-y-6">
          <div className="flex items-center gap-3">
            <Share2 className="h-5 w-5 text-brand-violet" />
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-violet/80">Community</p>
              <h3 className="text-2xl font-semibold">Share your prompt packs</h3>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {shareSteps.map((step) => (
              <Card key={step.title} className="border-border/50 bg-card/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>{step.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{step.detail}</CardContent>
              </Card>
            ))}
            {communityLinks.map((link) => (
              <Card key={link.title} className="border-border/50 bg-gradient-to-br from-brand-violet/10 via-card/30 to-card/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>{link.title}</CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="bg-brand-violet text-white hover:bg-brand-violet/90">
                    <Link href={link.href} target="_blank" rel="noreferrer">
                      Join
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
