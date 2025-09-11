# 🧪 Test Suite - Sistema de Agentes Optimizado

## 🎯 Estrategia de Testing

Estos prompts están diseñados para validar la **optimización del sistema de agentes** y verificar que la delegación, especialización y eliminación de redundancias funcionen correctamente.

## 📋 Test Categories

### 1. **Delegation Flow Tests**
### 2. **Agent Specialization Tests**  
### 3. **Tool Optimization Tests**
### 4. **Sub-Agent Integration Tests**
### 5. **Performance & Latency Tests**

---

## 🔄 1. DELEGATION FLOW TESTS

### Test 1.1: Basic Delegation Routing
```
"Necesito programar una reunión para mañana y enviar un email de confirmación a los participantes"
```
**Expected**: Cleo → Ami (calendario) → Astra (email)

### Test 1.2: Complex Multi-Domain Task  
```
"Crear un análisis de mercado sobre competidores de e-commerce, ponerlo en un Google Doc y organizarlo en Notion"
```
**Expected**: Cleo → Apu (research) → Peter (doc) → Notion Agent (organize)

### Test 1.3: Complexity Scorer Decision
```
"Hola, ¿qué hora es?"
```
**Expected**: Direct response (no delegation)

### Test 1.4: Research Consolidation
```
"Buscar noticias sobre IA en los últimos 7 días y encontrar restaurantes cerca de Madrid"
```
**Expected**: Cleo → Apu (consolidated SerpAPI)

---

## 🎯 2. AGENT SPECIALIZATION TESTS

### Test 2.1: AMI Administrative Focus
```
"Revisar mis emails de hoy, organizar mi calendario de la semana y coordinar una reunión con el equipo"
```
**Expected**: Ami handles triage/coordination, delegates email writing to Astra

### Test 2.2: APU Research Consolidation
```
"Investigar sobre el mercado de criptomonedas, buscar noticias académicas sobre blockchain y encontrar cafeterías en Barcelona"
```
**Expected**: Apu handles all research (SerpAPI consolidated)

### Test 2.3: Peter Creation Focus
```
"Crear una presentación sobre ventas Q3, un spreadsheet con datos financieros y un documento de proyecto"
```
**Expected**: Peter handles ALL creation tasks

### Test 2.4: Emma E-commerce Specialization
```
"Analizar mis productos de Shopify, ajustar precios y revisar métricas de ventas del mes"
```
**Expected**: Emma handles completely (no delegation needed)

---

## 🛠️ 3. TOOL OPTIMIZATION TESTS

### Test 3.1: AMI Tool Reduction Validation
```
"Crear una página en Notion con información de la reunión"
```
**Expected**: Ami → Notion Agent (Ami no longer has Notion tools)

### Test 3.2: SerpAPI Consolidation
```
"Buscar información sobre startups de IA y noticias tecnológicas recientes"
```
**Expected**: Apu handles (SerpAPI removed from Ami)

### Test 3.3: Gmail Delegation
```
"Enviar un email profesional a mi cliente explicando el retraso del proyecto"
```
**Expected**: Ami → Astra (Gmail send removed from Ami)

### Test 3.4: Toby Elimination Validation
```
"Hacer un análisis técnico de APIs de pagos y calcular ROI de la implementación"
```
**Expected**: Apu handles (Toby eliminated, functionality in Apu)

---

## 🎭 4. SUB-AGENT INTEGRATION TESTS

### Test 4.1: Astra Email Specialist
```
"Redactar y enviar un email de seguimiento a un prospecto, con tono profesional pero cercano"
```
**Expected**: 
1. Ami receives request
2. Delegates to Astra
3. Astra drafts professional email
4. Asks for confirmation
5. Sends after approval
6. Ami synthesizes result

### Test 4.2: Notion Agent Workspace Management
```
"Organizar mi research sobre competidores en una base de datos de Notion con tags y categorías"
```
**Expected**:
1. Ami receives request  
2. Delegates to Notion Agent
3. Notion Agent creates structured database
4. Ami reviews and completes

