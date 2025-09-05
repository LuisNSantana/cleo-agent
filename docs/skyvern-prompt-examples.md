# Ejemplos Prácticos de Prompts Optimizados para Skyvern

## 🎯 Ejemplos de Prompts de Alta Efectividad

### 1. Formulario de Contacto Empresarial

```javascript
// Configuración optimizada
const taskConfig = {
  url: "https://example.com/contact",
  task_type: "action", // Más determinístico para formularios
  max_steps: 25,
  instructions: `Your goal is to fill out the business contact form completely with the provided company information. Only fill out required fields that you have information for.

Here is the information you need to complete the form:
Company Name: Acme Corporation
Contact Person: John Smith
Email Address: john.smith@acme.com
Phone Number: (555) 123-4567
Department: Sales
Message: We are interested in learning more about your enterprise solutions for our growing team of 150+ employees. Please contact us to schedule a demo.

IMPORTANT DETAILS:
- For "Subject" or "Inquiry Type" dropdown, select "Sales Inquiry" or "General Business"
- Use phone format exactly as provided: (555) 123-4567
- For "Company Size" dropdown, select "100-500 employees" if available
- If there's a "How did you hear about us?" field, select "Search Engine" or "Website"
- Take your time to read each field label carefully before filling
- Complete all fields marked with asterisk (*) or labeled "required"

Your goal is complete when you have:
1. Filled out all required fields with the provided information
2. Successfully submitted the form
3. Received a confirmation message

You will know your goal is complete when you see a confirmation message that says "Thank you for contacting us", "Message sent successfully", or you are redirected to a page that says "We'll get back to you soon".`
}
```

### 2. Formulario de Registro/Cuenta de Usuario

```javascript
const registrationConfig = {
  url: "https://platform.com/signup",
  task_type: "action",
  max_steps: 30,
  instructions: `Your goal is to create a new user account by completing the registration form with the provided information. Fill out all required fields marked with asterisks (*).

Here is the information you need to create the account:
First Name: María
Last Name: González
Email: maria.gonzalez@email.com
Password: SecurePass123!
Phone: (555) 987-6543
Date of Birth: 03/15/1990
Company: TechStartup Inc
Job Title: Product Manager

IMPORTANT DETAILS:
- For password confirmation field, enter the exact same password: SecurePass123!
- For date of birth, use MM/DD/YYYY format: 03/15/1990
- For phone number, use format: (555) 987-6543
- If there are security questions, select the first available option from the dropdown
- Check the "I agree to Terms and Conditions" checkbox if required
- If there's a newsletter subscription checkbox, leave it unchecked unless specified
- For "How did you hear about us?" select "Search Engine" if available

Your goal is complete when you have:
1. Filled out all required registration fields
2. Successfully submitted the registration form
3. Either received an "Account created successfully" message OR been redirected to an email verification page

You will know your goal is complete when you see "Welcome to [Platform]", "Account created successfully", "Please verify your email", or you are automatically logged into the new account dashboard.`
}
```

### 3. Solicitud de Cotización de Seguro

```javascript
const insuranceQuoteConfig = {
  url: "https://insurance.com/quote",
  task_type: "action", 
  max_steps: 40, // Mayor número para formularios complejos multi-paso
  instructions: `Your goal is to complete the auto insurance quote application by providing all required vehicle and driver information. This is a multi-step process that may include several pages.

Here is the information you need for the quote:
DRIVER INFORMATION:
- Name: Carlos Mendoza
- Date of Birth: 08/22/1985
- License Number: D12345678
- Years of Driving Experience: 15 years (licensed since 2008)
- Marital Status: Married
- Address: 123 Main St, Austin, TX 78701

VEHICLE INFORMATION:
- Year: 2020
- Make: Honda
- Model: Civic
- VIN: 1HGBH41JXMN109186
- Annual Mileage: 12,000
- Vehicle Use: Personal/Commuting
- Vehicle Ownership: Own

COVERAGE PREFERENCES:
- Liability Coverage: State Minimum
- Comprehensive: Yes
- Collision: Yes
- Deductible: $500

STEP-BY-STEP GUIDANCE:
1. Start with personal information (name, address, date of birth)
2. Add vehicle details (year, make, model, VIN if requested)
3. Select coverage options (use provided preferences or standard options)
4. Review information before final submission

IMPORTANT DETAILS:
- For "Years of driving experience", enter "15" or calculate from license date (2008 to current)
- If asked about violations or accidents, answer "No" unless data provided indicates otherwise
- For vehicle ownership, select "Own" not "Lease" or "Finance"
- If prompted about current insurance, select "No current insurance" unless specified
- For coverage limits, choose middle-tier or standard options if specific amounts not provided
- If asked about bundling other insurance, select "Auto only" or "No"
- Take your time with multi-step forms - complete each section fully before proceeding

Your goal is complete when you have successfully submitted the quote request and received either:
1. A quote summary showing premium amounts and coverage details, OR
2. A confirmation message that your quote is being processed with a reference number, OR
3. A "Thank you" page with next steps for receiving your quote

You will know your goal is complete when you see "Your quote", "Quote reference #", "Premium: $", "Thank you for your quote request", or similar confirmation indicating the application was successfully submitted.`
}
```

### 4. Aplicación de Trabajo en Línea

```javascript
const jobApplicationConfig = {
  url: "https://company.com/careers/apply",
  task_type: "action",
  max_steps: 35,
  instructions: `Your goal is to complete the job application form for the Software Developer position using the provided candidate information. This may involve multiple sections and file uploads.

