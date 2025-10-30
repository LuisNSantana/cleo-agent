# Fix: Detección de Agentes Personalizados en Sistema de Delegación

**Fecha:** 27 de octubre de 2025  
**Estado:** ✅ IMPLEMENTADO

---

## 🎯 Problema Identificado

Cleo en el chat global **NO estaba detectando agentes personalizados** creados por los usuarios. Solo reconocía agentes predefinidos (Ami, Apu, Peter, Emma, etc.).

### Causa Raíz

El sistema de delegación tenía **3 capas desconectadas**:

1. **Intent Heuristics** (`intent-heuristics.ts`) → Analizaba keywords ✅
2. **Prompt Builder** (`prompt.ts`) → **NO informaba al LLM sobre agentes personalizados** ❌
3. **Tool Registry** (`tools/index.ts`) → Creaba herramientas dinámicas ✅

**Resultado:** El LLM tenía las herramientas de delegación disponibles, pero **nunca supo que existían** porque no se mencionaban en el system prompt.

---

## ✅ Solución Implementada

### **Cambio 1: Nueva Función `buildAvailableAgentsSection()` en `lib/chat/prompt.ts`**

```typescript
/**
 * Build dynamic agent availability section for system prompt
 * Lists all available specialist agents with their descriptions and delegation tools
 */
async function buildAvailableAgentsSection(userId?: string): Promise<string> {
  try {
    const { agentLoader } = await import('@/lib/agents/agent-loader')
    const agents = await agentLoader.loadAgents({ userId })
    
    // Filter out supervisor and group by type
    const specialists = agents.filter(a => a.role !== 'supervisor')
    
    if (specialists.length === 0) return ''
    
    const lines: string[] = ['\n\n## AVAILABLE SPECIALIST AGENTS']
    lines.push('You have access to the following delegation tools:\n')
    
    // Separate predefined and custom agents for better organization
    const predefined = specialists.filter(a => ['ami-creative', 'peter-google', 'apu-support', 'emma-ecommerce', 'toby-technical', 'astra-email', 'nora-community', 'iris-insights', 'notion-agent'].includes(a.id))
    const custom = specialists.filter(a => !predefined.includes(a))
    
    // List predefined agents first
    for (const agent of predefined) {
      const toolName = `delegate_to_${agent.id.replace(/[^a-zA-Z0-9]/g, '_')}`
      const desc = agent.description || 'Specialist agent'
      lines.push(`**${agent.name}** (${toolName})`)
      lines.push(`  → ${desc}`)
      if (agent.isSubAgent && agent.parentAgentId) {
        lines.push(`  → Type: Sub-agent`)
      }
      lines.push('')
    }
    
    // List custom user agents
    if (custom.length > 0) {
      lines.push('**YOUR CUSTOM AGENTS:**')
      for (const agent of custom) {
        const toolName = `delegate_to_${agent.id.replace(/[^a-zA-Z0-9]/g, '_')}`
        const desc = agent.description || 'Custom specialist agent'
        const tags = agent.tags?.length ? ` [${agent.tags.join(', ')}]` : ''
        lines.push(`**${agent.name}** (${toolName})${tags}`)
        lines.push(`  → ${desc}`)
        if (agent.isSubAgent && agent.parentAgentId) {
          lines.push(`  → Type: Sub-agent`)
        }
        lines.push('')
      }
    }
    
    lines.push('**DELEGATION GUIDELINES:**')
    lines.push('✓ Delegate when task clearly matches an agent\'s expertise')
    lines.push('✓ Delegate for specialized tools or domain knowledge')
    lines.push('✓ Use the exact tool name shown above (e.g., delegate_to_ami_creative)')
    lines.push('✗ For general queries, respond directly without delegation')
    
    return lines.join('\n')
  } catch (error) {
    console.warn('[PROMPT] Failed to build agents section:', error)
    return ''
  }
}
```

**Beneficios:**
- Lista **todos** los agentes (predefinidos + personalizados)
- Muestra nombre, herramienta, descripción y tags
- Separa agentes predefinidos de los personalizados del usuario
- Incluye guidelines claras de cuándo delegar

---

### **Cambio 2: Integración en `buildFinalSystemPrompt()`**

```typescript
// Build dynamic list of available agents (predefined + user custom)
const agentsSection = await buildAvailableAgentsSection(realUserId || undefined)

const finalSystemPrompt = ragSystemAddon
  ? `${CLEO_IDENTITY_HEADER}\n\n${userProfileBlock ? userProfileBlock + '\n\n' : ''}${ragSystemPromptIntro(ragSystemAddon)}\n\n${personaPrompt}\n\n${AGENT_WORKFLOW_DIRECTIVE}\n\n${CONTEXT_AND_DOC_RULES}${searchGuidance}\n\n${selectedBasePrompt}${internalHint}${agentsSection}`
  : `${CLEO_IDENTITY_HEADER}\n\n${userProfileBlock ? userProfileBlock + '\n\n' : ''}${personaPrompt}\n\n${AGENT_WORKFLOW_DIRECTIVE}\n\n${CONTEXT_AND_DOC_RULES}${searchGuidance}\n\n${selectedBasePrompt}${internalHint}${agentsSection}`
```

**Cambio clave:** Se agregó `${agentsSection}` al final del prompt para que el LLM reciba la lista completa de agentes.

