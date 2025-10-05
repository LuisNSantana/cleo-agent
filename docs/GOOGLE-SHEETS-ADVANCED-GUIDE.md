# Google Sheets Advanced Tools - Guía Completa

## Overview

Las nuevas **Advanced Google Sheets Tools** permiten a Peter crear hojas de cálculo profesionales con:

✅ **Múltiples tabs/hojas** (Dashboard, Data, Analysis)  
✅ **Gráficos interactivos** (Pie, Bar, Column, Line)  
✅ **Formato condicional** (alertas automáticas)  
✅ **Estilos profesionales** (colores, bordes, negrita, formatos numéricos)  
✅ **Fórmulas avanzadas** (referencias entre hojas, cálculos complejos)

## Tools Disponibles

### 1. `addGoogleSheetTab`

Agrega nuevas hojas/tabs a un spreadsheet existente.

**Ejemplo de uso**:
```typescript
await addGoogleSheetTab({
  spreadsheetId: "abc123",
  sheetTitle: "Dashboard",
  tabColor: { red: 0.2, green: 0.6, blue: 1 } // Azul
})

await addGoogleSheetTab({
  spreadsheetId: "abc123",
  sheetTitle: "Detalle",
  index: 1 // Posición después del Dashboard
})

await addGoogleSheetTab({
  spreadsheetId: "abc123",
  sheetTitle: "Análisis",
  hidden: false // Visible por defecto
})
```

**Parámetros clave**:
- `sheetTitle`: Nombre del tab (ej: "Dashboard", "Data", "Analysis")
- `index`: Posición (0 = primero, omitir = agregar al final)
- `tabColor`: Color RGB del tab (0-1 range)
- `hidden`: Ocultar sheet (útil para datos intermedios)

---

### 2. `createGoogleSheetChart`

Crea gráficos/charts dentro de las hojas.

**Ejemplo: Gráfico de Pastel (Budget Distribution)**
```typescript
await createGoogleSheetChart({
  spreadsheetId: "abc123",
  sheetId: 0, // Dashboard tab
  chartType: "PIE",
  dataRange: {
    sheetId: 1, // Detalle tab (donde están los datos)
    startRow: 1, // Fila 2 (0-indexed, skip headers)
    endRow: 5,   // Hasta fila 5
    startColumn: 0, // Columna A (categorías)
    endColumn: 2    // Hasta columna B (valores)
  },
  title: "Distribución de Presupuesto por Categoría",
  position: {
    anchorRow: 2,
    anchorColumn: 5, // Columna F
    offsetY: 10
  },
  legendPosition: "BOTTOM"
})
```

**Ejemplo: Gráfico de Barras (Progress Tracking)**
```typescript
await createGoogleSheetChart({
  spreadsheetId: "abc123",
  sheetId: 0,
  chartType: "BAR",
  dataRange: {
    sheetId: 1,
    startRow: 1,
    endRow: 5,
    startColumn: 0, // Categorías en columna A
    endColumn: 3    // Presupuesto y Gastado en B y C
  },
  title: "Progreso por Categoría (% Usado)",
  position: {
    anchorRow: 15,
    anchorColumn: 0
  }
})
```

**Tipos de charts disponibles**:
- `PIE`: Ideal para distribución de presupuestos, proporciones
- `BAR`: Comparación horizontal entre categorías
- `COLUMN`: Comparación vertical (como barras pero verticales)
- `LINE`: Tendencias over time, proyecciones
- `AREA`: Similar a LINE pero con área sombreada
- `SCATTER`: Correlaciones entre dos variables

**Tip importante sobre dataRange**:
- `startRow`, `endRow`, `startColumn`, `endColumn` son **0-indexed**
- **Excluye headers**: Si tus datos tienen headers en fila 1, empieza en `startRow: 1` (fila 2)
- **Formato de datos**:
  - Primera columna: Labels/Categorías (ej: "Digital", "Giras", "Logística")
  - Segunda columna+: Valores numéricos

---

### 3. `formatGoogleSheetCells`

Aplica formato profesional a celdas.

