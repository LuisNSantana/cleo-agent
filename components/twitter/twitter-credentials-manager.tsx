/**
 * Twitter/X Credentials Manager Component
 * Allows users to securely add, test, and manage their Twitter API credentials
 * Follows the established patterns from Notion, SerpAPI, and Shopify integrations
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Trash2, TestTube, Plus, Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { XTwitterIcon } from '@/components/icons/tool-icons'
import { toast } from '@/components/ui/toast'

interface TwitterCredential {
  id: string
  label: string
  connected: boolean
  created_at: string
  updated_at: string
  credentials?: {
    api_key: string
    api_secret: string
    access_token: string
    access_token_secret: string
    bearer_token?: string
  }
}

interface TwitterCredentialsFormData {
  api_key: string
  api_secret: string
  access_token: string
  access_token_secret: string
  bearer_token: string
  label: string
}

export function TwitterCredentialsManager() {
  const [credentials, setCredentials] = useState<TwitterCredential[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [isTesting, setIsTesting] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  
  const [formData, setFormData] = useState<TwitterCredentialsFormData>({
    api_key: '',
    api_secret: '',
    access_token: '',
    access_token_secret: '',
    bearer_token: '',
    label: 'Twitter Account'
  })

  // Load credentials on component mount
  useEffect(() => {
    loadCredentials()
  }, [])

  const loadCredentials = async () => {
    try {
      setIsLoading(true)
  const response = await fetch('/api/twitter/credentials', { credentials: 'include' })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Twitter credentials response:', data)
        setCredentials(data.credentials || [])
      } else {
        console.error('Failed to load Twitter credentials')
        toast({
          title: 'Error',
          description: 'Failed to load Twitter credentials'
        })
      }
    } catch (error) {
      console.error('Error loading credentials:', error)
      toast({
        title: 'Error',
        description: 'Failed to load Twitter credentials'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.api_key || !formData.api_secret || !formData.access_token || !formData.access_token_secret) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields (API Key, API Secret, Access Token, Access Token Secret)'
      })
      return
    }

    try {
      setIsAdding(true)
      
      const response = await fetch('/api/twitter/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include'
      })
      
      const result = await response.json()
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: result.connection_test?.message || 'Twitter credentials added successfully'
        })
        
        // Reset form and reload credentials
        setFormData({
          api_key: '',
          api_secret: '',
          access_token: '',
          access_token_secret: '',
          bearer_token: '',
          label: 'Twitter Account'
        })
        setShowAddForm(false)
        await loadCredentials()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to add Twitter credentials'
        })
      }
    } catch (error) {
      console.error('Error adding credentials:', error)
      toast({
        title: 'Error',
        description: 'Failed to add Twitter credentials'
      })
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (credentialId: string) => {
    if (!confirm('Are you sure you want to delete these Twitter credentials?')) {
      return
    }

    try {
      const response = await fetch(`/api/twitter/credentials?id=${credentialId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Twitter credentials deleted successfully'
        })
        await loadCredentials()
      } else {
        const result = await response.json()
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete Twitter credentials'
        })
      }
    } catch (error) {
      console.error('Error deleting credentials:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete Twitter credentials'
      })
    }
  }

  const handleTest = async (credential: TwitterCredential) => {
    if (!credential.credentials) return

    try {
      setIsTesting(credential.id)
      
      const response = await fetch('/api/twitter/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credential.credentials),
        credentials: 'include'
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: 'Connection Successful',
          description: result.message
        })
      } else {
        toast({
          title: 'Connection Failed',
          description: result.error
        })
      }
    } catch (error) {
      console.error('Error testing credentials:', error)
      toast({
        title: 'Error',
        description: 'Failed to test Twitter connection'
      })
    } finally {
      setIsTesting(null)
    }
  }

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <XTwitterIcon className="h-5 w-5" />
          <div>
            <h3 className="text-lg font-semibold">Twitter/X API Credentials</h3>
            <p className="text-sm text-muted-foreground">
              Manage up to 3 Twitter accounts for posting and management
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{credentials.length}/3</span>
          <Button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2"
            disabled={credentials.length >= 3}
            title={credentials.length >= 3 ? 'Maximum of 3 accounts reached' : 'Add new credentials'}
          >
            <Plus className="h-4 w-4" />
            Add Credentials
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              You'll need Twitter API v2 credentials from the{' '}
              <a 
                href="https://developer.twitter.com/en/portal/dashboard" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:underline font-medium"
              >
                Twitter Developer Portal
              </a>
              . Required: API Key, API Secret, Access Token, Access Token Secret. Optional: Bearer Token for enhanced features.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Credentials Form */}
  {showAddForm && credentials.length < 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Add Twitter Credentials</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="label">Label *</Label>
                  <Input
                    id="label"
                    value={formData.label}
                    onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="Twitter Account"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="api_key">API Key *</Label>
                  <Input
                    id="api_key"
                    type={showPasswords.api_key ? 'text' : 'password'}
                    value={formData.api_key}
                    onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                    placeholder="Your Twitter API Key"
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-8 h-8 w-8 p-0"
                    onClick={() => togglePasswordVisibility('api_key')}
                  >
                    {showPasswords.api_key ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <div>
                  <Label htmlFor="api_secret">API Secret *</Label>
                  <Input
                    id="api_secret"
                    type={showPasswords.api_secret ? 'text' : 'password'}
                    value={formData.api_secret}
                    onChange={(e) => setFormData(prev => ({ ...prev, api_secret: e.target.value }))}
                    placeholder="Your Twitter API Secret"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="access_token">Access Token *</Label>
                  <Input
                    id="access_token"
                    type={showPasswords.access_token ? 'text' : 'password'}
                    value={formData.access_token}
                    onChange={(e) => setFormData(prev => ({ ...prev, access_token: e.target.value }))}
                    placeholder="Your Twitter Access Token"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="access_token_secret">Access Token Secret *</Label>
                  <Input
                    id="access_token_secret"
                    type={showPasswords.access_token_secret ? 'text' : 'password'}
                    value={formData.access_token_secret}
                    onChange={(e) => setFormData(prev => ({ ...prev, access_token_secret: e.target.value }))}
                    placeholder="Your Twitter Access Token Secret"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="bearer_token">Bearer Token (Optional)</Label>
                  <Input
                    id="bearer_token"
                    type={showPasswords.bearer_token ? 'text' : 'password'}
                    value={formData.bearer_token}
                    onChange={(e) => setFormData(prev => ({ ...prev, bearer_token: e.target.value }))}
                    placeholder="Your Twitter Bearer Token"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isAdding}>
                  {isAdding ? 'Adding...' : 'Add Credentials'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Existing Credentials */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">Loading credentials...</div>
        ) : credentials.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No Twitter credentials configured yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add your Twitter API credentials to enable posting and social media management features.
              </p>
            </CardContent>
          </Card>
        ) : (
          credentials.map((credential) => (
            <Card key={credential.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{credential.label}</p>
                      <p className="text-sm text-muted-foreground">
                        Added {new Date(credential.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={credential.connected ? 'default' : 'secondary'}>
                      {credential.connected ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest(credential)}
                      disabled={isTesting === credential.id}
                      className="flex items-center gap-2"
                    >
                      <TestTube className="h-4 w-4" />
                      {isTesting === credential.id ? 'Testing...' : 'Test'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(credential.id)}
                      className="flex items-center gap-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
