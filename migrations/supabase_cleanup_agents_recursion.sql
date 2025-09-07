-- =========================================
-- MIGRACIÓN DE LIMPIEZA COMPLETA
-- =========================================
-- Este archivo corrige todos los problemas de recursión infinita
-- Ejecutar DESPUÉS de haber aplicado los esquemas problemáticos
-- O ejecutar como migración preventiva

-- =========================================
-- 1. LIMPIAR TRIGGERS PROBLEMÁTICOS
-- =========================================

-- Eliminar triggers que causan recursión
DROP TRIGGER IF EXISTS update_delegation_on_agent_creation ON agents;
DROP TRIGGER IF EXISTS tr_check_agent_limit ON agents;
DROP TRIGGER IF EXISTS tr_safe_check_agent_limit ON agents;

-- Eliminar funciones problemáticas
DROP FUNCTION IF EXISTS update_agent_delegation();
DROP FUNCTION IF EXISTS check_agent_limit();
DROP FUNCTION IF EXISTS safe_check_agent_limit();
DROP FUNCTION IF EXISTS can_user_create_agent(uuid);
DROP FUNCTION IF EXISTS setup_agent_delegation(uuid, uuid);

-- =========================================
-- 2. LIMPIAR POLÍTICAS RLS PROBLEMÁTICAS
-- =========================================

-- Eliminar todas las políticas existentes (las recrearemos simplificadas)
DROP POLICY IF EXISTS "Users can view their own agents" ON agents;
DROP POLICY IF EXISTS "Users can view their agents and sub-agents" ON agents;
DROP POLICY IF EXISTS "Users can insert their own agents" ON agents;
DROP POLICY IF EXISTS "Users can insert their own sub-agents" ON agents;
DROP POLICY IF EXISTS "Users can update their own agents" ON agents;
DROP POLICY IF EXISTS "Users can update their own agents and sub-agents" ON agents;
DROP POLICY IF EXISTS "Users can delete their own non-default agents" ON agents;
DROP POLICY IF EXISTS "Users can delete their own sub-agents" ON agents;
DROP POLICY IF EXISTS "Users can delete their own agents" ON agents;

-- =========================================
-- 3. CREAR POLÍTICAS RLS SEGURAS
-- =========================================

-- Políticas simplificadas sin subconsultas que causen recursión
CREATE POLICY "agents_select_policy" ON agents
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "agents_insert_policy" ON agents
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "agents_update_policy" ON agents
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "agents_delete_policy" ON agents
    FOR DELETE
    USING (user_id = auth.uid() AND is_default = false);

-- =========================================
-- 4. ASEGURAR TRIGGER SEGURO DE UPDATED_AT
-- =========================================

-- Función segura para updated_at (no hace consultas)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Asegurar que solo existe el trigger seguro
DROP TRIGGER IF EXISTS update_agents_timestamp ON agents;
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
DROP TRIGGER IF EXISTS tr_agents_updated_at ON agents;

CREATE TRIGGER tr_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- 5. CREAR FUNCIÓN SEGURA DE DELEGACIÓN
-- =========================================

-- Función segura que no causa recursión
CREATE OR REPLACE FUNCTION safe_setup_agent_delegation(agent_id uuid, user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cleo_id UUID;
  agent_exists BOOLEAN := false;
BEGIN
  -- Verificar que el agente existe
  SELECT EXISTS(SELECT 1 FROM agents WHERE id = agent_id AND agents.user_id = safe_setup_agent_delegation.user_id) 
  INTO agent_exists;
  
  IF NOT agent_exists THEN
    RETURN;
  END IF;
  
  -- Encontrar Cleo del usuario
  SELECT id INTO cleo_id 
  FROM agents 
  WHERE agents.user_id = safe_setup_agent_delegation.user_id 
    AND name = 'Cleo' 
    AND is_default = true
  LIMIT 1;
  
  -- Configurar delegación bidireccional si Cleo existe
  IF cleo_id IS NOT NULL AND cleo_id != agent_id THEN
    BEGIN
      -- Permitir que Cleo delegue al nuevo agente
      UPDATE agents 
      SET delegated_by = COALESCE(delegated_by, '[]'::jsonb) || jsonb_build_array(cleo_id::text)
      WHERE id = agent_id 
        AND NOT (COALESCE(delegated_by, '[]'::jsonb) ? cleo_id::text);
    EXCEPTION WHEN OTHERS THEN
      NULL; -- No fallar si hay error
    END;
    
    BEGIN
      -- Permitir que el nuevo agente delegue a Cleo
      UPDATE agents 
      SET delegated_by = COALESCE(delegated_by, '[]'::jsonb) || jsonb_build_array(agent_id::text)
      WHERE id = cleo_id 
        AND NOT (COALESCE(delegated_by, '[]'::jsonb) ? agent_id::text);
    EXCEPTION WHEN OTHERS THEN
      NULL; -- No fallar si hay error
    END;
  END IF;
END;
$$;

-- =========================================
-- 6. ASEGURAR COLUMNAS DE SUB-AGENTES
-- =========================================

-- Agregar columnas de sub-agentes si no existen
DO $$
BEGIN
    -- Agregar is_sub_agent si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'agents' AND column_name = 'is_sub_agent') THEN
        ALTER TABLE agents ADD COLUMN is_sub_agent BOOLEAN DEFAULT false;
    END IF;
    
    -- Agregar parent_agent_id si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'agents' AND column_name = 'parent_agent_id') THEN
        ALTER TABLE agents ADD COLUMN parent_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE;
    END IF;
    
    -- Agregar constraint si no existe
    BEGIN
        ALTER TABLE agents ADD CONSTRAINT no_self_reference CHECK (id != parent_agent_id);
    EXCEPTION WHEN duplicate_object THEN
        NULL; -- Constraint ya existe
    END;
