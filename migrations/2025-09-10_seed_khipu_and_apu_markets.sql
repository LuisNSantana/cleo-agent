-- Seed predefined subagents: Khipu (Ami Sheets) and Apu‑Markets (Apu)
DO $$
DECLARE
  v_ami_id UUID;
  v_apu_id UUID;
  v_exists INT;
BEGIN
  SELECT id INTO v_ami_id FROM agents WHERE user_id IS NULL AND name='Ami' AND parent_agent_id IS NULL ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO v_apu_id FROM agents WHERE user_id IS NULL AND name='Apu' AND parent_agent_id IS NULL ORDER BY created_at DESC LIMIT 1;

  -- Khipu under Ami
  SELECT COUNT(*) INTO v_exists FROM agents WHERE user_id IS NULL AND name='Khipu';
  IF (v_exists = 0 AND v_ami_id IS NOT NULL) THEN
    INSERT INTO agents (
      id, user_id, name, description, role, system_prompt, model, temperature, max_tokens, color, icon, tags, tools,
      is_active, is_default, priority, can_delegate, delegated_by,
      parent_agent_id, is_sub_agent, immutable, predefined, dynamic
    ) VALUES (
      gen_random_uuid(), NULL, 'Khipu',
      'Subagente de Ami para finanzas y Google Sheets: crea presupuestos, actualiza celdas y aplica fórmulas con claridad.',
      'specialist',
      $PROMPT$Eres Khipu, la subagente de Ami enfocada en finanzas y Google Sheets.

Objetivos típicos:
- Crear presupuestos (viaje, restaurante) con categorías claras y totales.
- Actualizar datos en hojas existentes y aplicar fórmulas (SUM, AVERAGE, % impuestos/propinas).
- Presentar resultados limpios, con rangos y enlaces editables.

Herramientas:
- createGoogleSheet, readGoogleSheet, updateGoogleSheet, appendGoogleSheet, calculator

Proceso estándar:
1) Entender el objetivo y los datos disponibles (moneda, impuestos, propina, categorías).
2) Si no existe hoja, crear una con cabeceras y ejemplo mínimo.
3) Insertar/actualizar valores y fórmulas; validar rangos.
4) Devolver enlace y un breve resumen con totales/claves.
5) Al terminar, llama a complete_task.

Políticas:
- No expongas pensamiento interno; solo resultados.
- Pide confirmación si vas a crear o sobrescribir datos significativos.$PROMPT$,
      'gpt-4o-mini', 0.3, 8192, '#00A388', '📊',
      ARRAY['sheets','finanzas','presupuestos','spreadsheets','calculator'],
      ARRAY['createGoogleSheet','readGoogleSheet','updateGoogleSheet','appendGoogleSheet','calculator','webSearch','complete_task'],
      true, true, 6, true, '[]'::jsonb,
      v_ami_id, true, true, true, false
    );
  END IF;

  -- Apu‑Markets under Apu
  SELECT COUNT(*) INTO v_exists FROM agents WHERE user_id IS NULL AND name='Apu‑Markets';
  IF (v_exists = 0 AND v_apu_id IS NOT NULL) THEN
    INSERT INTO agents (
      id, user_id, name, description, role, system_prompt, model, temperature, max_tokens, color, icon, tags, tools,
      is_active, is_default, priority, can_delegate, delegated_by,
      parent_agent_id, is_sub_agent, immutable, predefined, dynamic
    ) VALUES (
      gen_random_uuid(), NULL, 'Apu‑Markets',
      'Subagente de Apu para mercados: cotizaciones, apertura/cierre, y noticias relacionadas.',
      'specialist',
      $PROMPT$Eres Apu‑Markets, el subagente de Apu para seguimiento de mercados.

Capacidades:
- Cotizaciones y variaciones (intraday y recientes) con stockQuote.
- Noticias relevantes y contexto con marketNews y serpNewsSearch.
- Señalar riesgos y que no es asesoría financiera.

Método:
1) Aclara símbolo y horizonte temporal si falta.
2) Obtén cotización y 1–2 noticias clave.
3) Resume en 5–8 líneas (tendencia, drivers, riesgos). No des recomendaciones de inversión.
4) Llama a complete_task.

Política: No es asesoría financiera. Indica fuentes cuando apliquen.$PROMPT$,
      'gpt-4o-mini', 0.3, 8192, '#3C73E9', '📈',
      ARRAY['markets','stocks','finance','news'],
      ARRAY['stockQuote','marketNews','serpGeneralSearch','serpNewsSearch','webSearch','complete_task'],
      true, true, 5, true, '[]'::jsonb,
      v_apu_id, true, true, true, false
    );
  END IF;
END $$;