Here is the candidate information:
PERSONAL INFORMATION:
- Name: Ana Rodriguez
- Email: ana.rodriguez@email.com
- Phone: (555) 444-3333
- Address: 456 Tech Ave, San Francisco, CA 94105
- LinkedIn: linkedin.com/in/ana-rodriguez-dev

EXPERIENCE SUMMARY:
- Current Position: Senior Software Engineer at TechCorp
- Years of Experience: 7 years
- Key Skills: JavaScript, React, Node.js, Python, AWS
- Education: BS Computer Science, Stanford University (2015)
- Availability: 2 weeks notice required

IMPORTANT DETAILS:
- For salary expectations, enter "Competitive" or "Open to discussion"
- For start date, enter "Available with 2 weeks notice"
- If asked about willingness to relocate, select "No" unless specified
- For employment authorization, select "Authorized to work in US"
- Upload resume file if file upload field is present (note the file upload requirement)
- For cover letter, use: "I am excited to apply for the Software Developer position. With 7 years of experience in full-stack development and expertise in modern technologies like React and Node.js, I am confident I can contribute effectively to your team."

FILE UPLOAD HANDLING:
- If resume upload is required, note this requirement in your response
- Continue with form completion even if file upload cannot be completed
- Mark file upload sections as "requires manual completion"

Your goal is complete when you have:
1. Filled out all required application fields
2. Attempted file uploads (note any that require manual completion)
3. Successfully submitted the application
4. Received a confirmation of submission

You will know your goal is complete when you see "Application submitted successfully", "Thank you for applying", an application reference number, or you are redirected to a confirmation page stating your application has been received.`
}
```

### 5. Formulario de Encuesta/Feedback

```javascript
const surveyConfig = {
  url: "https://survey.com/customer-feedback",
  task_type: "action",
  max_steps: 20,
  instructions: `Your goal is to complete the customer feedback survey using the provided responses. Answer all required questions honestly based on the given feedback data.

Here is the feedback information to use:
Customer Experience: Very Satisfied
Product Rating: 4 out of 5 stars
Service Quality: Excellent
Likelihood to Recommend: 9 out of 10
Purchase Frequency: Monthly
Primary Use Case: Business operations
Improvement Suggestions: Faster customer support response times
Additional Comments: Overall very happy with the product quality and features

IMPORTANT DETAILS:
- For rating scales (1-5, 1-10), use the numbers provided above
- For multiple choice questions, select the option that best matches the provided feedback
- For "How long have you been a customer?" select "6 months - 1 year" if available
- If asked about demographics, you may skip optional fields unless marked required
- For open text fields, use the provided comments and suggestions
- Take time to read each question fully before selecting answers

Your goal is complete when you have:
1. Answered all required survey questions
2. Submitted the completed survey
3. Received a confirmation that your responses were recorded

You will know your goal is complete when you see "Thank you for your feedback", "Survey submitted", "Your responses have been recorded", or you are redirected to a page confirming submission.`
}
```

## 🔧 Configuraciones Específicas por Tipo

### Configuración para Formularios Simples (1-2 páginas)
```javascript
{
  task_type: "action",
  max_steps: 15,
  // Usar para formularios de contacto básicos
}
```

### Configuración para Formularios Complejos (multi-paso)
```javascript
{
  task_type: "action", 
  max_steps: 30-40,
  webhook_callback_url: "tu_webhook_url", // Para notificaciones
  // Usar para aplicaciones, cotizaciones, registros complejos
}
```

### Configuración para Formularios con Uploads
```javascript
{
  task_type: "action",
  max_steps: 25,
  // Nota: Los uploads de archivos pueden requerir intervención manual
}
```

## 🎯 Palabras Clave para Criterios de Terminación

### Éxito Confirmado
- "Thank you"
- "Success", "Successful", "Successfully submitted"
- "Confirmation", "Confirmed"
- "Your [form/application/request] has been"
- Reference numbers: "#12345", "Reference:", "ID:"
- "We'll get back to you"
- "Please check your email"

### Indicadores de Proceso Completado
- "Quote summary"
- "Application received" 
- "Account created"
- "Message sent"
- "Submitted successfully"
- "Thank you for your interest"

## ⚠️ Errores Comunes a Evitar

### ❌ Prompt Malo
```
"Fill out the form with this data: name=John, email=john@email.com"
```

### ✅ Prompt Optimizado
```
"Your goal is to fill out the contact form completely. 

Here is the information:
Name: John Smith
Email: john@email.com

Your goal is complete when you see 'Thank you for contacting us'."
```

### ❌ Criterios Vagos
```
"Submit the form when done"
```

### ✅ Criterios Específicos
```
"You will know your goal is complete when you see a confirmation message that says 'Your application has been submitted' or you are redirected to a page with your application reference number."
```

## 📊 Optimización Iterativa

1. **Primer Intento**: Usar template básico
2. **Analizar Resultados**: Revisar qué falló
3. **Ajustar Prompt**: Ser más específico en areas problemáticas
4. **Probar de Nuevo**: Validar mejoras
5. **Documentar**: Guardar versiones exitosas para futuros usos

## 🔗 Links de Monitoreo Automático

Cada tarea de Skyvern incluye automáticamente:
- **Live URL**: Para ver progreso en tiempo real
- **Recording URL**: Para replay de la automatización
- **Dashboard URL**: Para vista completa de la tarea
- **Task Management**: `/agents/tasks` para historial completo
