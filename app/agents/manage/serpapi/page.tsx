import type { Metadata } from 'next'
import { SerpapiPage } from './serpapi-page'

export const metadata: Metadata = { title: 'SerpAPI Credentials' }

export default function SerpapiManagePage(){
  return <SerpapiPage />
}