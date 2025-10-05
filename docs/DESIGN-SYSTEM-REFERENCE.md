# 🎨 Design System Reference - Cleo 2025

## 📐 Spacing System

```tsx
// Usar el sistema de spacing consistente
const SPACING = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
}

// Ejemplo de uso
<div className="p-md space-y-lg">
  <Header />
  <Content />
</div>
```

---

## 🎨 Color Palette

### Primary Colors

```tsx
// Azul principal (ya implementado)
--primary: #3b82f6
--primary-foreground: #ffffff

// Uso en componentes
<Button className="bg-primary text-primary-foreground">
  Action
</Button>
```

### Semantic Colors

```tsx
// Success
--success: #10b981
--success-bg: rgba(16, 185, 129, 0.1)

// Warning
--warning: #f59e0b
--warning-bg: rgba(245, 158, 11, 0.1)

// Error
--error: #ef4444
--error-bg: rgba(239, 68, 68, 0.1)

// Info
--info: #3b82f6
--info-bg: rgba(59, 130, 246, 0.1)
```

### Usage Examples

```tsx
// Success message
<div className="p-4 rounded-lg bg-[var(--success-bg)] border border-[var(--success)]">
  <p className="text-[var(--success)]">Operation successful!</p>
</div>

// Error message
<div className="p-4 rounded-lg bg-[var(--error-bg)] border border-[var(--error)]">
  <p className="text-[var(--error)]">Something went wrong</p>
</div>
```

---

## 📝 Typography Scale

### Headings

```tsx
// H1 - Hero
<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
  Welcome to Cleo
</h1>

// H2 - Section
<h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
  Features
</h2>

// H3 - Subsection
<h3 className="text-2xl md:text-3xl font-semibold">
  Getting Started
</h3>

// H4 - Card Title
<h4 className="text-xl font-semibold">
  Card Title
</h4>
```

### Body Text

```tsx
// Large body
<p className="text-lg leading-relaxed">
  This is large body text for important content.
</p>

// Regular body
<p className="text-base leading-normal">
  This is regular body text for most content.
</p>

// Small text
<p className="text-sm text-muted-foreground">
  This is small text for secondary information.
</p>

// Extra small
<span className="text-xs text-muted-foreground">
  Metadata or timestamps
</span>
```

### Code

```tsx
// Inline code
<code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">
  npm install
</code>

// Code block
<pre className="p-4 rounded-lg bg-muted overflow-x-auto">
  <code className="font-mono text-sm">
    {codeString}
  </code>
</pre>
```

---

## 🔘 Button Variants

### Primary Actions

```tsx
// Default primary
<Button variant="default" size="default">
  Primary Action
</Button>

// With icon
<Button variant="default" size="default" className="gap-2">
  <Plus className="h-4 w-4" />
  New Chat
</Button>

// Loading state
<Button variant="default" disabled>
  <Loader2 className="h-4 w-4 animate-spin mr-2" />
  Loading...
</Button>
```

### Secondary Actions

```tsx
// Outline
<Button variant="outline">
  Secondary Action
</Button>

// Ghost
<Button variant="ghost">
  Tertiary Action
</Button>

// Link style
<Button variant="link">
  Learn More
</Button>
```

### Sizes

```tsx
// Small
<Button size="sm">Small</Button>

// Default
<Button size="default">Default</Button>

// Large
<Button size="lg">Large</Button>

// Icon only
<Button size="icon">
  <Settings className="h-4 w-4" />
</Button>
```

### Destructive

```tsx
<Button variant="destructive">
  Delete
</Button>

<Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
  Cancel
</Button>
```

---

## 📦 Card Variants

### Basic Card

```tsx
<Card className="p-6">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description goes here</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Elevated Card (Premium)

```tsx
<Card className="elevated-2 hover:elevated-3 transition-all">
  <CardContent className="p-6">
    {/* Content with premium shadow */}
  </CardContent>
</Card>
```

### Glass Card

```tsx
<Card className="glass-medium border-white/10">
  <CardContent className="p-6">
    {/* Glassmorphism effect */}
  </CardContent>
