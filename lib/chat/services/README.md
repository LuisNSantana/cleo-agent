# Chat Services

Modular services for the chat API endpoint.

## Services

### Logger (`logger.ts`)
Structured logging with context awareness.

```typescript
import { chatLogger } from '@/lib/chat/services'

chatLogger.setContext({ userId, chatId, model })
chatLogger.debug('Message', { extra: 'data' })
chatLogger.info('Important event')
chatLogger.warn('Warning condition')
chatLogger.error('Error occurred', { error })
```

### Image Generation (`image-generation.ts`)
AI image generation with provider fallbacks.

```typescript
import { imageGenerationService } from '@/lib/chat/services'

const result = await imageGenerationService.generateImage(
  'a beautiful landscape',
  userId,
  isAuthenticated
)
```

### Auth Validation (`auth-validation.ts`)
User authentication and authorization.

```typescript
import { authValidationService } from '@/lib/chat/services'

const result = await authValidationService.validateUser(
  userId,
  isAuthenticated,
  supabase
)
```

### Delegation Detector (`delegation-detector.ts`)
Detects delegation intent from user messages.

```typescript
import { delegationDetectionService } from '@/lib/chat/services'

const intent = await delegationDetectionService.detectIntent(
  messages,
  userId,
  debugMode
)

const hint = delegationDetectionService.createDelegationHint(intent)
```

### Message Processor (`message-processor.ts`)
Processes and converts messages for model compatibility.

```typescript
import { messageProcessorService } from '@/lib/chat/services'

const processed = await messageProcessorService.processMessages(
  messages,
  modelId,
  supportsVision
)

const text = messageProcessorService.extractUserText(message)
const clean = messageProcessorService.createCleanContentForDB(message)
```

## Design Principles

- **Single Responsibility**: Each service has one clear purpose
- **Type Safety**: All interfaces are fully typed
- **Testability**: Services can be mocked and tested independently
- **Reusability**: Used across multiple endpoints
- **Production Ready**: Environment-aware logging and error handling