**Ejemplo: Headers con fondo azul y texto blanco en negrita**
```typescript
await formatGoogleSheetCells({
  spreadsheetId: "abc123",
  sheetId: 0,
  range: {
    startRow: 0,    // Fila 1
    endRow: 1,      // Solo esa fila
    startColumn: 0, // Columna A
    endColumn: 4    // Hasta columna D
  },
  formatting: {
    backgroundColor: { red: 0.26, green: 0.52, blue: 0.96 }, // Azul
    textColor: { red: 1, green: 1, blue: 1 }, // Blanco
    bold: true,
    fontSize: 11,
    horizontalAlignment: "CENTER",
    borders: {
      bottom: true,
      style: "SOLID",
      color: { red: 0, green: 0, blue: 0 }
    }
  }
})
```

**Ejemplo: Formato de moneda para columna de presupuestos**
```typescript
await formatGoogleSheetCells({
  spreadsheetId: "abc123",
  sheetId: 1,
  range: {
    startRow: 1,
    endRow: 20,
    startColumn: 1, // Columna B
    endColumn: 2
  },
  formatting: {
    numberFormat: {
      type: "CURRENCY",
      pattern: "$#,##0" // Sin decimales para COP
    },
    horizontalAlignment: "RIGHT"
  }
})
```

**Ejemplo: Formato de porcentaje**
```typescript
await formatGoogleSheetCells({
  spreadsheetId: "abc123",
  sheetId: 1,
  range: {
    startRow: 1,
    endRow: 20,
    startColumn: 4, // Columna E (% Usado)
    endColumn: 5
  },
  formatting: {
    numberFormat: {
      type: "PERCENT",
      pattern: "0.0%" // Un decimal
    },
    horizontalAlignment: "CENTER"
  }
})
```

**Opciones de formato disponibles**:
- **Colores**: `backgroundColor`, `textColor` (RGB 0-1)
- **Texto**: `bold`, `italic`, `fontSize`
- **Alineación**: `horizontalAlignment` (LEFT/CENTER/RIGHT), `verticalAlignment` (TOP/MIDDLE/BOTTOM)
- **Números**: `numberFormat` con tipos:
  - `NUMBER`: Números generales
  - `CURRENCY`: Moneda (usar pattern "$#,##0" para COP sin decimales)
  - `PERCENT`: Porcentajes
  - `DATE`: Fechas
  - `TIME`: Horas
- **Bordes**: `borders` con `top`, `bottom`, `left`, `right`, `style`, `color`

---

### 4. `applyConditionalFormatting`

Aplica reglas de formato automático basadas en valores.

**Ejemplo: Alerta roja si % Usado > 80%**
```typescript
await applyConditionalFormatting({
  spreadsheetId: "abc123",
  sheetId: 1,
  range: {
    startRow: 1,
    endRow: 20,
    startColumn: 4, // Columna E (% Usado)
    endColumn: 5
  },
  condition: {
    type: "NUMBER_GREATER",
    value: 0.8 // 80%
  },
  format: {
    backgroundColor: { red: 0.96, green: 0.26, blue: 0.21 }, // Rojo
    textColor: { red: 1, green: 1, blue: 1 }, // Blanco
    bold: true
  }
})
```

**Ejemplo: Verde si saldo positivo (fórmula custom)**
```typescript
await applyConditionalFormatting({
  spreadsheetId: "abc123",
  sheetId: 1,
  range: {
    startRow: 1,
    endRow: 20,
    startColumn: 3, // Columna D (Saldo)
    endColumn: 4
  },
  condition: {
    type: "CUSTOM_FORMULA",
    formula: "=D2>0" // Saldo positivo
  },
  format: {
    backgroundColor: { red: 0.72, green: 0.88, blue: 0.8 }, // Verde claro
    textColor: { red: 0.13, green: 0.55, blue: 0.13 } // Verde oscuro
  }
})
```

