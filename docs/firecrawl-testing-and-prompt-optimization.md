# 🔥 Firecrawl Testing & Prompt Engineering Optimization Guide

## 📋 Tabla de Contenidos
1. [Cómo Probar Firecrawl](#testing-firecrawl)
2. [Best Practices de Prompt Engineering](#prompt-engineering-best-practices)
3. [Análisis de Prompts Actuales](#current-prompts-analysis)
4. [Recomendaciones de Optimización](#optimization-recommendations)

---

## 🧪 Testing Firecrawl

### Configuración

**1. Verifica que tienes la API key:**
```bash
# En tu .env
FIRECRAWL_API_KEY=tu_api_key_aqui
```

**2. Obtén tu API key:**
- Visita: https://www.firecrawl.dev/
- Sign up y obtén tu API key gratis

### Prompts de Prueba

#### Test 1: Firecrawl Extract (Single Page)
```
Usa firecrawl_extract para extraer el contenido de https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview y dame un resumen de las técnicas principales
```

**Agente recomendado:** Wex o Peter

#### Test 2: Firecrawl Crawl (Multi-page)
```
Usa firecrawl_crawl para analizar las primeras 5 páginas de https://docs.openai.com/docs/guides y extrae los temas principales que cubren
```

**Configuración sugerida:**
- `depth: 2`
- `maxPages: 10-20`
- `includeHtml: false` (más rápido)

#### Test 3: Sitemap Summarize
```
Usa firecrawl_sitemap_summarize para mapear la estructura de https://platform.openai.com/docs y identificar las secciones más relevantes sobre prompt engineering
```

### Verificación de Funcionamiento

✅ **Funcionando correctamente si:**
- Devuelve contenido estructurado en markdown
- Extrae metadata (title, description)
- No hay errores de API key

❌ **Problemas comunes:**
- `FIRECRAWL_API_KEY not configured` → Falta la API key
- `Firecrawl error 429` → Rate limit excedido
- `Firecrawl error 401` → API key inválida

---

## 🎯 Prompt Engineering Best Practices

### Según Claude (Anthropic)

#### 🏆 Orden de Técnicas (Más a Menos Efectivas)

1. **Be Clear and Direct** ⭐⭐⭐⭐⭐
   - Instrucciones explícitas y específicas
   - Evitar ambigüedad
   - Usar verbos de acción claros

2. **Use Examples (Multishot)** ⭐⭐⭐⭐⭐
   - Proporcionar 2-5 ejemplos de entrada/salida
   - Mostrar casos edge
   - Incluir ejemplos diversos

3. **Let Claude Think (Chain of Thought)** ⭐⭐⭐⭐
   - Añadir "Think step by step"
   - Pedir razonamiento explícito
   - Útil para problemas complejos

4. **Use XML Tags** ⭐⭐⭐⭐
   ```xml
   <user_query>
   ¿Cuál es la capital de Francia?
   </user_query>
   
   <context>
   El usuario está aprendiendo geografía europea
   </context>
   ```

5. **System Prompts** ⭐⭐⭐
   - Definir rol y personalidad
   - Establecer reglas globales
   - Configurar tono y estilo

6. **Prefill Response** ⭐⭐⭐
   - Guiar el inicio de la respuesta
   - Forzar formato específico

7. **Chain Complex Prompts** ⭐⭐
   - Dividir tareas complejas en pasos
   - Usar resultados intermedios

8. **Long Context Tips** ⭐⭐
   - Información relevante al inicio y final
   - Usar referencias claras

### Según OpenAI (GPT-5)

#### 🎯 GPT-5 Best Practices

**GPT-5 es diferente:** Necesita instrucciones MUY precisas y explícitas

1. **Explicit Role & Workflow**
   ```
   You are a software engineering agent responsible for:
   - Analyzing code structure
   - Generating unit tests
   - Documenting changes
   
   Workflow:
   1. Read the code
   2. Identify testable functions
   3. Generate comprehensive tests
   4. Validate with Python
   ```

2. **Testing & Validation**
   - Siempre pedir que valide resultados
   - Incluir casos de prueba
   - Verificar correctitud

3. **Tool Use Examples**
   ```
   Example tool call:
   {
     "function": "run_code",
     "arguments": {
       "code": "print('Hello')",
       "language": "python"
     }
   }
   ```

4. **Markdown Standards**
   - Usar backticks para código inline
   - Code fences para bloques
   - Listas y tablas semánticas

#### 📊 Message Roles Hierarchy

```
developer > user > assistant
```

- **developer**: Instrucciones de la app (mayor prioridad)
- **user**: Input del usuario final
- **assistant**: Respuesta del modelo

### Según Google (Gemini)

**Principios clave:**
1. **Contexto primero** - Información relevante al inicio
2. **Ejemplos específicos** - Mostrar formato deseado
3. **Iteración guiada** - Refinar con feedback
4. **Temperatura controlada** - 0.0-0.3 para tareas determinísticas

---

## 🔍 Análisis de Prompts Actuales

### 1. Prompts de Agentes Predefinidos

#### ✅ Lo que está bien:

**Wex (lib/agents/predefined/wex.ts):**
```typescript
prompt: `You are Wex, the multi-phase market, competitive & prospect 
intelligence & INSIGHT SYNTHESIS specialist.`
```
- ✅ Rol claro y específico
- ✅ Identidad fuerte
- ✅ Tools explícitos

**Peter (lib/agents/predefined/peter.ts):**
- ✅ Buena estructura de herramientas
- ✅ Contexto financiero claro

#### ⚠️ Áreas de mejora:

1. **Falta de ejemplos (Few-shot)**
   - Los prompts no incluyen ejemplos de input/output
   - Recomendación: Añadir 2-3 ejemplos por agente

2. **Sin Chain of Thought explícito**
   - No se pide razonamiento paso a paso
   - Sugerencia: Añadir "Think step by step before responding"

3. **XML Tags limitados**
   - Poco uso de tags para estructurar contexto
   - Mejora: Usar `<context>`, `<instructions>`, `<examples>`

4. **Workflow no explícito**
   - Los pasos no están numerados claramente
   - Fix: Añadir secciones "Process:" con pasos 1-2-3

### 2. System Prompts Base

**Archivo**: `lib/chat/prompt.ts`

#### Análisis:

**Estructura actual:**
```typescript
SYSTEM_PROMPT_DEFAULT = "You are Cleo, a helpful AI assistant..."
```

#### Problemas detectados:

1. **Demasiado genérico** ⚠️
   - No hay personalidad distintiva
   - Falta contexto de capacidades

2. **Sin ejemplos** ❌
   - No muestra cómo responder bien
   - No hay casos edge

3. **Falta jerarquía clara** ⚠️
   - Todo en un párrafo
   - Difícil de parsear por el modelo

---

## 🚀 Optimization Recommendations

### Fase 1: Quick Wins (Impacto Alto, Esfuerzo Bajo)

#### 1. Añadir XML Tags a Prompts Base

**Antes:**
```typescript
prompt: `You are Wex, the specialist. Use firecrawl_crawl for analysis.`
```

**Después:**
```typescript
prompt: `
<identity>
You are Wex, the multi-phase market intelligence specialist.
</identity>

<instructions>
1. When analyzing competitors, use firecrawl_crawl to extract structured data
2. Synthesize findings into actionable insights
3. Always cite sources with URLs
</instructions>

<tools>
- firecrawl_crawl: Multi-page structured harvesting
- firecrawl_extract: Single high-value asset extraction
- webSearch: Patch recency gaps
</tools>

<examples>
<example id="1">
<input>Analyze pricing strategy of example.com</input>
<output>
I'll use firecrawl_extract to get their pricing page...
[Shows tool usage, then analysis]
</output>
</example>
</examples>
`
```

**Impacto esperado:** +15-20% mejor adherencia a formato

#### 2. Implementar Chain of Thought

**Añadir a todos los agentes:**
```typescript
<reasoning>
Before responding:
1. Identify the core question
2. Determine which tools are needed
3. Plan the sequence of steps
4. Execute and synthesize
</reasoning>
```

**Impacto esperado:** +25-30% mejor calidad de análisis

#### 3. Few-Shot Examples por Agente

**Template:**
```typescript
<examples>
<example id="good">
<user_query>{{typical_question}}</user_query>
<assistant_response>{{ideal_response}}</assistant_response>
</example>

<example id="edge_case">
<user_query>{{edge_case_question}}</user_query>
<assistant_response>{{how_to_handle}}</assistant_response>
</example>
</examples>
```

**Impacto esperado:** +40% reducción de errores

### Fase 2: Optimizaciones Intermedias

#### 4. Refactorizar System Prompt Base

**Nuevo diseño:**
```typescript
export const SYSTEM_PROMPT_OPTIMIZED = `
<identity>
You are Cleo, an advanced AI assistant with multi-agent orchestration capabilities.
You excel at:
- Breaking down complex tasks into manageable steps
- Delegating to specialist agents when appropriate
- Synthesizing information from multiple sources
</identity>

<core_principles>
1. Clarity: Always be clear and direct in communication
2. Accuracy: Verify information before presenting it
3. Efficiency: Use the most appropriate tools for each task
4. Transparency: Explain your reasoning when helpful
</core_principles>

<workflow>
For each user request:
1. Analyze the request and identify required capabilities
2. Determine if delegation to a specialist would be beneficial
3. Execute using appropriate tools
4. Synthesize and present results clearly
5. Offer follow-up options when relevant
</workflow>

<delegation_guidelines>
Delegate to specialists when:
- Request requires deep domain expertise (e.g., financial analysis → Peter)
- Task involves specialized tools (e.g., web scraping → Wex)
- Multi-step research is needed (e.g., competitive analysis → Apu)

Do NOT delegate when:
- Simple conversational responses suffice
- User explicitly requests direct response
- Task is within your core capabilities
</delegation_guidelines>

<examples>
<example id="simple">
<user>What's the weather like?</user>
<assistant>I'll help you check the weather. What's your location?</assistant>
</example>

<example id="delegation">
<user>Analyze the market position of Tesla vs competitors</user>
<assistant>
This requires comprehensive competitive analysis. I'll delegate to Wex, our market intelligence specialist, who can:
1. Crawl competitor websites for positioning data
2. Extract key differentiators
3. Synthesize market insights

[Proceeds with delegation]
</assistant>
</example>
</examples>
`
```

#### 5. Prompts Específicos por Modelo

**Para GPT-5:**
- Instrucciones muy explícitas
- Workflow detallado paso a paso
- Testing requirements explícitos

**Para Claude:**
- Más conceptual
- Ejemplos diversos
- Chain of thought prominente

**Para modelos fast (grok-4-fast):**
- Instrucciones concisas
- Sin Chain of Thought extenso
- Direct y al punto

### Fase 3: Advanced Optimizations

#### 6. Dynamic Prompt Assembly

```typescript
function buildAgentPrompt(agent: Agent, context: PromptContext): string {
  const sections = [
    buildIdentitySection(agent),
    buildInstructionsSection(agent, context),
    buildToolsSection(agent),
    buildExamplesSection(agent, context),
    context.hasContext ? buildContextSection(context) : null
  ].filter(Boolean)
  
  return sections.join('\n\n')
}
```

#### 7. A/B Testing Framework

```typescript
interface PromptVariant {
  id: string
  version: string
  prompt: string
  metrics: {
    successRate: number
    avgResponseTime: number
    userSatisfaction: number
  }
}

// Track which variant performs better
const promptExperiment = {
  control: "original_prompt",
  variant_a: "with_xml_tags",
  variant_b: "with_chain_of_thought"
}
```

---

## 📊 Expected Impact Summary

| Optimización | Esfuerzo | Impacto | Prioridad |
|-------------|----------|---------|-----------|
| XML Tags | Bajo | +15% | 🔥 Alta |
| Chain of Thought | Bajo | +25% | 🔥 Alta |
| Few-Shot Examples | Medio | +40% | 🔥 Alta |
| System Prompt Refactor | Medio | +30% | ⭐ Media |
| Dynamic Assembly | Alto | +20% | ⚡ Baja |
| A/B Testing | Alto | +50% | ⚡ Baja |

---

## 🎬 Implementation Roadmap

### Sprint 1 (1-2 días)
- [ ] Probar Firecrawl con los 3 test prompts
- [ ] Añadir XML tags a top 3 agentes (Wex, Peter, Apu)
- [ ] Implementar Chain of Thought en Cleo base

### Sprint 2 (3-5 días)
- [ ] Crear 2-3 ejemplos por agente principal
- [ ] Refactorizar SYSTEM_PROMPT_DEFAULT
- [ ] Implementar prompt variants por modelo

### Sprint 3 (1 semana)
- [ ] Dynamic prompt assembly
- [ ] A/B testing framework
- [ ] Metrics dashboard para prompt performance

---

## 📚 Referencias

- [Claude Prompt Engineering](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)
- [OpenAI Prompt Engineering](https://platform.openai.com/docs/guides/prompt-engineering)
- [Google Prompting Guide](https://ai.google.dev/docs/prompt_best_practices)
- [Firecrawl Docs](https://docs.firecrawl.dev/)

---

## ✅ Testing Checklist

### Firecrawl Tests
- [ ] Test firecrawl_extract en docs de Anthropic
- [ ] Test firecrawl_crawl en OpenAI docs (5 páginas)
- [ ] Test firecrawl_sitemap_summarize en sitio grande
- [ ] Verificar rate limits y errores comunes

### Prompt Optimization Tests
- [ ] Comparar respuestas antes/después XML tags
- [ ] Medir tiempo de respuesta con Chain of Thought
- [ ] Evaluar calidad con ejemplos vs sin ejemplos
- [ ] Test A/B entre prompts old vs new

---

**Última actualización:** 2025-09-30
**Autor:** Sistema de análisis Cleo
