# Guía de Optimización de Skyvern para Formularios

## 🎯 Mejores Prácticas para Prompts de Formularios

Basado en la documentación oficial de Skyvern y ejemplos reales de producción.

### 📋 Anatomía de un Prompt Efectivo

Según la guía oficial de Skyvern, todo prompt debe tener:

1. **[Obligatorio] Objetivo principal**
2. **Guardarrieles/detalles específicos** 
3. **Payload/información** que Skyvern usa en los campos
4. **[Obligatorio] Criterio de terminación/completitud**

### ✅ LO QUE SÍ DEBES HACER

1. **Ser muy claro sobre tu objetivo principal y criterios de completitud**
   - Regla de oro: si alguien lo lee sin contexto visual, ¿lo entendería?
   - Usa palabras clave como "complete" o "terminate" para que Skyvern sepa cuándo la tarea está lista

2. **Empezar general y volverse específico con las pruebas**
   - Hacer el workflow más general primero significa mayor probabilidad de generalización
   - Usar parámetros en campos de objetivo para hacer el workflow ajustable

3. **Usar indicadores visuales claros y frases para capturar el objetivo**
   - Ejemplo: "usando el dropdown de ventas en la parte superior de la página"
   - "para navegar a facturas, el botón tiene un ícono de recibo"

### ❌ LO QUE NO DEBES HACER

1. **No ser unclear** - Asegúrate de que los objetivos sean claros, basados en elementos visuales
2. **No proporcionar muy poca información** - Si necesitas login, proporciona credenciales, URL, etc.
3. **No hacer una lista de acciones** a menos que sea absolutamente necesario
4. **No nombrar elementos HTML** - algunos son accesibles, pero no todos

### 🔧 Optimizaciones Específicas para Formularios

#### 1. Estructura de Prompt Optimizada

```
Your goal is to fill out the [TIPO_FORMULARIO] form completely and accurately. Only fill out required fields that you have information for. [INSTRUCCIONES_ESPECIALES_SI_LAS_HAY]

Here is the information you need to complete the form:
{{complete_payload}}

IMPORTANT DETAILS:
- Take your time to read each field label carefully
- If a field is marked with * or "required", it must be filled
- For dropdown menus, select the closest matching option
- For date fields, use MM/DD/YYYY format unless specified otherwise
- For phone numbers, include area code: (XXX) XXX-XXXX
- If you encounter a CAPTCHA, solve it before proceeding

Your goal is complete when you have:
1. Filled out all required fields with the provided information
2. Successfully submitted the form
3. Received a confirmation message or reached a confirmation page

You will know your goal is complete when you see [INDICADOR_ESPECÍFICO_DE_ÉXITO].
```

#### 2. Ejemplos de Prompts Optimizados

**Para Formulario de Contacto:**
```
Your goal is to fill out the contact form completely with the provided business information. Only fill out required fields that you have information for.

Here is the information you need to complete the form:
Company: {{company_name}}
Contact Person: {{contact_name}}
Email: {{email_address}}
Phone: {{phone_number}}
Message: {{inquiry_message}}

IMPORTANT DETAILS:
- If there are dropdown menus for "Inquiry Type" or "Department", select "General Inquiry" or "Sales"
- For phone number, use format: (555) 123-4567
- Take screenshots after filling but before submitting for verification
- Fill the message field with the provided inquiry text exactly as given

Your goal is complete when you have filled out all required fields and successfully submitted the form. You will know your goal is complete when you see a confirmation message that says "Thank you" or "Message sent" or you are redirected to a confirmation page.
```

**Para Formulario de Registro/Cuenta:**
```
Your goal is to create a new account by filling out the registration form with the provided user information. Complete all required fields marked with asterisks (*).

Here is the information you need to create the account:
{{user_registration_data}}

IMPORTANT DETAILS:
- For password fields, use the provided password exactly as given
- If password confirmation is required, enter the same password in both fields
- For security questions, select the first available option
- Accept terms and conditions if required by checking the checkbox
- If email verification is needed, note that in your completion message
- For date of birth, use MM/DD/YYYY format

Your goal is complete when you have:
1. Filled out all required registration fields
2. Successfully submitted the registration form
3. Either received a "Account created successfully" message OR been redirected to an email verification page

You will know your goal is complete when you see a success confirmation or are prompted to verify your email address.
```

**Para Formulario de Aplicación/Quote:**
```
Your goal is to fill out the application form to request a quote. Provide all required information accurately and proceed through any multi-step process.

Here is the information you need for the application:
{{quote_application_data}}

IMPORTANT DETAILS:
- This may be a multi-step form - complete each step fully before proceeding
- For address information, you may need to click an "Add Address" button to open a popup modal
- Select appropriate options from dropdown menus based on the provided data
- If asked about coverage amounts or preferences, select standard/basic options unless specified
- Take your time with each section - accuracy is more important than speed
- If you encounter CAPTCHA or verification steps, complete them before moving forward

Your goal is complete when you have:
1. Completed all steps of the form (may be multiple pages)
2. Submitted the final application
3. Reached a confirmation page showing your quote details or application reference number

You will know your goal is complete when you see a quote summary, application confirmation number, or message stating "Your application has been submitted."
```