**Tipos de condiciones**:
- `NUMBER_GREATER`: Mayor que
- `NUMBER_GREATER_THAN_EQ`: Mayor o igual
- `NUMBER_LESS`: Menor que
- `NUMBER_LESS_THAN_EQ`: Menor o igual
- `NUMBER_EQ`: Igual a
- `NUMBER_NOT_EQ`: Diferente de
- `TEXT_CONTAINS`: Texto contiene
- `TEXT_STARTS_WITH`: Texto empieza con
- `TEXT_ENDS_WITH`: Texto termina con
- `CUSTOM_FORMULA`: Fórmula personalizada (más flexible)

**Paleta de colores recomendada**:
```typescript
const COLORS = {
  // Alertas
  RED: { red: 0.96, green: 0.26, blue: 0.21 },
  YELLOW: { red: 1, green: 0.85, blue: 0 },
  GREEN: { red: 0.72, green: 0.88, blue: 0.8 },
  
  // Azules profesionales
  BLUE_LIGHT: { red: 0.82, green: 0.89, blue: 0.96 },
  BLUE: { red: 0.26, green: 0.52, blue: 0.96 },
  BLUE_DARK: { red: 0.13, green: 0.29, blue: 0.68 },
  
  // Neutros
  WHITE: { red: 1, green: 1, blue: 1 },
  GRAY_LIGHT: { red: 0.95, green: 0.95, blue: 0.95 },
  GRAY: { red: 0.75, green: 0.75, blue: 0.75 },
  BLACK: { red: 0, green: 0, blue: 0 }
}
```

---

## Flujo Completo: Crear Spreadsheet de Presupuesto Electoral

Este es el workflow que Peter debería seguir para crear un sheet como el del screenshot:

### Paso 1: Crear spreadsheet base con datos

```typescript
const sheet = await createGoogleSheet({
  title: "Presupuesto Campaña Electoral Luis Santana Galeth - Magdalena 2024",
  sheetTitle: "Dashboard",
  data: [
    ["Dashboard - Pre Hasta 23 Nov 2024"],
    [],
    ["Métricas Clave:"],
    ["Total Presupuesto", 180000000],
    ["Total Gastado:", "=SUM(Detalle!D:D)"],
    ["Saldo Restante:", "=C4 - C5"],
    ["% Usado Total:", "=IF(C4>0, C5/C4*100, 0)&\"%\""],
    ["Alerta:", "=IF(C6>80, \"¡Atención! >80% usado\", \"OK\")"],
    // ... más contenido
  ]
})

const spreadsheetId = sheet.spreadsheet.id
```

### Paso 2: Agregar tab de Detalle

```typescript
await addGoogleSheetTab({
  spreadsheetId,
  sheetTitle: "Detalle",
  index: 1
})

// Llenar datos del detalle
await updateGoogleSheet({
  spreadsheetId,
  range: "Detalle!A1:F20",
  values: [
    ["Categoría", "Presupuesto", "Gastado", "Saldo", "% Usado", "Estado"],
    ["Visibilidad Digital", 72000000, 0, "=B2-C2", "=IF(B2>0,C2/B2,0)", "=IF(E2>0.8,\"⚠️\",\"✅\")"],
    ["Giras y Eventos", 54000000, 0, "=B3-C3", "=IF(B3>0,C3/B3,0)", "=IF(E3>0.8,\"⚠️\",\"✅\")"],
    ["Logística", 36000000, 0, "=B4-C4", "=IF(B4>0,C4/B4,0)", "=IF(E4>0.8,\"⚠️\",\"✅\")"],
    ["Contingencias", 18000000, 0, "=B5-C5", "=IF(B5>0,C5/B5,0)", "=IF(E5>0.8,\"⚠️\",\"✅\")"],
  ]
})
```

### Paso 3: Formato profesional

