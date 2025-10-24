import {
  Code,
  Lightbulb,
  Paintbrush,
  Rocket,
  Sparkles,
  FileText,
  Brain,
  Globe,
} from "lucide-react"

export const SUGGESTIONS_CONFIG = [
  {
    label: "Code",
    highlight: "Help me",
    prompt: "Help me",
    items: [
      "Help me write a React component with TypeScript",
      "Help me debug this error message",
      "Help me optimize this database query",
      "Help me create a responsive navbar",
    ],
    icon: Code,
  },
  {
    label: "Write",
    highlight: "Write",
    prompt: "Write",
    items: [
      "Write a professional email to decline a meeting",
      "Write a blog post outline about productivity",
      "Write a compelling product description",
      "Write a concise summary of this document",
    ],
    icon: FileText,
  },
  {
    label: "Design",
    highlight: "Design",
    prompt: "Design",
    items: [
      "Design a modern color palette for a SaaS app",
      "Design a user onboarding flow",
      "Design a landing page structure",
      "Design an accessible UI component",
    ],
    icon: Paintbrush,
  },
  {
    label: "Analyze",
    highlight: "Analyze",
    prompt: "Analyze",
    items: [
      "Analyze the pros and cons of this approach",
      "Analyze this dataset and find patterns",
      "Analyze user feedback and suggest improvements",
      "Analyze market trends for 2025",
    ],
    icon: Brain,
  },
  {
    label: "Research",
    highlight: "Research",
    prompt: "Research",
    items: [
      "Research the best practices for API design",
      "Research competitor features and pricing",
      "Research emerging AI technologies",
      "Research sustainable business models",
    ],
    icon: Globe,
  },
  {
    label: "Create",
    highlight: "Create",
    prompt: "Create",
    items: [
      "Create a project roadmap for Q1 2025",
      "Create test cases for this feature",
      "Create a content calendar for social media",
      "Create a presentation outline",
    ],
    icon: Rocket,
  },
  {
    label: "Inspire",
    highlight: "Inspire me",
    prompt: "Inspire me",
    items: [
      "Inspire me with creative project ideas",
      "Inspire me with a motivational quote",
      "Inspire me with innovative solutions",
      "Inspire me with a unique perspective",
    ],
    icon: Sparkles,
  },
  {
    label: "Explain",
    highlight: "Explain",
    prompt: "Explain",
    items: [
      "Explain how blockchain works simply",
      "Explain the difference between AI and ML",
      "Explain React hooks to a beginner",
      "Explain OAuth authentication flow",
    ],
    icon: Lightbulb,
  },
]
