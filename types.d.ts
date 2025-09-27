/// <reference types="node" />

// Re-export the project's Supabase Database types so all imports from "@/types.d" use the single source of truth.
// This aligns server/browser Supabase clients with the comprehensive schema in app/types/database.types.ts
export type { Database, Json } from '@/app/types/database.types'

// Augment global window for potential debug of image generation state
declare global {
	interface Window {
		__cleoImageGenerationLock?: boolean
	}
}