END $$;

-- =========================================
-- 7. CREAR ÍNDICES FALTANTES
-- =========================================

CREATE INDEX IF NOT EXISTS idx_agents_parent ON agents(parent_agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_is_sub_agent ON agents(is_sub_agent);

-- =========================================
-- 8. OTORGAR PERMISOS
-- =========================================

GRANT EXECUTE ON FUNCTION safe_setup_agent_delegation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;

-- =========================================
-- 9. VERIFICAR LIMPIEZA
-- =========================================

-- Función para verificar que todo está limpio
CREATE OR REPLACE FUNCTION verify_agents_schema_safe()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Verificar triggers
    RETURN QUERY
    SELECT 
        'Triggers Check'::TEXT,
        CASE WHEN count(*) = 1 THEN 'SAFE' ELSE 'WARNING' END,
        'Found ' || count(*) || ' triggers (expected: 1 - tr_agents_updated_at)'
    FROM pg_trigger t
    WHERE t.tgrelid = 'agents'::regclass
    AND t.tgname NOT LIKE 'RI_%';
    
    -- Verificar políticas
    RETURN QUERY
    SELECT 
        'RLS Policies Check'::TEXT,
        CASE WHEN count(*) = 4 THEN 'SAFE' ELSE 'WARNING' END,
        'Found ' || count(*) || ' policies (expected: 4 simple policies)'
    FROM pg_policies 
    WHERE tablename = 'agents';
    
    -- Verificar funciones seguras
    RETURN QUERY
    SELECT 
        'Safe Functions Check'::TEXT,
        CASE WHEN count(*) >= 1 THEN 'SAFE' ELSE 'ERROR' END,
        'Found ' || count(*) || ' safe functions (expected: safe_setup_agent_delegation)'
    FROM pg_proc 
    WHERE proname = 'safe_setup_agent_delegation';
    
    -- Verificar funciones problemáticas
    RETURN QUERY
    SELECT 
        'Problematic Functions Check'::TEXT,
        CASE WHEN count(*) = 0 THEN 'SAFE' ELSE 'ERROR' END,
        'Found ' || count(*) || ' problematic functions (expected: 0)'
    FROM pg_proc 
    WHERE proname IN ('update_agent_delegation', 'check_agent_limit', 'can_user_create_agent');
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- 10. EJECUTAR VERIFICACIÓN
-- =========================================

-- Mostrar resultados de la verificación
SELECT * FROM verify_agents_schema_safe();

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRACIÓN DE LIMPIEZA COMPLETADA';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Se han eliminado todos los triggers y funciones problemáticas';
    RAISE NOTICE 'Se han simplificado las políticas RLS';
    RAISE NOTICE 'Se ha agregado la función segura de delegación';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANTE: En tu aplicación, asegúrate de usar:';
    RAISE NOTICE '- safe_setup_agent_delegation() en lugar de triggers';
    RAISE NOTICE '- Validación de límites en el nivel de aplicación';
    RAISE NOTICE '- Políticas RLS simples sin subconsultas';
    RAISE NOTICE '';
    RAISE NOTICE 'Ejecuta: SELECT * FROM verify_agents_schema_safe();';
    RAISE NOTICE 'para verificar que todo esté correcto.';
    RAISE NOTICE '========================================';
END $$;
