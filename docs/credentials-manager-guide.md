# Credentials Manager - Sistema Escalable de Gestión de API Keys

## 🎯 Descripción General

El `CredentialsManager` es un componente React escalable diseñado para gestionar credenciales de API de diferentes servicios de manera segura y eficiente. Está construido siguiendo el patrón de configuración que permite agregar fácilmente nuevos servicios sin modificar la lógica principal.

## 🏗️ Arquitectura

### Componentes Principales

1. **CredentialsManager**: Componente principal universal
2. **SERVICE_CONFIGS**: Configuraciones específicas por servicio
3. **Convenience Exports**: Componentes especializados para cada servicio

### Servicios Soportados

- **Shopify** (`emma`): Gestión de tiendas e-commerce
- **Skyvern** (`wex`): Automatización web con IA

## 🚀 Uso Básico

```tsx
import { ShopifyCredentialsManager, SkyvernCredentialsManager } from '@/components/common/CredentialsManager';

// Para Emma (Shopify)
<ShopifyCredentialsManager />

// Para Wex (Skyvern)
<SkyvernCredentialsManager />

// Uso directo con tipo específico
<CredentialsManager serviceType="shopify" />
<CredentialsManager serviceType="skyvern" />
```

## 🔧 Agregar Nuevo Servicio

### Paso 1: Definir Tipos

```tsx
// Agregar nuevo tipo de credencial
interface NewServiceCredential extends BaseCredential {
  service_name: string;
  api_endpoint: string;
  // ... otros campos específicos
}

// Agregar nuevo tipo de formulario
interface NewServiceFormData extends BaseFormData {
  service_name: string;
  api_endpoint: string;
  api_key: string;
  // ... otros campos
}

// Actualizar tipos union
type CredentialType = 'shopify' | 'skyvern' | 'newservice';
type Credential = ShopifyCredential | SkyvernCredential | NewServiceCredential;
type FormData = ShopifyFormData | SkyvernFormData | NewServiceFormData;
```

### Paso 2: Agregar Configuración de Servicio

```tsx
const SERVICE_CONFIGS: Record<CredentialType, ServiceConfig> = {
  // ... configuraciones existentes
  newservice: {
    type: 'newservice',
    name: 'New Service',
    description: 'Description of the new service integration',
    icon: <YourServiceIcon className="w-6 h-6" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    apiEndpoint: '/api/newservice/credentials',
    testEndpoint: '/api/newservice/test',
    fields: [
      { 
        key: 'service_name', 
        label: 'Service Name', 
        type: 'text', 
        placeholder: 'My Service', 
        required: true 
      },
      { 
        key: 'api_endpoint', 
        label: 'API Endpoint', 
        type: 'url', 
        placeholder: 'https://api.service.com', 
        required: true 
      },
      { 
        key: 'api_key', 
        label: 'API Key', 
        type: 'password', 
        placeholder: 'your-api-key', 
        required: true,
        description: 'Your service API key'
      }
    ]
  }
};
```

### Paso 3: Implementar API Routes

Crear los endpoints necesarios:

```typescript
// /app/api/newservice/credentials/route.ts
export async function GET() { /* Listar credenciales */ }
export async function POST() { /* Crear credencial */ }

// /app/api/newservice/credentials/[id]/route.ts  
export async function PUT() { /* Actualizar credencial */ }
export async function DELETE() { /* Eliminar credencial */ }

// /app/api/newservice/test/[id]/route.ts (opcional)
export async function POST() { /* Probar conexión */ }
```

### Paso 4: Actualizar Lógica de Formularios

```tsx
// En getInitialFormData()
case 'newservice':
  return { ...base, service_name: '', api_endpoint: '', api_key: '' } as NewServiceFormData;

// En openEditDialog()
case 'newservice':
  const newServiceCredential = credential as NewServiceCredential;
  setFormData({
    ...baseData,
    service_name: newServiceCredential.service_name,
    api_endpoint: newServiceCredential.api_endpoint,
    api_key: '', // Don't pre-populate sensitive data
  } as NewServiceFormData);
  break;

// En getCredentialDisplayName()
case 'newservice':
  return (credential as NewServiceCredential).service_name;

// En getCredentialSubtitle()
case 'newservice':
  return (credential as NewServiceCredential).api_endpoint;
```