### 🚀 Configuraciones Optimizadas para Skyvern

#### 1. Parámetros Recomendados

```javascript
{
  max_steps: 25, // Aumentado de 10 para formularios complejos
  task_type: "action", // Más determinístico para formularios
  webhook_callback_url: "tu_webhook_url", // Para notificaciones en tiempo real
}
```

#### 2. Estructura de Datos Optimizada

```javascript
const formData = {
  // Información básica
  personal_info: {
    first_name: "Juan",
    last_name: "Pérez",
    email: "juan.perez@example.com",
    phone: "(555) 123-4567"
  },
  
  // Dirección (si es necesaria)
  address: {
    street: "123 Main Street",
    city: "Ciudad",
    state: "Estado",
    zip_code: "12345",
    country: "País"
  },
  
  // Información específica del formulario
  form_specific: {
    // Campos específicos según el tipo de formulario
  }
};
```

### 🔍 Criterios de Terminación Específicos

#### Para diferentes tipos de formularios:

**Contacto:**
- "Thank you for contacting us"
- "Your message has been sent"
- "We'll get back to you soon"

**Registro:**
- "Account created successfully" 
- "Please verify your email"
- "Welcome to [Platform]"

**Aplicaciones/Quotes:**
- "Application submitted"
- "Quote reference: #12345"
- "Your quote is being processed"

### 🐛 Solución de Problemas Comunes

#### 1. La tarea termina muy pronto
**Problema:** El agente piensa que terminó antes de tiempo
**Solución:** 
- Hacer criterios de terminación más específicos
- Agregar pasos de verificación: "Verify all required fields are filled before submitting"

#### 2. La tarea no termina cuando debería
**Problema:** El agente sigue intentando acciones después de completar
**Solución:**
- Usar palabras clave claras: "STOP when you see..."
- Definir estados finales específicos

#### 3. Campos no se llenan correctamente
**Problema:** El agente no identifica los campos correctos
**Solución:**
- Proporcionar descripciones visuales: "the field labeled 'Email Address'"
- Usar formato de datos específico: "phone number in format (XXX) XXX-XXXX"

### 📊 Métricas de Éxito

Para evaluar la efectividad de tus prompts:

1. **Tasa de completitud:** % de formularios completados exitosamente
2. **Precisión de datos:** % de campos llenados correctamente
3. **Tiempo de ejecución:** Tiempo promedio para completar
4. **Tasa de errores:** % de tareas que fallan o requieren intervención

### 🔗 Enlaces de Monitoreo

Skyvern proporciona URLs útiles para monitoreo:
- **Live URL:** `https://app.skyvern.com/tasks/{task_id}/actions`
- **Recording URL:** `https://app.skyvern.com/tasks/{task_id}/recording`
- **Dashboard URL:** `https://app.skyvern.com/tasks/{task_id}`

### 💡 Tips Avanzados

1. **Usa screenshots intermedios:** "Take a screenshot after filling each section"
2. **Maneja errores gracefully:** "If a field shows an error, correct it before proceeding"
3. **Considera workflows multi-paso:** Para formularios muy complejos, divide en múltiples tareas
4. **Testea con diferentes datos:** Asegúrate de que el prompt funciona con variaciones en los datos

---

## 🎬 Ejemplos de Prompts de Producción

### Ejemplo Real - Formulario de Seguro

```
Your goal is to complete the auto insurance quote form by providing all required vehicle and driver information. This is a multi-step process that may include several pages.

Here is the information you need:
Driver Information: {{driver_data}}
Vehicle Information: {{vehicle_data}}
Coverage Preferences: {{coverage_data}}

STEP-BY-STEP GUIDANCE:
1. Start with personal information (name, address, date of birth)
2. Add vehicle details (year, make, model, VIN if available)
3. Select coverage options (use standard coverage unless specified)
4. Review information before final submission

IMPORTANT DETAILS:
- For "Years of driving experience", calculate from license date to current date
- If asked about violations or claims, answer based on provided history
- Select "Own" for vehicle ownership unless specified otherwise
- For coverage limits, choose middle-tier options if unsure
- If prompted about bundling other insurance, select "No" unless instructed

Your goal is complete when you have successfully submitted the quote request and received either:
1. A quote summary with premium amounts, OR
2. A confirmation that your quote is being processed with a reference number

You will know your goal is complete when you see "Your quote" or "Quote reference" or similar confirmation message.
```

Este ejemplo muestra todas las mejores prácticas aplicadas en un caso real de uso.
