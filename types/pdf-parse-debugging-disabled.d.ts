declare module "pdf-parse-debugging-disabled" {
  interface PDFData {
    numpages: number
    numrender: number
    info: Record<string, unknown>
    metadata: Record<string, unknown>
    text: string
    version: string
  }

  function pdf(dataBuffer: Buffer): Promise<PDFData>
  export = pdf
}
