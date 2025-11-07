# Google Docs API - Guía de Mejores Prácticas

## Resumen del Problema Anterior

### ❌ Qué estaba mal:
- Se insertaba texto plano sin estructura de párrafos
- No se usaban saltos de línea (`\n`) para separar párrafos
- Los formatos se aplicaban incorrectamente causando texto corrupto
- No se respetaban las reglas de indexación de Google Docs

### ✅ Qué se arregló:
1. **Nueva herramienta estructurada**: `createStructuredGoogleDoc`
2. **Parser de markdown**: Convierte markdown a formato Google Docs nativo
3. **Construcción reversa**: Usa el patrón recomendado de Google (insertar en índice 1)
4. **Estilos nativos**: Usa `HEADING_1`, `HEADING_2`, `HEADING_3` en lugar de formateo manual

---

## Herramientas Disponibles

### 1. `createStructuredGoogleDoc` ⭐ RECOMENDADA

**Cuándo usar**: Para crear documentos con estructura (títulos, listas, formato)

**Sintaxis de contenido**:
```markdown
# Título Principal (Heading 1)
Contenido del primer párrafo.

## Sección (Heading 2)
Contenido de la sección.

### Subsección (Heading 3)
Contenido de la subsección.

- Primer elemento de lista
- Segundo elemento de lista
- Tercer elemento de lista

1. Primer elemento numerado
2. Segundo elemento numerado

**Texto en negrita**
*Texto en cursiva*
```

**Ejemplo de uso**:
```typescript
await createStructuredGoogleDoc({
  title: "Segunda Guerra Mundial",
  content: `# Introducción
La Segunda Guerra Mundial (1939-1945) fue el conflicto armado más grande...

## Causas Principales
Las raíces de la Segunda Guerra Mundial se encuentran en las secuelas...

### Tratado de Versalles (1919)
El tratado impuso duras sanciones a Alemania...

- Reparaciones económicas
- Pérdida territorial
- Limitaciones militares`,
  shareSettings: "private"
})
```

### 2. `createGoogleDoc` - Solo para texto simple

**Cuándo usar**: Documentos muy simples sin formato especial

**Limitaciones**:
- No soporta headings
- No soporta listas automáticas
- No soporta texto en negrita/cursiva
- Solo texto plano

### 3. `updateGoogleDoc` - Actualizar documentos existentes

**Modos disponibles**:
- `replace`: Reemplaza todo el contenido
- `append`: Agrega al final
- `prepend`: Agrega al inicio

### 4. Herramientas avanzadas (para formateo fino)

- `formatGoogleDocsText`: Aplica bold, italic, colores, fuentes
- `applyGoogleDocsParagraphStyle`: Headings, alineación, espaciado
- `insertGoogleDocsTable`: Tablas
- `insertGoogleDocsImage`: Imágenes inline
- `createGoogleDocsList`: Listas con viñetas/numeradas

---

## Reglas Importantes de Google Docs API

### 📍 Indexación

1. **Los documentos empiezan en índice 1** (no 0)
2. **Los índices son UTF-16** (emojis cuentan como 2 caracteres: 😄 = `\uD83D\uDE00`)
3. **Cada `\n` crea un nuevo párrafo** automáticamente

### 📝 Inserción de Texto

```typescript
// ✅ CORRECTO: Texto debe estar dentro de un párrafo
{
  insertText: {
    location: { index: 1 }, // Dentro del párrafo inicial
    text: "Mi contenido\n"  // \n crea nuevo párrafo
  }
}

// ❌ INCORRECTO: No puedes insertar en startIndex de una tabla
{
  insertText: {
    location: { index: tableStartIndex }, // ERROR
    text: "Texto"
  }
}
```

### 🎨 Formateo de Texto

```typescript
// ✅ CORRECTO: Aplicar formato a rango específico
{
  updateTextStyle: {
    range: {
      startIndex: 1,
      endIndex: 10  // Solo formatea caracteres 1-9
    },
    textStyle: {
      bold: true,
      fontSize: { magnitude: 14, unit: 'PT' }
    },
    fields: 'bold,fontSize'  // Especifica qué campos cambiar
  }
}

// ❌ INCORRECTO: Formato se hereda si no especificas 'fields'
{
  updateTextStyle: {
    range: { startIndex: 1, endIndex: 10 },
    textStyle: { bold: true }
    // Falta 'fields' - puede heredar estilos no deseados
  }
}
```

### 📄 Estilos de Párrafo

```typescript
// ✅ CORRECTO: Usa estilos nombrados
{
  updateParagraphStyle: {
    range: { startIndex: 1, endIndex: 50 },
    paragraphStyle: {
      namedStyleType: 'HEADING_1'  // Estilo nativo de Google Docs
    },
    fields: 'namedStyleType'
  }
}

// Estilos disponibles:
// - NORMAL_TEXT
// - HEADING_1, HEADING_2, HEADING_3, HEADING_4, HEADING_5, HEADING_6
// - TITLE
// - SUBTITLE
```