### Paso 5: Crear Componente de Conveniencia

```tsx
export const NewServiceCredentialsManager = () => (
  <CredentialsManager serviceType="newservice" />
);
```

### Paso 6: Integrar en la UI

```tsx
// En /app/agents/manage/page.tsx
import { NewServiceCredentialsManager } from '@/components/common/CredentialsManager';

// Agregar al render
<NewServiceCredentialsManager />
```

## 🔒 Seguridad

### Principios de Seguridad Implementados

1. **Encriptación**: Las API keys se almacenan encriptadas en la base de datos
2. **No exposición**: Los campos sensibles no se pre-populan en edición
3. **Validación**: Validación tanto en frontend como backend
4. **RLS**: Row Level Security en Supabase para aislamiento por usuario

### Mejores Prácticas

- Las credenciales sensibles nunca se exponen en logs
- Los formularios de edición no muestran valores de campos tipo password
- Cada usuario solo puede acceder a sus propias credenciales
- Las pruebas de conexión son seguras y no exponen datos sensibles

## 🎨 Customización

### Temas y Estilos

Cada servicio puede tener su propio esquema de colores:

```tsx
color: 'text-service-600',      // Color del texto
bgColor: 'bg-service-50',       // Color de fondo de la tarjeta
borderColor: 'border-service-200', // Color del borde
icon: <ServiceIcon />,          // Icono personalizado
```

### Campos Personalizados

Tipos de campos soportados:
- `text`: Campo de texto normal
- `password`: Campo de contraseña (oculto)
- `url`: Campo de URL con validación

## 📊 Estados y Feedback

### Estados de Carga
- Loading inicial de credenciales
- Testing de conexiones individuales
- Guardado/actualización de formularios

### Feedback Visual
- Badges de estado (Active/Inactive)
- Iconos de estado de conexión
- Animaciones de transición suaves
- Notificaciones toast para acciones

## 🔮 Extensiones Futuras

### Funcionalidades Planeadas

1. **Backup/Restore**: Exportar/importar configuraciones
2. **Auditoría**: Log de cambios en credenciales
3. **Rotación Automática**: Rotación programada de API keys
4. **Validación Avanzada**: Campos con validación personalizada
5. **Grupos**: Organización de credenciales por grupos/proyectos

### Nuevos Tipos de Campo

```tsx
// Campos futuros
{ type: 'select', options: [...] }     // Dropdown
{ type: 'textarea', rows: 4 }          // Texto multilinea  
{ type: 'file', accept: '.json' }      // Upload de archivos
{ type: 'json', schema: {...} }        // Editor JSON
```

## 🔧 Troubleshooting

### Problemas Comunes

1. **Error de API endpoint**: Verificar que las rutas API estén implementadas
2. **Error de tipos**: Asegurar que todos los tipos estén actualizados
3. **Error de autenticación**: Verificar que el usuario esté autenticado
4. **Error de permisos**: Revisar políticas RLS en Supabase

### Debug

Habilitar logs de debug en desarrollo:

```tsx
const DEBUG = process.env.NODE_ENV === 'development';
if (DEBUG) console.log('Credential operation:', { action, data });
```

## 📝 Changelog

### v1.0.0
- ✅ Implementación inicial con Shopify y Skyvern
- ✅ Sistema de configuración escalable
- ✅ Encriptación de credenciales
- ✅ Testing de conexiones
- ✅ UI responsive con animaciones

### Próximas Versiones
- 🔄 v1.1.0: Soporte para más tipos de campos
- 🔄 v1.2.0: Sistema de backup/restore
- 🔄 v1.3.0: Auditoría y logging avanzado