```typescript
// Headers con fondo azul
await formatGoogleSheetCells({
  spreadsheetId,
  sheetId: 1, // Detalle (asume que sheetId=1)
  range: { startRow: 0, endRow: 1, startColumn: 0, endColumn: 6 },
  formatting: {
    backgroundColor: { red: 0.26, green: 0.52, blue: 0.96 },
    textColor: { red: 1, green: 1, blue: 1 },
    bold: true,
    horizontalAlignment: "CENTER"
  }
})

// Formato de moneda en columnas B, C, D
await formatGoogleSheetCells({
  spreadsheetId,
  sheetId: 1,
  range: { startRow: 1, endRow: 10, startColumn: 1, endColumn: 4 },
  formatting: {
    numberFormat: { type: "CURRENCY", pattern: "$#,##0 COP" },
    horizontalAlignment: "RIGHT"
  }
})

// Formato de porcentaje en columna E
await formatGoogleSheetCells({
  spreadsheetId,
  sheetId: 1,
  range: { startRow: 1, endRow: 10, startColumn: 4, endColumn: 5 },
  formatting: {
    numberFormat: { type: "PERCENT", pattern: "0%" },
    horizontalAlignment: "CENTER"
  }
})
```

### Paso 4: Formato condicional (alertas)

```typescript
// Alerta roja si % Usado > 80%
await applyConditionalFormatting({
  spreadsheetId,
  sheetId: 1,
  range: { startRow: 1, endRow: 10, startColumn: 4, endColumn: 5 },
  condition: { type: "NUMBER_GREATER", value: 0.8 },
  format: {
    backgroundColor: { red: 0.96, green: 0.26, blue: 0.21 },
    textColor: { red: 1, green: 1, blue: 1 },
    bold: true
  }
})

// Verde si saldo positivo
await applyConditionalFormatting({
  spreadsheetId,
  sheetId: 1,
  range: { startRow: 1, endRow: 10, startColumn: 3, endColumn: 4 },
  condition: { type: "CUSTOM_FORMULA", formula: "=D2>0" },
  format: {
    backgroundColor: { red: 0.72, green: 0.88, blue: 0.8 }
  }
})
```

### Paso 5: Crear gráficos

```typescript
// Gráfico de pastel: Distribución de presupuesto
await createGoogleSheetChart({
  spreadsheetId,
  sheetId: 0, // Dashboard
  chartType: "PIE",
  dataRange: {
    sheetId: 1, // Detalle
    startRow: 1, // Datos (sin header)
    endRow: 5,
    startColumn: 0, // Categorías en A
    endColumn: 2    // Presupuestos en B
  },
  title: "Distribución de Presupuesto por Categoría",
  position: { anchorRow: 10, anchorColumn: 2 },
  legendPosition: "BOTTOM"
})

// Gráfico de barras: % Usado por categoría
await createGoogleSheetChart({
  spreadsheetId,
  sheetId: 0,
  chartType: "BAR",
  dataRange: {
    sheetId: 1,
    startRow: 1,
    endRow: 5,
    startColumn: 0, // Categorías
    endColumn: 5    // Hasta % Usado
  },
  title: "Progreso por Categoría (% Usado)",
  position: { anchorRow: 10, anchorColumn: 8 }
})
```

### Paso 6: Tab de escenarios (opcional)

```typescript
await addGoogleSheetTab({
  spreadsheetId,
  sheetTitle: "Escenarios",
  index: 2
})

await updateGoogleSheet({
  spreadsheetId,
  range: "Escenarios!A1:E10",
  values: [
    ["Escenario", "Digital", "Giras", "Logística", "Contingencias"],
    ["Bajo", 60000000, 40000000, 30000000, 20000000],
    ["Medio", 72000000, 54000000, 36000000, 18000000],
    ["Alto", 85000000, 65000000, 40000000, 15000000],
  ]
})
```

---

## Best Practices para Peter

### 1. **Estructura Multi-Tab Clara**
```
📊 Dashboard (sheetId: 0)
   ├─ Resumen ejecutivo
   ├─ KPIs clave
   ├─ Gráficos de visualización
   └─ Alertas y proyecciones

📋 Detalle (sheetId: 1)
   ├─ Tabla completa de datos
   ├─ Fórmulas de cálculo
   └─ Formato condicional

📈 Análisis (sheetId: 2)
   ├─ Escenarios
   ├─ Tendencias
   └─ Proyecciones
```

