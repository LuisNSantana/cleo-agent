# Apu — Agente de Investigación Web e Inteligencia (SerpAPI + WebSearch)

## 🧭 Resumen
Apu es el especialista en investigación web de Cleo. Combina motores verticales de Google vía SerpAPI (News, Scholar, Autocomplete, Maps/Location) con búsqueda web general para producir informes precisos, actuales y accionables.

- ID: `apu-research`
- Rol: Specialist (research/intelligence)
- Modelo: `gpt-4o-mini`
- Temperatura: `0.3`
- MaxTokens: `6144`
- Avatar: `/img/agents/apu4.png`

---

## 🎯 Enfoque y fortalezas
- Inteligencia web multi‑fuente con síntesis estructurada
- Monitoreo de noticias y tendencias recientes (mercado/empresas)
- Descubrimiento académico (Scholar) y extracción de citas
- Inteligencia competitiva y de mercado (empresas, productos, señales)
- Búsquedas geolocalizadas y de negocios (Location/Maps)
- Reformulación/expansión de consultas (Autocomplete)

Ventajas clave:
- Cobertura amplia (Google verticales + web general)
- Bias a fuentes confiables y recientes
- Resúmenes orientados a decisiones, con evidencia citada
- Flujo paralelo de sub‑consultas para velocidad y profundidad

---

## 🛠️ Herramientas disponibles
Apu expone un conjunto de tools optimizadas para investigación. Todas se orquestan en bucle de herramientas (tool loop) hasta completar la síntesis y llamar a `complete_task`.

- `serpGeneralSearch`
  - Búsqueda general en Google (SerpAPI)
  - Uso típico: background/contexto, páginas clave, documentación
- `serpNewsSearch`
  - Noticias recientes/por fecha (SerpAPI News)
  - Uso típico: eventos, earnings, regulaciones, anuncios, impacto
- `serpScholarSearch`
  - Investigación académica (Google Scholar vía SerpAPI)
  - Uso típico: papers, métodos, literatura, citas
- `serpAutocomplete`
  - Expansión y desambiguación de consultas (sugerencias)
  - Uso típico: generar variantes relevantes y cubrir ángulos
- `serpLocationSearch`
  - Búsquedas con contexto geográfico/negocios (Maps/Places)
  - Uso típico: competidores locales, tiendas, puntos de interés
- `serpRaw`
  - Acceso directo a respuestas crudas de SerpAPI
  - Uso típico: inspección avanzada, depuración o datos sin procesar
- `webSearch`
  - Buscador general complementario (p. ej. Tavily)
  - Uso típico: ampliar cobertura fuera de Google verticales
- `complete_task`
  - Cierra el ciclo con la síntesis final y retorna a Cleo

---

## 🧪 Flujo de trabajo (playbook)
1. Clarificar intención si es vago (solo cuando sea necesario y rápido)
2. Planificar sub‑consultas paralelas por canal: News / Background / Scholar / Location
3. Priorizar verticales especializados (News/Scholar/Location) y luego `webSearch` como refuerzo
4. Clusterizar hallazgos por tema (hechos, entidades, tendencias, riesgos)
5. Evaluar frescura y confiabilidad; deduplicar resultados
6. Citar fuentes (título breve + dominio raíz). Nunca inventar citas
7. Preparar salida estructurada y llamar `complete_task`

Estructura de salida recomendada:
- Resumen (2–4 frases)
- Hallazgos clave (bullets)
- Evidencia (fuente: insight)
- Riesgos/Incógnitas
- Próximas búsquedas sugeridas

---

## 🔄 Integración con el Supervisor (handoff)
Apu se activa por delegación inteligente desde Cleo usando el patrón Command (LangGraph Supervisor):

```json
{
  "command": "HANDOFF_TO_AGENT",
  "target_agent": "apu-research",
  "task_description": "Investigar información actualizada sobre Tesla stock (precio, tendencias, noticias)",
  "handoff_message": "Transferring to Apu (Research & Intelligence Specialist)",
  "delegation_complete": true
}
```

El Graph Builder detecta el comando `HANDOFF_TO_AGENT`, construye el contexto de tarea y ejecuta a Apu con su propio loop de herramientas hasta obtener una respuesta final, que regresa a Cleo para su entrega al usuario.

Notas importantes del handoff:
- Apu recibe un mensaje de tarea enfocado (HumanMessage) con el contexto de delegación
- Puede encadenar múltiples tools y rondas (máx. 10) según complejidad
- Al finalizar, retorna contenido listo para usuario + metadatos de delegación

---

## ⏱️ Rendimiento y tolerancia a fallos
- Timeouts adaptativos: Apu dispone de 180s (investigación compleja); otros agentes 90s
- Si ocurre timeout y hay resultados parciales (tools ejecutadas), se guardan y devuelven con marca `partial`
- Degradación elegante ante límites de APIs (retry moderado, guía al usuario)
- Deduplicación de resultados para evitar ruido

---

## ✅ Buenas prácticas y políticas
- Preferir consultas precisas (añadir periodo, región, entidad, tipo)
- Scholar solo para temas académicos/metodológicos
- Citar siempre; si falta evidencia, declararlo y proponer siguiente búsqueda
- Evitar sobrecarga de excerpts; priorizar síntesis + enlaces
- Indicar frescura y posibles sesgos de cada fuente

---

## 📚 Ejemplos de uso
1) Mercado/acciones:
- "Investiga Tesla (TSLA): precio actual, rendimiento 30 días, noticias que impactaron el precio"
- Herramientas: `serpNewsSearch` + `webSearch` + (opcional) `serpGeneralSearch`

2) Inteligencia competitiva:
- "Mapea competidores directos de X en Ciudad Y y principales diferenciadores"
- Herramientas: `serpLocationSearch` + `webSearch`

3) Investigación académica:
- "Encuentra papers recientes sobre RAG híbrido en ecommerce y resume enfoques"
- Herramientas: `serpScholarSearch` + `serpGeneralSearch`

4) Descubrimiento de señales:
- "Qué tendencias recientes afectan la demanda de scooters eléctricos en LATAM"
- Herramientas: `serpNewsSearch` + `serpAutocomplete` + `webSearch`

---

## 🔧 Configuración (referencia)
Extracto de `lib/agents/config.ts`:

```ts
export const APU_AGENT = {
  id: 'apu-research',
  name: 'Apu',
  model: 'gpt-4o-mini',
  temperature: 0.3,
  maxTokens: 6144,
  tools: [
    'serpGeneralSearch', 'serpNewsSearch', 'serpScholarSearch',
    'serpAutocomplete', 'serpLocationSearch', 'serpRaw',
    'webSearch', 'complete_task'
  ],
  prompt: `You are Apu, the research and web intelligence specialist...`
}
```

---

## 🧩 UX y trazabilidad
- La UI muestra chips de tools usadas y el avatar de Apu durante la investigación
- En delegaciones, los mensajes finales incluyen metadatos `sender: apu-research`
- Los resultados citan fuentes con títulos concisos y dominios raíz

---

## 🏁 Resumen ejecutivo
Apu aporta una investigación multi‑fuente confiable y accionable, con síntesis clara y evidencia trazable. Su integración via handoff inteligente permite que Cleo coordine tareas complejas con calidad de especialista y excelente experiencia de usuario.
