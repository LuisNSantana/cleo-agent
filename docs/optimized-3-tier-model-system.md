# Optimized 3-Tier Model System with Robust Fallbacks

## Overview

Based on extensive 2025 cost-effectiveness analysis and performance benchmarks, Cleo Agent now uses a streamlined 3-tier model system with automatic fallbacks to ensure robust operation and excellent multimodal capabilities.

## The 3 Tiers (Updated)

### 🚀 Fast (claude-3-5-haiku-latest)
- **Provider**: Anthropic (Primary)
- **Cost**: $0.25 input / $1.25 output per 1M tokens
- **Best for**: Quick document analysis, image processing, general chat
- **Features**: 
  - Excellent vision capabilities for documents and images ✅
  - Lightning-fast responses with 200K context
  - Advanced tool calling and reasoning
  - Perfect for multimodal tasks
- **Fallback**: Grok-3 Mini (xAI) - ultra-fast text-only when primary fails
- **Use cases**: Document analysis, image processing, quick questions, daily tasks

### ⚖️ Balanced (gpt-oss-120b)  
- **Provider**: Groq (Primary)
- **Cost**: $0.2 input / $0.4 output per 1M tokens
- **Best for**: High-volume text processing, best price/performance
- **Features**:
  - OpenAI's 120B open-source model on Groq's LPU infrastructure
  - Ultra-fast inference speed
  - Strong reasoning and tool support
  - Excellent for code and text generation
- **Fallback**: Mistral Large - reliable reasoning when primary fails
- **Use cases**: Code generation, bulk text processing, reasoning tasks

### 🧠 Smarter (gpt-5-mini-2025-08-07)
- **Provider**: OpenAI (Primary)
- **Cost**: $2.0 per 1M tokens (input/output)
- **Best for**: Complex reasoning, creative tasks, advanced analysis
- **Features**:
  - GPT-5 architecture with cutting-edge capabilities
  - Advanced vision and multimodal support ✅
  - Superior creative and analytical reasoning
  - 400K context window
- **Fallback**: Claude 3.5 Sonnet - premium vision when primary fails
- **Use cases**: Strategic analysis, complex problem-solving, creative work

## Key Improvements

### ✅ **Vision-First Design**
- **Fast tier now prioritizes vision**: Claude 3.5 Haiku ensures all users can analyze documents and images
- **No more vision limitations**: Unlike Grok-3 Mini, all primary models support multimodal tasks
- **Smart recommendations**: System automatically suggests vision-capable models for document tasks

### ✅ **Robust Fallback System**
- **Automatic failover**: When primary models are unavailable, system seamlessly switches to fallbacks
- **Provider diversity**: Fallbacks use different providers to avoid single points of failure
- **Final safety net**: GPT-4o-mini as ultimate fallback ensures system always works

### ✅ **Cost Optimization**
- **Balanced tier**: Best value with GPT-OSS 120B via Groq ($0.2/$0.4 vs Claude's $0.25/$1.25)
- **Vision accessibility**: Fast tier provides vision at reasonable cost
- **Smart routing**: System recommends most cost-effective model for each task

## Access Levels (Updated)

### Guest Users (Non-authenticated)
- ✅ **Fast** (Claude 3.5 Haiku) - Vision support ✅
- ✅ **Fast Fallback** (Grok-3 Mini) - Text-only but reliable
- ❌ Balanced - Requires authentication
- ❌ Smarter - Requires authentication

### Free Users (Authenticated)
- ✅ **Fast** (Claude 3.5 Haiku) - Vision support ✅
- ✅ **Balanced** (GPT-OSS 120B) - Best price/performance ✅
- ✅ **All Fallbacks** - Reliable backup options ✅
- ❌ Smarter - Pro tier only

### Pro Users
- ✅ **All tiers including Smarter** (GPT-5 Mini) ✅
- ✅ **Full fallback chain** - Maximum reliability ✅
- ✅ **Higher usage limits** ✅

## Fallback Chain Examples

```
Fast Tier Request:
├── Try: claude-3-5-haiku-latest (vision ✅)
├── Fallback: grok-3-mini-fallback (fast text)
└── Final: gpt-4o-mini (safety net)

Balanced Tier Request:
├── Try: gpt-oss-120b (groq speed ✅)
├── Fallback: mistral-large-latest-fallback (reasoning)
└── Final: gpt-4o-mini (safety net)

Smarter Tier Request:
├── Try: gpt-5-mini-2025-08-07 (advanced ✅)
├── Fallback: claude-3-5-sonnet-latest-fallback (premium)
└── Final: gpt-4o-mini (safety net)
```

## Document & Vision Task Routing

The system automatically recommends the best model for vision tasks:

- **Image/Document upload detected** → Fast tier (Claude 3.5 Haiku) recommended
- **Text-only task** → Balanced tier (GPT-OSS 120B) for best speed/cost
- **Complex analysis needed** → Smarter tier (GPT-5 Mini) for advanced reasoning

## Migration from Previous System

### What Changed
- **Fast tier**: Grok-3 Mini → Claude 3.5 Haiku (better vision support)
- **Balanced tier**: Claude 3.5 Haiku → GPT-OSS 120B (better price/performance)
- **Added fallbacks**: Each tier now has reliable backup options
- **Improved vision**: All tiers can handle multimodal tasks effectively

### Why These Changes
1. **User feedback**: Vision capabilities were limited with Grok-3 Mini
2. **Cost analysis**: GPT-OSS 120B via Groq offers better value than Claude for text tasks
3. **Reliability**: Fallback system prevents service interruptions
4. **Multimodal focus**: All primary models now support document/image analysis

This system ensures users always have access to high-quality, cost-effective models with excellent vision capabilities and robust fallback options.
- ✅ **Balanced** - Claude 3.5 Haiku 
- ❌ Smarter - Requires subscription/credits

### Pro Users
- ✅ **Fast** - xAI Grok-3 Mini
- ✅ **Balanced** - Claude 3.5 Haiku
- ✅ **Smarter** - OpenAI GPT-5 Mini

## Technical Implementation

### Model Configuration
- **File**: `lib/models/data/optimized-tiers.ts`
- **Export**: Single optimized models array with 3 options
- **Icons**: Custom tier icons (faster, balanced, smarter)

### Model Selection Logic
- **Default Authenticated**: Balanced (claude-3-5-haiku-latest)
- **Default Guest**: Fast (grok-3-mini)
- **Free Models**: Fast + Balanced
- **Disabled**: All legacy model variants

### Provider Integration
- **xAI**: Direct SDK integration for Grok-3 Mini
- **Anthropic**: Via AI SDK and OpenProviders
- **OpenAI**: Via AI SDK and OpenProviders

## Benefits

1. **Simplified Choice**: Clear use-case alignment
2. **Cost Optimization**: Best price/performance per tier
3. **Performance**: Each model optimized for its use case
4. **Scalability**: Easy to adjust pricing/access per tier
5. **User Experience**: Clear value proposition per option

## Cost Analysis (January 2025)

| Tier | Cost per 1M tokens | Use Case | Quality Rating |
|------|-------------------|----------|----------------|
| Fast | $0.40 | Speed + Live Search | ⭐⭐⭐ |
| Balanced | $0.25-$1.25 | Daily productivity | ⭐⭐⭐⭐ |
| Smarter | $2.00 | Advanced reasoning | ⭐⭐⭐⭐⭐ |

This represents a 70% cost reduction vs premium-only options while maintaining quality coverage across all use cases.
