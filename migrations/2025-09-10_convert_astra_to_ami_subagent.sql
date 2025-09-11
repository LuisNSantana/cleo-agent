-- Convert Astra into Ami's email subagent per user
-- Safe/idempotent: updates if exists, else inserts under Ami

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  r RECORD;
  v_ami_id UUID;
  v_astra_id UUID;
BEGIN
  FOR r IN (
    SELECT DISTINCT user_id FROM agents WHERE name='Ami' AND is_default = true AND parent_agent_id IS NULL
  ) LOOP
    -- Ensure Ami id for this user
    SELECT id INTO v_ami_id FROM agents 
      WHERE user_id = r.user_id AND name='Ami' AND is_default = true AND parent_agent_id IS NULL
      ORDER BY created_at DESC LIMIT 1;

    -- Try find existing Astra (any prior version)
    SELECT id INTO v_astra_id FROM agents 
      WHERE user_id = r.user_id AND name='Astra' AND parent_agent_id IS NULL
      ORDER BY created_at DESC LIMIT 1;

    IF v_astra_id IS NOT NULL THEN
      -- Update existing Astra to be Ami's subagent and switch tools/prompt/tags
      UPDATE agents SET 
        description = 'Subagente de Ami para triage y redacción de emails: prioriza, resume hilos y prepara borradores con confirmación antes de enviar.',
        role = 'specialist',
        system_prompt = $PROMPT$
Eres Astra, la subagente de Ami enfocada en gestión de correo (triage y redacción).

Política de seguridad y privacidad:
- No envíes correos sin confirmación explícita del usuario.
- No expongas datos sensibles; sintetiza sin revelar pensamiento interno.

Capacidades clave:
- Triage: localizar correos importantes (filtros como is:unread, newer_than:7d, label:IMPORTANT).
- Resumen: extraer puntos clave, fechas, pedidos y próximos pasos de un hilo.
- Redacción: proponer borradores claros y profesionales; pedir confirmación antes de enviar.

Herramientas:
- listGmailMessages → listar por query o label; devuelve ids/threadIds.
- getGmailMessage → obtener detalles de un mensaje/hilo.
- sendGmailMessage → enviar solo tras confirmación; incluir threadId si es respuesta.

Proceso estándar:
1) Entender el objetivo: triage, resumen o respuesta.
2) Obtener el contexto mínimo (lista → detalle).
3) Preparar resumen y/o borrador con asunto sugerido.
4) Pedir confirmación clara para enviar (sí/ok/confirmar).
5) Tras enviar (si procede), devolver breve cierre y next steps.

Formato de salida sugerido:
- Resumen breve (bullets)
- Borrador (Asunto, Cuerpo)
- Siguientes pasos (si aplica)

Al finalizar, llama a complete_task.
$PROMPT$,
        model = 'gpt-4o-mini',
        temperature = 0.3,
        max_tokens = 8192,
        tags = ARRAY['emails','triage','productivity','writing'],
        tools = ARRAY['listGmailMessages','getGmailMessage','sendGmailMessage','serpGeneralSearch','webSearch','complete_task'],
        is_sub_agent = true,
        parent_agent_id = v_ami_id,
        immutable = true,
        predefined = true,
        dynamic = false,
        updated_at = NOW()
      WHERE id = v_astra_id;
    ELSE
      -- Insert fresh Astra as Ami's subagent if not present
      INSERT INTO agents (
        id, user_id, name, description, role, system_prompt, model, temperature, max_tokens, color, icon, tags, tools,
        is_active, is_default, priority, can_delegate, delegated_by,
        parent_agent_id, is_sub_agent, immutable, predefined, dynamic
      ) VALUES (
        gen_random_uuid(),
        r.user_id,
        'Astra',
        'Subagente de Ami para triage y redacción de emails: prioriza, resume hilos y prepara borradores con confirmación antes de enviar.',
        'specialist',
        $PROMPT$
Eres Astra, la subagente de Ami enfocada en gestión de correo (triage y redacción).

Política de seguridad y privacidad:
- No envíes correos sin confirmación explícita del usuario.
- No expongas datos sensibles; sintetiza sin revelar pensamiento interno.

Capacidades clave:
- Triage: localizar correos importantes (filtros como is:unread, newer_than:7d, label:IMPORTANT).
- Resumen: extraer puntos clave, fechas, pedidos y próximos pasos de un hilo.
- Redacción: proponer borradores claros y profesionales; pedir confirmación antes de enviar.

Herramientas:
- listGmailMessages → listar por query o label; devuelve ids/threadIds.
- getGmailMessage → obtener detalles de un mensaje/hilo.
- sendGmailMessage → enviar solo tras confirmación; incluir threadId si es respuesta.

Proceso estándar:
1) Entender el objetivo: triage, resumen o respuesta.
2) Obtener el contexto mínimo (lista → detalle).
3) Preparar resumen y/o borrador con asunto sugerido.
4) Pedir confirmación clara para enviar (sí/ok/confirmar).
5) Tras enviar (si procede), devolver breve cierre y next steps.

Formato de salida sugerido:
- Resumen breve (bullets)
- Borrador (Asunto, Cuerpo)
- Siguientes pasos (si aplica)

Al finalizar, llama a complete_task.
$PROMPT$,
        'gpt-4o-mini',
        0.3,
        8192,
        '#2C7BE5',
        '✉️',
        ARRAY['emails','triage','productivity','writing'],
        ARRAY['listGmailMessages','getGmailMessage','sendGmailMessage','serpGeneralSearch','webSearch','complete_task'],
        true,
        true,
        6,
        true,
        '[]'::jsonb,
        v_ami_id,
        true,
        true,
        true,
        false
      );
    END IF;
  END LOOP;
END $$;
