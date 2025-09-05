"use client"

import { API_ROUTE_CSRF } from "@/lib/routes"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from 'next/navigation'
import SkyvernNotificationManager from '@/components/notifications/skyvern-notification-manager'

export function LayoutClient() {
  const router = useRouter()

  useQuery({
    queryKey: ["csrf-init"],
    queryFn: async () => {
      await fetch(API_ROUTE_CSRF)
      return true
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  })

  const handleViewAllTasks = () => {
    router.push('/agents/tasks')
  }

  return (
    <>
      <SkyvernNotificationManager onViewAllTasks={handleViewAllTasks} />
    </>
  )
}
