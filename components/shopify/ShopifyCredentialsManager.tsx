/**
 * Shopify Credentials Management Component
 * Allows users to add, edit, and delete their Shopify store credentials
 */
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/toast';
import { Trash2, Edit2, Plus, Store, Eye, EyeOff } from 'lucide-react';
import { ShopifySetupGuide } from './shopify-setup-guide';

interface ShopifyCredential {
  id: string;
  store_name: string;
  store_domain: string;
  store_identifier: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ShopifyCredentialsFormData {
  store_name: string;
  store_domain: string;
  access_token: string;
  is_active: boolean;
}

export default function ShopifyCredentialsManager() {
  const [credentials, setCredentials] = useState<ShopifyCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<ShopifyCredential | null>(null);
  const [showAccessToken, setShowAccessToken] = useState(false);

  const [formData, setFormData] = useState<ShopifyCredentialsFormData>({
    store_name: '',
    store_domain: '',
    access_token: '',
    is_active: true,
  });

  // Load credentials on component mount
  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/shopify/credentials');
      if (response.ok) {
        const data = await response.json();
        setCredentials(data.credentials || []);
      } else {
        throw new Error('Failed to load credentials');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load Shopify credentials',
        status: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    try {
      const response = await fetch('/api/shopify/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Shopify store credentials added successfully',
        });
        setIsAddDialogOpen(false);
        resetForm();
        loadCredentials();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add credentials');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add credentials',
        status: 'error',
      });
    }
  };

  const handleEdit = async () => {
    if (!editingCredential) return;

    try {
      const updateData: Partial<ShopifyCredentialsFormData> = {
        store_name: formData.store_name,
        store_domain: formData.store_domain,
        is_active: formData.is_active,
      };

      // Only include access token if it was changed
      if (formData.access_token.trim()) {
        updateData.access_token = formData.access_token;
      }

      const response = await fetch(`/api/shopify/credentials/${editingCredential.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Shopify store credentials updated successfully',
        });
        setIsEditDialogOpen(false);
        setEditingCredential(null);
        resetForm();
        loadCredentials();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update credentials');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update credentials',
        status: 'error',
      });
    }
  };

  const handleDelete = async (credentialId: string) => {
    try {
      const response = await fetch(`/api/shopify/credentials/${credentialId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Shopify store credentials deleted successfully',
        });
        loadCredentials();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete credentials');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete credentials',
        status: 'error',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      store_name: '',
      store_domain: '',
      access_token: '',
      is_active: true,
    });
    setShowAccessToken(false);
  };

  const openEditDialog = (credential: ShopifyCredential) => {
    setEditingCredential(credential);
    setFormData({
      store_name: credential.store_name,
      store_domain: credential.store_domain,
      access_token: '', // Don't pre-fill access token for security
      is_active: credential.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const formatDomain = (domain: string) => {
    // Ensure domain has .myshopify.com if it doesn't already
    if (!domain.includes('.myshopify.com') && !domain.includes('.shopify.com')) {
      return `${domain}.myshopify.com`;
    }
    return domain;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
            <Store className="h-5 w-5 text-purple-500" />
            Shopify Store Configuration
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Loading your Shopify store credentials...
          </p>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
          <Store className="h-5 w-5 text-purple-500" />
          Shopify Store Configuration
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          Manage your Shopify store credentials for Emma to connect to your stores
        </p>
      </div>

      {/* Add New Store Button */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={resetForm} 
              className="w-full bg-transparent border-dashed border-2 border-purple-500/50 hover:border-purple-400 text-gray-300 hover:text-white hover:bg-purple-500/10 transition-all duration-200"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Shopify Store
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-gray-100">Add Shopify Store</DialogTitle>
              <DialogDescription className="text-gray-400">
                Add credentials for your Shopify store to enable Emma's e-commerce tools
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="add-store-name" className="text-gray-200">Store Name</Label>
                <Input
                  id="add-store-name"
                  placeholder="My Store"
                  value={formData.store_name}
                  onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-400 focus:border-purple-500"
                />
              </div>
              <div>
                <Label htmlFor="add-store-domain" className="text-gray-200">Store Domain</Label>
                <Input
                  id="add-store-domain"
                  placeholder="mystore.myshopify.com"
                  value={formData.store_domain}
                  onChange={(e) => setFormData({ ...formData, store_domain: formatDomain(e.target.value) })}
                  className="bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-400 focus:border-purple-500"
                />
              </div>
              <div>
                <Label htmlFor="add-access-token" className="text-gray-200">Access Token</Label>
                <div className="relative">
                  <Input
                    id="add-access-token"
                    type={showAccessToken ? 'text' : 'password'}
                    placeholder="shpat_..."
                    value={formData.access_token}
                    onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                    className="bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-400 pr-10 focus:border-purple-500"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-400 hover:text-gray-200"
                    onClick={() => setShowAccessToken(!showAccessToken)}
                  >
                    {showAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="add-is-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="add-is-active" className="text-gray-200">Active Store</Label>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAddDialogOpen(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAdd}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                disabled={!formData.store_name || !formData.store_domain || !formData.access_token}
              >
                Add Store
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Credential Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-gray-100">Edit Shopify Store</DialogTitle>
              <DialogDescription className="text-gray-400">
                Update credentials for "{editingCredential?.store_name}"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-store-name" className="text-gray-200">Store Name</Label>
                <Input
                  id="edit-store-name"
                  value={formData.store_name}
                  onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-400 focus:border-purple-500"
                />
              </div>
              <div>
                <Label htmlFor="edit-store-domain" className="text-gray-200">Store Domain</Label>
                <Input
                  id="edit-store-domain"
                  value={formData.store_domain}
                  onChange={(e) => setFormData({ ...formData, store_domain: formatDomain(e.target.value) })}
                  className="bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-400 focus:border-purple-500"
                />
              </div>
              <div>
                <Label htmlFor="edit-access-token" className="text-gray-200">
                  Access Token <span className="text-gray-500">(leave empty to keep current)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="edit-access-token"
                    type={showAccessToken ? 'text' : 'password'}
                    placeholder="shpat_... (optional)"
                    value={formData.access_token}
                    onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                    className="bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-400 pr-10 focus:border-purple-500"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-400 hover:text-gray-200"
                    onClick={() => setShowAccessToken(!showAccessToken)}
                  >
                    {showAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="edit-is-active" className="text-gray-200">Active Store</Label>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleEdit}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                Update Store
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Setup Guide */}
        <ShopifySetupGuide />

        {/* Credentials List */}
        {credentials.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700/50">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mb-4">
                <Store className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-200 mb-2">No Shopify stores configured yet</h3>
              <p className="text-gray-400 mb-6 max-w-sm">
                Add your first store to get started with e-commerce tools. Emma can help you manage products, orders, and analytics.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {credentials.map((credential) => (
              <Card key={credential.id} className="bg-gray-800/50 border-gray-700/50 hover:bg-gray-800/70 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                        <Store className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-gray-200 truncate">{credential.store_name}</h4>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            credential.is_active 
                              ? 'bg-green-900/50 text-green-400 border border-green-500/30' 
                              : 'bg-gray-700/50 text-gray-400 border border-gray-600/30'
                          }`}>
                            {credential.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1 truncate">{credential.store_domain}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Added {new Date(credential.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(credential)}
                        className="text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-gray-900 border-gray-700">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-gray-100">Delete Store</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-400">
                              Are you sure you want to delete "{credential.store_name}"? Emma will no longer be able to access this store. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-800">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(credential.id)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Delete Store
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Help Section */}
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
          <h4 className="font-medium text-blue-200 mb-2">How to get your Shopify Access Token:</h4>
          <ol className="text-sm text-blue-300 space-y-1 list-decimal list-inside">
            <li>Go to your Shopify admin panel</li>
            <li>Navigate to Settings → Apps and sales channels</li>
            <li>Click "Develop apps" → "Create an app"</li>
            <li>Configure Admin API access with required permissions</li>
            <li>Install the app and copy the access token</li>
          </ol>
          <p className="text-xs text-blue-400 mt-2">
            Make sure to grant permissions for products, orders, customers, and analytics
          </p>
        </div>
      </div>
    );
  }
