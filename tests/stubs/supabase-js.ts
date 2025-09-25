export type SupabaseClient = {
  from: (...args: any[]) => {
    select: (...args: any[]) => any
    update: (...args: any[]) => { eq: (...args: any[]) => Promise<{ error?: unknown }> }
  }
}

export function createClient(..._args: any[]): SupabaseClient {
  const queryChain = {
    select: () => queryChain,
    eq: () => queryChain,
    order: async () => ({ data: [], error: null })
  }

  return {
    from: () => ({
      select: () => queryChain,
      update: () => ({
        eq: async () => ({})
      })
    })
  }
}