</Card>
```

---

## 🎭 Avatar Variants

### User Avatar

```tsx
// With image
<Avatar>
  <AvatarImage src={user.avatar} alt={user.name} />
  <AvatarFallback>{user.initials}</AvatarFallback>
</Avatar>

// Sizes
<Avatar className="h-6 w-6">...</Avatar>  // Small
<Avatar className="h-8 w-8">...</Avatar>  // Default
<Avatar className="h-10 w-10">...</Avatar> // Medium
<Avatar className="h-12 w-12">...</Avatar> // Large
```

### AI Avatar (Cleo)

```tsx
<Avatar className="h-8 w-8 bg-gradient-to-br from-purple-500 to-blue-500">
  <Bot className="h-4 w-4 text-white" />
</Avatar>
```

### Status Indicator

```tsx
<div className="relative">
  <Avatar>
    <AvatarImage src={user.avatar} />
    <AvatarFallback>{user.initials}</AvatarFallback>
  </Avatar>
  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
</div>
```

---

## 🏷️ Badge Variants

### Status Badges

```tsx
// Success
<Badge variant="default" className="bg-success text-white">
  Active
</Badge>

// Warning
<Badge variant="default" className="bg-warning text-white">
  Pending
</Badge>

// Error
<Badge variant="default" className="bg-error text-white">
  Failed
</Badge>

// Info
<Badge variant="default" className="bg-info text-white">
  New
</Badge>
```

### Count Badges

```tsx
<div className="relative">
  <Button variant="ghost" size="icon">
    <Bell className="h-5 w-5" />
  </Button>
  <Badge 
    variant="destructive" 
    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
  >
    3
  </Badge>
</div>
```

### Outline Badges

```tsx
<Badge variant="outline">
  Draft
</Badge>

<Badge variant="outline" className="border-primary text-primary">
  Pro
</Badge>
```

---

## 📝 Input Variants

### Text Input

```tsx
// Default
<Input 
  type="text" 
  placeholder="Enter text..." 
/>

// With icon
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input 
    type="text" 
    placeholder="Search..." 
    className="pl-9"
  />
</div>

// With error
<div className="space-y-1">
  <Input 
    type="email" 
    placeholder="Email" 
    className="border-destructive focus-visible:ring-destructive"
  />
  <p className="text-xs text-destructive">Invalid email address</p>
</div>
```

### Textarea

```tsx
// Auto-resize
<Textarea 
  placeholder="Type your message..."
  className="min-h-[60px] max-h-[200px] resize-none"
/>

// With character count
<div className="space-y-2">
  <Textarea 
    value={text}
    onChange={(e) => setText(e.target.value)}
    maxLength={500}
  />
  <p className="text-xs text-muted-foreground text-right">
    {text.length}/500
  </p>
</div>
```

---

## 🎯 Loading States

### Spinner

```tsx
import { Loader2 } from "lucide-react"

<Loader2 className="h-4 w-4 animate-spin" />
```

### Skeleton

```tsx
// Text skeleton
<Skeleton className="h-4 w-full" />
<Skeleton className="h-4 w-3/4" />

// Avatar skeleton
<Skeleton className="h-10 w-10 rounded-full" />

// Card skeleton
<Card>
  <CardContent className="p-6 space-y-4">
    <Skeleton className="h-4 w-1/4" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-5/6" />
  </CardContent>
</Card>
```

### Progress

```tsx
<Progress value={progress} className="w-full" />
```

---

## 🎨 Animation Utilities

### Fade In

```tsx
<div className="animate-in fade-in duration-300">
  Content fades in
</div>
```

### Slide In

```tsx
<div className="animate-in slide-in-from-bottom duration-300">
  Content slides in from bottom
</div>

<div className="animate-in slide-in-from-left duration-300">
  Content slides in from left
</div>
```

### Scale

```tsx
<div className="animate-in zoom-in duration-200">
  Content scales in
</div>
```

### Combined

```tsx
<div className="animate-in fade-in slide-in-from-bottom duration-500">
  Fade + Slide
</div>
```

---

## 🎭 Hover Effects

### Lift

```tsx
<Card className="hover-lift cursor-pointer">
  <CardContent>
    Lifts on hover
  </CardContent>
