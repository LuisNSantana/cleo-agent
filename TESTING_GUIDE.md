# Sistema de Testing de cleo-agent

## Resumen General

El sistema de testing de `cleo-agent` está diseñado para garantizar la robustez, calidad y mantenibilidad del código en producción. Utilizamos **Jest** como framework principal de pruebas, con soporte completo para TypeScript y mocks avanzados para dependencias externas (como Supabase). La integración continua (CI) ejecuta automáticamente los tests y reporta cobertura en cada push o pull request.

---

## Estructura y Organización

- **Ubicación de tests:** Todos los archivos de test se encuentran en el directorio `/tests`.
- **Convención de nombres:** Cada archivo de test sigue el patrón `*.test.ts`.
- **Cobertura:** Se ejecuta y reporta cobertura de código en cada corrida de tests.
- **Integración continua:** El workflow de GitHub Actions ejecuta los tests y verifica la cobertura en cada push/PR.

---

## Librerías y Herramientas

- **Jest:** Framework principal de testing.
- **ts-jest:** Soporte para TypeScript en Jest.
- **@types/jest:** Tipos para Jest en TypeScript.
- **pnpm:** Gestor de paquetes y scripts de test.
- **Mocks:** Uso de `jest.mock` para aislar dependencias externas (por ejemplo, Supabase).

---

## Tipos de Pruebas

- **Unitarias:** Validan funciones y módulos individuales.
- **Integración:** Prueban la interacción entre varios módulos (por ejemplo, flujos de delegación y confirmación).
- **Cobertura crítica:** Se priorizan los flujos de usuario más importantes (aprobación, delegación, sincronización de agentes, etc).

---

## Resultados Esperados

- **Todos los tests deben pasar:** 0 fallos en CI.
- **Cobertura mínima:** Se recomienda mantener y mejorar la cobertura (>50% ideal, actualmente ~15%).
- **Sin archivos vacíos:** No debe haber archivos de test sin tests definidos.
- **Sin dependencias externas reales:** Todo acceso a servicios externos (Supabase, APIs) debe ser mockeado.
- **Sin warnings de async:** Los tests deben limpiar recursos y no dejar operaciones asíncronas abiertas.

---

## Ejecución de Tests

- **Comando principal:**
  ```bash
  pnpm test:jest --coverage
  ```
- **CI:** El workflow de GitHub Actions ejecuta este comando automáticamente.
- **Logs:** Los resultados muestran el estado de cada suite y la cobertura por archivo.

---

## Mejoras y Recomendaciones

1. **Aumentar cobertura:** Priorizar tests en módulos con baja cobertura (`lib/`, `lib/agents/`, etc).
2. **Refactorizar tests legacy:** Migrar cualquier test que use `node:test` o `assert` a Jest + `expect`.
3. **Mockear dependencias:** Asegurarse de que todos los servicios externos estén correctamente mockeados.
4. **Limpiar operaciones asíncronas:** Usar `afterEach`/`afterAll` para limpiar timers, suscripciones, etc.
5. **Documentar nuevos tests:** Seguir este archivo como guía para agregar o modificar tests.

---

## Ejemplo de Test

```typescript
test('mi función suma correctamente', () => {
  expect(sumar(2, 3)).toBe(5)
})
```

---

## Conclusión

El sistema de testing de `cleo-agent` es robusto, automatizado y fácil de mantener. Seguir estas prácticas y recomendaciones permitirá mejorar la calidad y velocidad de desarrollo, facilitando la colaboración y la entrega continua.

---

*Última actualización: 25 de septiembre de 2025*
