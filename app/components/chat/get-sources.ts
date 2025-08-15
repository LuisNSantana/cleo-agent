export function getSources(parts: any[] | undefined) {
  const sources = parts
    ?.filter((part) => part && (part.type === "source-url" || part.type === "source-document" || part.type === "tool-invocation"))
    .map((part) => {
      if (part.type === "source-url" || part.type === "source-document") {
        return part.source
      }

      if (part.type === "tool-invocation" && part.toolInvocation?.state === "result") {
        const result = part.toolInvocation.result

        // summarizeSources tool shape: result.result[*].citations
        if (part.toolInvocation.toolName === "summarizeSources" && result?.result?.[0]?.citations) {
          return result.result.flatMap((item: { citations?: unknown[] }) => item.citations || [])
        }

        return Array.isArray(result) ? result.flat() : result
      }

      return null
    })
    .filter(Boolean)
    .flat()

  const validSources =
    (sources || []).filter(
      (source: any) => source && typeof source === "object" && source.url && source.url !== ""
    )

  return validSources
}