</Card>
```

### Glow

```tsx
<Button className="glow-primary-hover">
  Glows on hover
</Button>
```

### Border Accent

```tsx
<div className="border-2 border-transparent hover:border-primary transition-colors">
  Border appears on hover
</div>
```

---

## 📱 Responsive Patterns

### Container

```tsx
<div className="container mx-auto px-4 md:px-6 lg:px-8">
  {/* Responsive padding */}
</div>
```

### Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => (
    <Card key={item.id}>...</Card>
  ))}
</div>
```

### Flex

```tsx
<div className="flex flex-col md:flex-row gap-4">
  <div className="flex-1">Main content</div>
  <aside className="w-full md:w-64">Sidebar</aside>
</div>
```

### Hide/Show

```tsx
// Hide on mobile, show on desktop
<div className="hidden md:block">
  Desktop only
</div>

// Show on mobile, hide on desktop
<div className="block md:hidden">
  Mobile only
</div>
```

---

## 🎯 Common Patterns

### Empty State

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
    <Inbox className="h-6 w-6 text-muted-foreground" />
  </div>
  <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
  <p className="text-sm text-muted-foreground mb-4">
    Start a conversation with Cleo
  </p>
  <Button>
    <Plus className="h-4 w-4 mr-2" />
    New Chat
  </Button>
</div>
```

### Error State

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
    <AlertCircle className="h-6 w-6 text-destructive" />
  </div>
  <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
  <p className="text-sm text-muted-foreground mb-4">
    {error.message}
  </p>
  <Button onClick={retry}>
    <RefreshCw className="h-4 w-4 mr-2" />
    Try Again
  </Button>
</div>
```

### Loading State

```tsx
<div className="flex flex-col items-center justify-center py-12">
  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
  <p className="text-sm text-muted-foreground">Loading...</p>
</div>
```

---

## 🎨 Theme Toggle

```tsx
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
```

---

## 📚 Component Library Reference

### Shadcn/ui Components Used

- ✅ Button
- ✅ Card
- ✅ Input
- ✅ Textarea
- ✅ Avatar
- ✅ Badge
- ✅ Skeleton
- ✅ Progress
- ✅ Tooltip
- ✅ Dialog
- ✅ Sheet
- ✅ Separator
- ✅ ScrollArea

### Custom Components to Create

- [ ] MessageItem (chat message)
- [ ] TypingIndicator
- [ ] MessageSkeleton
- [ ] ModeSelector
- [ ] QuickActions
- [ ] SidebarItem
- [ ] UserProfileCard
- [ ] AttachmentChip

---

## 🎯 Accessibility Guidelines

### Keyboard Navigation

```tsx
// Ensure all interactive elements are keyboard accessible
<button
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick()
    }
  }}
>
  Action
</button>
```

### ARIA Labels

```tsx
<Button aria-label="Send message">
  <Send className="h-4 w-4" />
</Button>

<Input 
  aria-label="Search chats"
  aria-describedby="search-help"
/>
<span id="search-help" className="sr-only">
  Type to search through your chat history
</span>
```

### Focus Management

```tsx
// Trap focus in modals
import { FocusTrap } from '@headlessui/react'

<Dialog>
  <FocusTrap>
    <DialogContent>
      {/* Modal content */}
    </DialogContent>
  </FocusTrap>
</Dialog>
```

---

## 📊 Performance Best Practices

### Lazy Loading

```tsx
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton className="h-40 w-full" />,
  ssr: false
})
```

### Memoization

```tsx
import { memo, useMemo } from 'react'

export const MessageItem = memo(({ message }) => {
  const formattedDate = useMemo(
    () => formatDate(message.created_at),
    [message.created_at]
  )

  return (
    <div>
      {/* Message content */}
    </div>
  )
})
```

### Debouncing

```tsx
import { useDebouncedCallback } from 'use-debounce'

const handleSearch = useDebouncedCallback((value: string) => {
  // Perform search
}, 300)
```

---

**Última actualización:** 2025-10-05  
**Versión:** 1.0  
**Mantenedor:** Equipo Cleo