### 2. **Convenciones de Nombrado**
- **Sheets**: Nombres en español claros (Dashboard, Detalle, Análisis, Escenarios)
- **Referencias entre hojas**: `=Detalle!C9` (usar nombre del sheet, no sheetId)
- **Columnas**: A=Categoría, B=Presupuesto, C=Gastado, D=Saldo, E=% Usado

### 3. **Orden de Operaciones**
1. ✅ Crear spreadsheet con datos base
2. ✅ Agregar tabs adicionales
3. ✅ Llenar datos con fórmulas
4. ✅ Aplicar formato a celdas (colores, borders, alignment)
5. ✅ Aplicar formato condicional (alertas)
6. ✅ Crear gráficos
7. ✅ Compartir con permisos

### 4. **Paleta de Colores Consistente**
```typescript
const BUDGET_PALETTE = {
  header: { red: 0.26, green: 0.52, blue: 0.96 }, // Azul
  alert_high: { red: 0.96, green: 0.26, blue: 0.21 }, // Rojo (>80%)
  alert_medium: { red: 1, green: 0.85, blue: 0 }, // Amarillo (60-80%)
  positive: { red: 0.72, green: 0.88, blue: 0.8 }, // Verde (saldo+)
  neutral: { red: 0.95, green: 0.95, blue: 0.95 } // Gris claro
}
```

### 5. **Fórmulas Comunes**
```excel
// Suma total
=SUM(Detalle!D:D)

// Porcentaje usado
=IF(B2>0, C2/B2, 0)

// Saldo restante
=B2-C2

// Alerta condicional
=IF(E2>0.8, "¡Atención! >80% usado", "OK")

// Costo por voto
=IF(C15>0, C5/C15, 0)

// ROI estimado
=IF(C16>0, (C15 * C16) / C5, 0)
```

### 6. **Validación y Testing**
Después de crear el sheet, Peter debe:
1. ✅ Verificar que todas las fórmulas funcionen (F9 para recalcular)
2. ✅ Confirmar que los gráficos muestren datos correctos
3. ✅ Probar formato condicional con valores de prueba
4. ✅ Verificar que el link compartible funcione
5. ✅ Documentar instrucciones de uso en el Dashboard

---

## Troubleshooting

### Error: "Sheet not found"
**Causa**: El `sheetId` es incorrecto  
**Solución**: Usa `readGoogleSheet` con `includeMetadata: true` para obtener los IDs correctos de cada sheet

### Error: "Invalid range"
**Causa**: Índices fuera de rango o formato incorrecto  
**Solución**: Recuerda que los índices son 0-based (fila 1 = startRow: 0)

### Charts no muestran datos
**Causa**: `dataRange` no apunta a los datos correctos  
**Solución**: Verifica que:
- `startRow` excluya el header si es necesario
- `endRow` sea el número correcto de filas de datos
- Las columnas contengan datos numéricos (no texto)

### Conditional formatting no se aplica
**Causa**: La fórmula o condición tiene error de sintaxis  
**Solución**: 
- Para `CUSTOM_FORMULA`, siempre empieza con `=`
- Usa referencias relativas (ej: `=A1>0`, no `=$A$1>0`)
- El valor de comparación debe ser del tipo correcto (número como 0.8, no "80%")

### Colores se ven diferentes
**Causa**: Valores RGB fuera de rango  
**Solución**: Usa valores entre 0 y 1 (no 0-255). Ej: rojo = `{red: 1, green: 0, blue: 0}`

---

## Recursos Adicionales

- **Google Sheets API Reference**: https://developers.google.com/sheets/api/reference/rest
- **Chart Types Documentation**: https://developers.google.com/chart/interactive/docs/gallery
- **Conditional Formatting Rules**: https://developers.google.com/sheets/api/guides/conditional-format

---

## Changelog

**v1.0 (2025-01-05)**
- ✨ Añadidas 4 nuevas tools avanzadas
- 📊 Soporte para charts (PIE, BAR, COLUMN, LINE, AREA, SCATTER)
- 🎨 Formato de celdas completo (colores, borders, alignment, number formats)
- ⚠️ Formato condicional con múltiples tipos de condiciones
- 📑 Multi-sheet support con tabs personalizados