---

### **Cambio 3: Carga Anticipada de Agentes en `app/api/chat/route.ts`**

**ANTES:** Los agentes se cargaban tarde, después de construir el prompt.

**AHORA:** Los agentes se cargan **ANTES** cuando se detectan keywords de delegación:

```typescript
// EARLY AGENT LOADING: Load agents BEFORE intent scoring so keywords are enriched
const { agentLoader } = await import('@/lib/agents/agent-loader')
availableAgents = await agentLoader.loadAgents({ userId: realUserId })

// Enrich intent heuristics with user's custom agents
const { enrichKeywordsWithAgents } = await import('@/lib/delegation/intent-heuristics')
enrichKeywordsWithAgents(availableAgents.map(a => ({
  id: a.id,
  name: a.name,
  tags: a.tags,
  description: a.description
})))

console.log(`[ChatAPI] 🔄 Loaded ${availableAgents.length} agents and enriched keywords BEFORE intent scoring`)
```

**Flujo optimizado:**
1. ✅ Detectar keywords de delegación
2. ✅ Cargar agentes del usuario
3. ✅ Enriquecer diccionario de keywords
4. ✅ Construir prompt con lista de agentes
5. ✅ Crear herramientas de delegación

---

### **Cambio 4: Optimización - Reutilización de Agentes Cargados**

Para evitar múltiples llamadas a la base de datos, los agentes cargados se reutilizan:

```typescript
// If agents were already loaded, reuse them; otherwise load now
if (availableAgents.length === 0) {
  const { agentLoader } = await import('@/lib/agents/agent-loader')
  availableAgents = await agentLoader.loadAgents({ userId: realUserId })
  console.log(`[ChatAPI] 🔄 Late-loading ${availableAgents.length} agents for tools`)
}
```

---

### **Cambio 5: Fix de Next.js 15 en `app/page.tsx`**

Se corrigió el error de `searchParams` que causaba el bug de redirección:

```typescript
export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // Await searchParams as required by Next.js 15
  const params = searchParams ? await searchParams : {}
  
  // ... resto del código usa `params` en lugar de `searchParams`
```

---

## 📊 Ejemplo de Uso

### **Antes (Sistema Roto):**
```
User: "Delega esta tarea a mi agente MarketingBot"
Cleo: "No encuentro ese agente. ¿Te refieres a Ami o Apu?"
```

### **Después (Sistema Arreglado):**
```
User: "Delega esta tarea a mi agente MarketingBot"

System Prompt (interno que recibe el LLM):
## AVAILABLE SPECIALIST AGENTS

**Ami** (delegate_to_ami_creative)
  → Administración general, email, calendarios

**YOUR CUSTOM AGENTS:**
**MarketingBot** (delegate_to_marketingbot_uuid) [marketing, social media]
  → Especialista en campañas de marketing digital

Cleo: "¡Claro! Delegando a MarketingBot..."
[✅ Llama a delegate_to_marketingbot_uuid con éxito]
```

---

## 🎯 Límites del Sistema

Para el modelo freemium:
- **Máximo 8 agentes personalizados** por usuario
- **Máximo 3 sub-agentes** por usuario
- Total: **11 agentes personalizados + 9 predefinidos = 20 agentes máximo**

Esto mantiene el prompt compacto y eficiente.

---

## ✅ Verificación de la Implementación

### Archivos Modificados:
1. ✅ `lib/chat/prompt.ts` - Nueva función `buildAvailableAgentsSection()`
2. ✅ `lib/chat/prompt.ts` - Integración en `buildFinalSystemPrompt()`
3. ✅ `app/api/chat/route.ts` - Carga anticipada de agentes
4. ✅ `app/api/chat/route.ts` - Optimización de reutilización
5. ✅ `app/page.tsx` - Fix de Next.js 15 searchParams

### Testing Recomendado:
1. Crear un agente personalizado en `/agents`
2. En el chat global, escribir: "Delega esta tarea a [NombreAgente]"
3. Verificar que Cleo:
   - Reconoce el agente personalizado
   - Llama a la herramienta correcta
   - Ejecuta la delegación con éxito

---

## 🚀 Próximos Pasos

1. **Testing en Producción:**
   - Verificar con usuarios reales que crean agentes personalizados
   - Monitorear logs de delegación (`[ChatAPI]` y `[PROMPT]`)

2. **Optimizaciones Futuras:**
   - Agregar caché de 5 min para la sección de agentes (reducir latencia)
   - Implementar filtrado inteligente si el usuario tiene >20 agentes (modelo premium)
   - Mejorar keywords automáticos basados en descripciones de agentes

3. **Documentación:**
   - Actualizar guía de usuario sobre cómo crear agentes detectables
   - Agregar ejemplos de buenas descripciones y tags

---

## 📝 Notas Técnicas

- **Sincronización:** Las 3 capas (intent, prompt, tools) ahora están sincronizadas
- **Performance:** Solo se cargan agentes cuando hay keywords de delegación (optimización)
- **Escalabilidad:** Funciona para 1 o 1000+ agentes (con caché apropiado)
- **Seguridad:** Solo muestra agentes del usuario autenticado (respeta `userId`)

---

**Implementado por:** GitHub Copilot  
**Aprobado por:** Luis Nayib Santana  
**Fecha de Implementación:** 27 de octubre de 2025
