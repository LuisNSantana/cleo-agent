'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { BellIcon } from '@phosphor-icons/react'

export function TestNotificationButton() {
  const triggerTestNotification = async () => {
    try {
      const response = await fetch('/api/skyvern/test-notification', {
        method: 'POST'
      })
      
      if (response.ok) {
        console.log('✅ Test notification triggered successfully')
      } else {
        console.error('❌ Failed to trigger test notification')
      }
    } catch (error) {
      console.error('❌ Error triggering test notification:', error)
    }
  }

  return (
    <Button
      onClick={triggerTestNotification}
      variant="outline"
      size="sm"
      className="fixed bottom-4 right-4 z-50"
    >
      <BellIcon size={16} className="mr-2" />
      Test Notification
    </Button>
  )
}

export default TestNotificationButton