### Test 4.3: Sub-Agent Error Handling
```
"Enviar email sin especificar destinatario ni contenido"
```
**Expected**: Astra should ask for clarification before proceeding

### Test 4.4: Parent-Child Coordination
```
"Necesito enviar invitaciones por email para una reunión que voy a programar"
```
**Expected**: Ami coordinates calendar + email (via Astra) in logical sequence

---

## ⚡ 5. PERFORMANCE & LATENCY TESTS

### Test 5.1: Simple Query Speed
```
"¿Cuál es el clima hoy?"
```
**Expected**: Fast direct response (no unnecessary delegation)

### Test 5.2: Specialized Tool Access
```
"Obtener precios de Bitcoin y Ethereum actuales"
```
**Expected**: Quick routing to Apu (market tools consolidated)

### Test 5.3: Tool Decision Speed
```
"Crear un documento con mis notas de la reunión"
```
**Expected**: Fast routing to Peter (clear specialization)

### Test 5.4: Complex Task Efficiency
```
"Investigar 3 herramientas de CRM, crear comparación en spreadsheet, enviarlo por email al equipo y guardarlo en Notion"
```
**Expected**: Efficient multi-agent coordination without overlap

---

## 🚨 6. REGRESSION TESTS

### Test 6.1: Verify No Tool Loss
```
"Actualizar precios en Shopify de productos con bajo stock"
```
**Expected**: Emma still has full Shopify capabilities

### Test 6.2: Verify Delegation Tools Work
```
"Necesito ayuda con una tarea compleja que involucra varios sistemas"
```
**Expected**: Cleo's delegation tools function correctly

### Test 6.3: Verify Sub-Agent Independence
```
"Solo enviar un email rápido sin más contexto"
```
**Expected**: Can access Astra directly if routed properly

---

## 🔍 7. EDGE CASE TESTS

### Test 7.1: Conflicting Domain Requests
```
"Buscar información sobre Shopify (la empresa) para un análisis de mercado"
```
**Expected**: Should go to Apu (research) not Emma (Shopify tools)

### Test 7.2: Agent Capability Boundaries
```
"Leer un Google Doc que creé ayer"
```
**Expected**: Should clarify if reading needed or delegate appropriately

### Test 7.3: Sub-Agent Direct Access
```
"Astra, envía un email a juan@ejemplo.com con asunto 'Test'"
```
**Expected**: Test if sub-agents can be accessed directly

---

## 📊 SUCCESS CRITERIA

### ✅ Delegation Flow
- [ ] Queries route to correct primary agent
- [ ] Sub-agents receive appropriate delegations
- [ ] No tool overlap or conflicts
- [ ] Clear parent-child coordination

### ✅ Tool Optimization  
- [ ] AMI uses max 11 tools (not 25+)
- [ ] Apu consolidates all SerpAPI
- [ ] Peter focuses on creation only
- [ ] Toby functionality absorbed by Apu

### ✅ Specialization
- [ ] Each agent handles domain correctly
- [ ] No capability gaps from optimizations
- [ ] Sub-agents add value over parent agents
- [ ] Performance improvement vs previous system

### ✅ User Experience
- [ ] Faster response times for simple queries
- [ ] More accurate responses for complex tasks  
- [ ] Intuitive agent selection
- [ ] Seamless sub-agent integration

---

## 🎯 QUICK TEST COMMANDS

### Fast Validation Set (5 tests)
```bash
1. "Hola" # Direct response test
2. "Enviar email profesional" # Astra delegation
3. "Buscar noticias de tech" # Apu consolidation  
4. "Crear un Google Doc" # Peter specialization
5. "Organizar en Notion" # Notion Agent delegation
```

### Comprehensive Test Set (15 tests)
Use all tests from sections 1-4 for complete validation.

### Performance Benchmark Set (10 tests)
Focus on section 5 tests with timing measurements.

**🚀 Ready to validate the optimized agent system!**
