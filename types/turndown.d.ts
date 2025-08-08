declare module 'turndown' {
  interface TurndownServiceOptions {
    headingStyle?: 'setext' | 'atx'
    hr?: string
    bulletListMarker?: string
    codeBlockStyle?: 'indented' | 'fenced'
  }
  class TurndownService {
    constructor(options?: TurndownServiceOptions)
    use(plugin: any): this
    turndown(html: string): string
  }
  export = TurndownService
}

declare module 'turndown-plugin-gfm' {
  export const gfm: any
  export const tables: any
  export const strikethrough: any
}