### 📋 Listas

```typescript
// ✅ CORRECTO: Crear lista con viñetas
{
  createParagraphBullets: {
    range: { startIndex: 1, endIndex: 50 },
    bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE'
  }
}

// Para listas numeradas:
// bulletPreset: 'NUMBERED_DECIMAL_ALPHA_ROMAN'
```

---

## Patrón de Construcción Recomendado

### ❌ Construcción hacia adelante (MALO)
```typescript
// Problema: Los índices cambian con cada inserción
insertText(index: 1, "Primera línea\n")    // Ahora doc tiene 14 caracteres
insertText(index: 15, "Segunda línea\n")   // ¿Pero qué pasa si cambió?
updateTextStyle(range: {1, 15}, bold: true) // Índices desincronizados
```

### ✅ Construcción reversa (BUENO)
```typescript
// Siempre insertar en índice 1, las nuevas inserciones empujan lo anterior
const requests = [
  { insertText: { location: { index: 1 }, text: "Tercera línea\n" } },
  { insertText: { location: { index: 1 }, text: "Segunda línea\n" } },
  { insertText: { location: { index: 1 }, text: "Primera línea\n" } },
  { updateTextStyle: { range: { startIndex: 1, endIndex: 15 }, ... } }
]
```

---

## Ejemplos Completos

### Ejemplo 1: Documento de Investigación

```typescript
await createStructuredGoogleDoc({
  title: "Investigación: IA Generativa",
  content: `# Resumen Ejecutivo
La inteligencia artificial generativa ha revolucionado...

## Introducción
En los últimos años, modelos como GPT-4 y Claude...

### Definiciones Clave
- **LLM**: Large Language Model
- **Transformer**: Arquitectura de red neuronal
- **Prompt Engineering**: Diseño de instrucciones

## Metodología
Para este estudio se utilizaron los siguientes métodos:

1. Revisión bibliográfica
2. Análisis comparativo
3. Pruebas experimentales

## Resultados
Los hallazgos principales incluyen...

### Métricas de Rendimiento
**Precisión**: 94.2%
**Velocidad**: 1.5s por respuesta`
})
```

### Ejemplo 2: Reporte de Reunión

```typescript
await createStructuredGoogleDoc({
  title: "Acta de Reunión - 7 Nov 2025",
  content: `# Reunión Trimestral Q4 2025

## Participantes
- Luis Santana (Director)
- María González (Product Manager)
- Carlos Ruiz (Tech Lead)

## Agenda
1. Revisión de OKRs Q3
2. Planificación Q4
3. Presupuesto 2026

## Decisiones Tomadas

### Prioridades Q4
- Lanzar feature X para diciembre
- Contratar 2 desarrolladores
- Migrar a nueva infraestructura

### Action Items
- **Luis**: Aprobar presupuesto (deadline: 15 Nov)
- **María**: Actualizar roadmap (deadline: 10 Nov)
- **Carlos**: Plan de migración (deadline: 12 Nov)

## Próxima Reunión
**Fecha**: 7 Febrero 2026
**Hora**: 10:00 AM`
})
```

---

## Debugging: Problemas Comunes

### 🐛 Problema: "Texto se ve corrupto o cambia de fuente"

**Causa**: Aplicar formato sin especificar el campo `fields`

**Solución**:
```typescript
// ❌ MAL
updateTextStyle: {
  textStyle: { bold: true }
}

// ✅ BIEN
updateTextStyle: {
  textStyle: { bold: true },
  fields: 'bold'  // Especifica exactamente qué cambiar
}
```

### 🐛 Problema: "Los índices no coinciden"

**Causa**: Calcular índices antes de insertar texto

**Solución**: Usa construcción reversa (siempre index: 1)

### 🐛 Problema: "No puedo insertar en este índice"

**Causa**: Intentar insertar en posición de tabla/elemento estructural

**Solución**: Inserta en el párrafo anterior o después del elemento

---

## Checklist Pre-Creación

Antes de crear un documento, pregúntate:

- [ ] ¿Necesito títulos/headings? → Usa `createStructuredGoogleDoc`
- [ ] ¿Necesito listas? → Usa `createStructuredGoogleDoc`
- [ ] ¿Necesito texto en negrita/cursiva? → Usa `createStructuredGoogleDoc`
- [ ] ¿Es solo texto plano simple? → Usa `createGoogleDoc`
- [ ] ¿Necesito tablas/imágenes? → Usa herramientas advanced después de crear

---

## Referencias

- [Google Docs API Structure](https://developers.google.com/workspace/docs/api/concepts/structure)
- [Format Text Guide](https://developers.google.com/workspace/docs/api/how-tos/format-text)
- [Structural Rules](https://developers.google.com/workspace/docs/api/concepts/rules-behavior)
- [Stack Overflow: Multiple Styles](https://stackoverflow.com/questions/72232963)
