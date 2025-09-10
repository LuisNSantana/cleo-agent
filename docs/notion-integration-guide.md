# Guía Completa de Integración con Notion

## Visión General

La integración de Notion con Cleo Agent transforma tu workspace de Notion en un entorno dinámico y automatizado. Al conectar tu cuenta de Notion, permites que los agentes de IA realicen una amplia gama de tareas directamente en tus páginas y bases de datos, desde la creación de contenido y la gestión de proyectos hasta el análisis de datos y la automatización de flujos de trabajo.

Esta guía proporciona una descripción completa de cómo configurar la integración, las herramientas disponibles y los casos de uso que puedes implementar con tus agentes.

## Getting Your Notion API Key

### New Token Format (September 2024 Update)
⚠️ **Important:** As of September 25, 2024, new Notion API tokens use the `ntn_` prefix instead of `secret_`. The setup process remains the same, but tokens now look like `ntn_1234567890abcdef...`

1. **Create a Notion Integration:**
   - Go to [https://www.notion.com/my-integrations](https://www.notion.com/my-integrations)
   - Click **"+ New integration"**
   - Enter a name for your integration (e.g., "Cleo Agent")
   - Select the workspace you want to connect
   - Click **"Submit"**

2. **Get Your API Secret:**
   - After creating the integration, you'll see the integration details page
   - In the **"Configuration"** section, copy your **"Internal Integration Secret"**
   - **New tokens start with `ntn_`** (older tokens may still start with `secret_`)
   - This token is your API key - **Keep this secret secure!**

3. **Give Integration Permissions:**
   - In your Notion workspace, go to the page you want the integration to access
   - Click the **"Share"** button in the top-right
   - Click **"Add people, emails, groups, or integrations"**
   - Find and select your integration
   - Choose the appropriate permissions level

### Alternative Method (Through Notion Settings):
1. In your Notion workspace, go to **Settings** → **Integrations** tab
2. Click **"Develop your own integrations"** at the bottom
3. This will open [https://www.notion.com/my-integrations](https://www.notion.com/my-integrations)
4. Follow steps 1-3 above

¡Listo! Tus agentes ahora tienen permiso para usar las herramientas de Notion en las páginas y bases de datos que hayas autorizado.

## Catálogo de Herramientas de Notion

La integración incluye más de 20 herramientas especializadas, organizadas en las siguientes categorías:

### 📄 Gestión de Páginas

Herramientas para crear, leer, actualizar y organizar páginas individuales.

| Herramienta                      | Descripción                                                              |
| -------------------------------- | ------------------------------------------------------------------------ |
| `get-notion-page`                | Obtiene información detallada de una página, incluyendo sus propiedades. |
| `create-notion-page`             | Crea una nueva página con título, contenido y propiedades personalizadas. |
| `update-notion-page`             | Actualiza las propiedades de una página existente (ej. estado, fecha).   |
| `archive-notion-page`            | Archiva una página, moviéndola a la papelera.                            |
| `get-notion-page-property`       | Extrae el valor de una propiedad específica de una página.               |

### 🗃️ Gestión de Bases de Datos

Herramientas para interactuar con bases de datos y sus entradas.

| Herramienta                      | Descripción                                                              |
| -------------------------------- | ------------------------------------------------------------------------ |
| `get-notion-database`            | Obtiene el esquema y los metadatos de una base de datos.                 |
| `query-notion-database`          | Realiza consultas avanzadas con filtros y ordenación en una base de datos. |
| `create-notion-database`         | Crea una nueva base de datos con un esquema de propiedades personalizado. |
| `update-notion-database`         | Modifica el esquema o las propiedades de una base de datos existente.    |
| `get-notion-database-schema`     | Obtiene la definición completa del esquema y las propiedades.            |
| `create-notion-database-entry`   | Añade una nueva entrada (página) a una base de datos.                    |

### 🧱 Gestión de Bloques

Herramientas para manipular el contenido dentro de las páginas.

| Herramienta                      | Descripción                                                              |
| -------------------------------- | ------------------------------------------------------------------------ |
| `get-notion-block-children`      | Obtiene todos los bloques de contenido de una página o bloque padre.     |
| `append-notion-blocks`           | Añade nuevos bloques de contenido (texto, listas, etc.) a una página.    |
| `get-notion-block`               | Obtiene los detalles de un bloque de contenido específico.               |
| `update-notion-block`            | Actualiza el contenido de un bloque existente.                           |
| `delete-notion-block`            | Elimina (archiva) un bloque de contenido.                                |
| `create-notion-block`            | Crea y añade bloques usando una interfaz simplificada.                   |
| `add-notion-text-content`        | Añade rápidamente contenido de texto (párrafos, encabezados) a una página. |

### 🔍 Búsqueda y Usuarios

Herramientas para encontrar información y gestionar usuarios en el workspace.

| Herramienta                      | Descripción                                                              |
| -------------------------------- | ------------------------------------------------------------------------ |
| `search-notion-workspace`        | Busca páginas y bases de datos en todo el workspace.                     |
| `search-notion-pages`            | Busca específicamente páginas que coincidan con una consulta.            |
| `search-notion-databases`        | Busca específicamente bases de datos.                                    |
| `list-notion-users`              | Lista todos los usuarios (personas y bots) del workspace.                |
| `get-notion-user`                | Obtiene información detallada sobre un usuario específico.               |
| `get-notion-current-user`        | Obtiene información sobre el usuario autenticado (la propia integración). |

## Casos de Uso para Agentes

Aquí tienes algunos ejemplos de lo que tus agentes pueden hacer ahora con Notion:

#### Asistente de Contenido
- **Tarea:** "Escribe un borrador sobre las últimas tendencias en IA, guárdalo en una nueva página de Notion en la base de datos 'Blog Posts' y ponle el estado 'Borrador'."
- **Herramientas utilizadas:** `create-notion-database-entry`, `append-notion-blocks`.

#### Gestor de Proyectos
- **Tarea:** "Revisa la base de datos 'Proyectos', encuentra todas las tareas asignadas a 'Juan' que estén 'Atrasadas' y crea una nueva página de resumen con una lista de estas tareas."
- **Herramientas utilizadas:** `query-notion-database`, `create-notion-page`, `add-notion-text-content`.

#### Analista de Datos
- **Tarea:** "Busca en el workspace todos los informes de ventas del último trimestre, extrae las cifras clave de cada uno y crea una nueva página con una tabla de resumen."
- **Herramientas utilizadas:** `search-notion-pages`, `get-notion-block-children`, `create-notion-page`, `append-notion-blocks`.

#### Automatizador de Reuniones
- **Tarea:** "Después de una reunión, toma la transcripción, crea una nueva página en la base de datos 'Reuniones', resume los puntos clave, extrae las acciones a realizar y asigna las tareas creando nuevas entradas en la base de datos 'Tareas'."
- **Herramientas utilizadas:** `create-notion-page`, `add-notion-text-content`, `create-notion-database-entry`.

## Presets de Agentes Recomendados

Para empezar rápidamente, puedes configurar agentes con estos conjuntos de herramientas recomendados:

-   **Escritor de Contenido:**
    -   `create-notion-page`
    -   `add-notion-text-content`
    -   `update-notion-page`
    -   `search-notion-pages`

-   **Gestor de Datos:**
    -   `query-notion-database`
    -   `create-notion-database-entry`
    -   `update-notion-database`
    -   `get-notion-database-schema`

-   **Asistente de Conocimiento:**
    -   `search-notion-workspace`
    -   `get-notion-page`
    -   `get-notion-block-children`
    -   `search-notion-databases`

-   **Jefe de Proyecto:**
    -   `create-notion-database`
    -   `create-notion-database-entry`
    -   `query-notion-database`
    -   `update-notion-page`
    -   `list-notion-users`

## Conclusión

La integración de Notion es una de las más potentes de Cleo Agent, abriendo un sinfín de posibilidades para la automatización y la productividad. Experimenta combinando estas herramientas para crear flujos de trabajo personalizados y deja que tus agentes se encarguen del trabajo pesado en tu workspace de Notion.
