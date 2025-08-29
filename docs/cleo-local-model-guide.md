# Cleo Local Model Architecture & Training Guide

This comprehensive guide explains how Cleo's local model system works: architecture, training methodology, prompt engineering, token management, and optimization strategies for local inference.

## Table of Contents

1. [Model Architecture Overview](#model-architecture-overview)
2. [Local Model Configuration](#local-model-configuration)
3. [Training & Fine-tuning Strategy](#training--fine-tuning-strategy)
4. [Prompt Engineering System](#prompt-engineering-system)
5. [Token Management & Optimization](#token-management--optimization)
6. [Performance Optimization](#performance-optimization)
7. [Troubleshooting & Debugging](#troubleshooting--debugging)
8. [Future Improvements](#future-improvements)

---

## Model Architecture Overview

Cleo's local model system is designed for privacy-first, cost-effective AI inference with a focus on empathetic, helpful responses. The architecture consists of multiple layers:

### Core Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Input    │───▶│  Prompt Builder  │───▶│  Local Model    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Personality    │    │   Context RAG    │    │   Response      │
│  Settings       │    │   Retrieval      │    │   Generation    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Model Stack

- **Primary Model**: Llama 3.1 8B (via Ollama)
- **Fallback Models**: Grok-3 Mini, GPT-4o Mini
- **Local Inference**: Ollama server on localhost:11434
- **Cloud Fallback**: Automatic failover for complex tasks

### Key Design Principles

1. **Privacy-First**: All processing happens locally by default
2. **Cost-Effective**: Minimal API costs through local inference
3. **Empathetic AI**: Specialized prompts for emotional intelligence
4. **Multi-Modal**: Support for text, vision, and tool integration
5. **Adaptive**: Dynamic prompt selection based on context and user preferences

---

## Local Model Configuration

### Model Specifications

```typescript
// Primary local model configuration
{
  id: "langchain:balanced-local",
  name: "Cleo v1 (llama3 8B)",
  provider: "LangChain",
  contextWindow: 32000, // 32K tokens
  maxTokens: 4096,      // Output limit
  temperature: 0.7,     // Balanced creativity
  inputCost: 0.01,      // Local processing cost
  outputCost: 0.05,
  speed: "Fast",
  intelligence: "High"
}
```

### Environment Setup

```bash
# Required environment variables
OLLAMA_BASE_URL=http://localhost:11434
DISABLE_OLLAMA=false  # Enable local models
NODE_ENV=development # For local development

# Model installation
ollama pull llama3.1:8b
ollama serve
```

### Model Detection & Auto-Configuration

The system automatically detects available Ollama models:

```typescript
async function detectOllamaModels(): Promise<ModelConfig[]> {
  // Fetches available models from Ollama API
  // Maps them to Cleo's ModelConfig format
  // Applies local optimizations
}
```

---

## Training & Fine-tuning Strategy

### Base Model Selection

Cleo uses **Llama 3.1 8B** as the foundation model because:

- **Size**: 8B parameters provide good balance of capability vs. resource usage
- **Performance**: Optimized for conversational AI tasks
- **Compatibility**: Excellent Ollama integration
- **Licensing**: Open-source, allowing local deployment

### Training Approach

Instead of full fine-tuning (which requires significant compute), Cleo uses:

#### 1. Prompt Engineering
- **System Prompts**: Carefully crafted instructions that shape model behavior
- **Few-shot Learning**: Examples within prompts for consistent responses
- **Context Injection**: Dynamic context addition via RAG

#### 2. Parameter Optimization
- **Temperature**: 0.7 for balanced creativity vs. consistency
- **Top-P**: Default sampling for natural responses
- **Max Tokens**: 4096 output limit for comprehensive responses
- **Context Window**: 32K for handling complex conversations

#### 3. Behavioral Shaping
- **Identity Reinforcement**: Consistent "Cleo from Huminary Labs" branding
- **Anti-Hallucination**: Explicit rules against fabricating information
- **Safety Guards**: Built-in safeguards for harmful content

### Fine-tuning Strategy

For future improvements, consider:

```python
# Potential fine-tuning approach
training_config = {
    "base_model": "llama3.1:8b",
    "training_data": [
        "empathetic_responses.jsonl",
        "technical_assistance.jsonl", 
        "creative_tasks.jsonl"
    ],
    "hyperparameters": {
        "learning_rate": 2e-5,
        "batch_size": 4,
        "epochs": 3,
        "lora_rank": 16
    }
}
```

---

## Prompt Engineering System

### Prompt Architecture

Cleo uses a modular prompt system with multiple layers:

```
┌─────────────────────────────────────┐
│        CLEO IDENTITY HEADER         │
│  (Top Priority - Never Removed)     │
└─────────────────────────────────────┘
                │
┌─────────────────────────────────────┐
│       CORE PERSONALITY MODULE       │
│  (Empathetic, Helpful, Concise)     │
└─────────────────────────────────────┘
                │
┌─────────────────────────────────────┐
│     SPECIALIZATION MODULES          │
│  (Journalism, Developer, etc.)      │
└─────────────────────────────────────┘
                │
┌─────────────────────────────────────┐
│      CONTEXT & RAG MODULE           │
│  (Dynamic Knowledge Injection)      │
└─────────────────────────────────────┘
```

### Prompt Variants

Cleo supports multiple prompt variants for different use cases:

#### 1. Default Prompt
```typescript
buildCleoSystemPrompt(modelName)
// Core empathetic assistant with general capabilities
```

#### 2. Local-Optimized Prompt
```typescript
buildLocalCleoSystemPrompt(modelName)
// Anti-hallucination focused for local models
```

#### 3. Llama 3.1 Optimized
```typescript
buildLlama31OptimizedPrompt(modelName)
// Meta-specific optimizations and best practices
```

#### 4. Specialized Prompts
- **Journalism**: Content creation and community management
- **Developer**: Code assistance and technical guidance
- **Cybersecurity**: Educational focus with safety disclaimers

### Dynamic Prompt Selection

The system automatically selects prompts based on:

```typescript
function selectPromptVariant(model: string, context: string): string {
  if (model.includes('llama')) return 'llama31'
  if (isLocalModel(model)) return 'local'
  if (context.includes('code')) return 'developer'
  return 'default'
}
```

### Personality Customization

Users can customize Cleo's personality:

```typescript
interface PersonalitySettings {
  personalityType: 'empathetic' | 'professional' | 'creative'
  creativityLevel: number    // 0-10
  formalityLevel: number     // 0-10  
  enthusiasmLevel: number    // 0-10
  helpfulnessLevel: number   // 0-10
}
```

---

## Token Management & Optimization

### Token Limits & Context Window

```typescript
// Model capabilities
const MODEL_LIMITS = {
  "llama3.1:8b": {
    contextWindow: 32000,
    maxOutput: 4096,
    inputCost: 0,      // Local
    outputCost: 0      // Local
  }
}
```

### Context Management Strategy

1. **Priority-Based Trimming**
   - Identity header (highest priority)
   - Recent conversation history
   - RAG context (if relevant)
   - System instructions

2. **Smart Chunking**
   - Conversation divided into semantic chunks
   - Important messages preserved
   - Redundant information compressed

3. **Memory Optimization**
   - Stateless design for scalability
   - Context reconstruction from message history
   - Efficient token counting and budgeting

### Output Token Optimization

```typescript
// Response length control
const RESPONSE_CONTROLS = {
  maxTokens: 4096,
  temperature: 0.7,
  stopSequences: ["\n\n---", "Sources:"],
  formatInstructions: "Keep responses concise but comprehensive"
}
```

---

## Performance Optimization

### Local Inference Optimizations

1. **Model Quantization**
   ```bash
   # Use quantized models for better performance
   ollama pull llama3.1:8b-instruct-q4_0
   ```

2. **GPU Acceleration**
   ```bash
   # Enable GPU if available
   export OLLAMA_GPU_LAYERS=35
   ```

3. **Memory Management**
   - Model unloading when not in use
   - Context window optimization
   - Batch processing for multiple requests

### Response Time Optimization

```typescript
// Performance monitoring
const PERFORMANCE_METRICS = {
  averageResponseTime: 0,
  tokenThroughput: 0,
  memoryUsage: 0,
  cacheHitRate: 0
}
```

### Caching Strategy

1. **Prompt Caching**: Frequently used prompts cached
2. **Context Caching**: Recent conversation context preserved
3. **Model Caching**: Keep model loaded in memory

---

## Troubleshooting & Debugging

### Common Issues

#### 1. Model Not Loading
```bash
# Check Ollama status
ollama list
ollama serve

# Verify model installation
ollama pull llama3.1:8b
```

#### 2. Slow Responses
```typescript
// Check system resources
const diagnostics = {
  cpuUsage: process.cpuUsage(),
  memoryUsage: process.memoryUsage(),
  gpuAvailable: checkGPUStatus()
}
```

#### 3. Hallucinations
- Verify prompt anti-hallucination rules
- Check context quality
- Review model temperature settings

### Debug Logging

```typescript
// Enable detailed logging
const DEBUG_CONFIG = {
  enablePromptLogging: true,
  enableTokenCounting: true,
  enablePerformanceMetrics: true,
  logLevel: 'debug'
}
```

### Performance Monitoring

```typescript
// Real-time metrics
const monitor = {
  responseTime: measureResponseTime(),
  tokenUsage: countTokens(),
  memoryFootprint: getMemoryUsage(),
  errorRate: calculateErrorRate()
}
```

---

## Future Improvements

### 1. Advanced Fine-tuning

```python
# Planned fine-tuning pipeline
fine_tuning_plan = {
  "data_collection": {
    "conversational_data": "1M+ examples",
    "domain_specific": "technical, creative, emotional",
    "quality_filtering": "human-reviewed samples"
  },
  "training_methodology": {
    "lora_fine_tuning": "Parameter-efficient training",
    "instruction_tuning": "Task-specific optimization",
    "preference_learning": "User preference alignment"
  },
  "evaluation_metrics": {
    "empathy_score": "Emotional intelligence measurement",
    "task_completion": "Success rate on user requests",
    "response_quality": "Human evaluation scores"
  }
}
```

### 2. Multi-Model Orchestration

```typescript
// Advanced model routing
const MODEL_ROUTER = {
  "simple_questions": "llama3.1:8b",
  "complex_reasoning": "gpt-4o-mini", 
  "creative_tasks": "claude-3-haiku",
  "technical_code": "deepseek-coder"
}
```

### 3. Context Optimization

```typescript
// Advanced context management
const CONTEXT_OPTIMIZER = {
  "semantic_chunking": "Meaning-based context division",
  "importance_scoring": "Content relevance ranking",
  "compression": "Lossless context compression",
  "memory": "Long-term conversation memory"
}
```

### 4. Performance Enhancements

```typescript
// Performance roadmap
const PERFORMANCE_ROADMAP = {
  "quantization": "4-bit and 2-bit model variants",
  "speculative_decoding": "Faster inference techniques",
  "model_distillation": "Smaller, faster models",
  "caching": "Advanced prompt and context caching"
}
```

---

## Architecture Summary

Cleo's local model system represents a sophisticated approach to privacy-preserving AI:

- **Foundation**: Llama 3.1 8B with Ollama for local inference
- **Intelligence**: Advanced prompt engineering instead of compute-intensive fine-tuning
- **Adaptability**: Dynamic prompt selection and personality customization
- **Performance**: Optimized for local hardware with intelligent context management
- **Extensibility**: Modular architecture supporting future enhancements

The system balances technical sophistication with practical deployment constraints, making advanced AI accessible while maintaining user privacy and control.

---

## Quick Reference

### Key Files
- `lib/models/`: Model configurations and types
- `lib/prompts/`: Prompt engineering system
- `lib/openproviders/`: Local model providers
- `app/api/chat/`: Chat endpoint with token management

### Environment Variables
```bash
OLLAMA_BASE_URL=http://localhost:11434
DISABLE_OLLAMA=false
NODE_ENV=development
```

### Model Commands
```bash
ollama pull llama3.1:8b
ollama serve
ollama list
```

This architecture provides a solid foundation for empathetic, capable AI while maintaining the flexibility to evolve with new techniques and requirements.
