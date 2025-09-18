// Minimal type declarations for the `mammoth` package used in Node runtime
// NOTE: There is no official `@types/mammoth` on npm. This file provides
// the subset of the API we use in the project.

declare module "mammoth" {
  export interface MammothMessage {
    type?: string
    message?: string
  }

  export interface MammothResult {
    value: string
    messages: MammothMessage[]
  }

  export interface ExtractInputBuffer {
    buffer: Buffer
  }

  export interface ExtractInputArrayBuffer {
    arrayBuffer: ArrayBufferLike
  }

  export interface ExtractInputPath {
    path: string
  }

  export type ExtractInput =
    | ExtractInputBuffer
    | ExtractInputArrayBuffer
    | ExtractInputPath

  // We only use extractRawText. Other functions like convertToHtml exist,
  // but are omitted for brevity.
  export function extractRawText(
    input: ExtractInput,
    options?: Record<string, unknown>
  ): Promise<MammothResult>
}
