declare module '@radix-ui/react-ssr' {
  import * as React from 'react'

  export interface SSRProviderProps {
    children?: React.ReactNode
  }

  export function SSRProvider(props: SSRProviderProps): JSX.Element
}
