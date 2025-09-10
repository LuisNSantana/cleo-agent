/**
 * Universal Credentials Management Component
 * Scalable component for managing API keys and credentials for different services
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
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { Trash2, Edit2, Plus, Eye, EyeOff, Key, Settings, CheckCircle, AlertCircle, HelpCircle, ExternalLink, Copy, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface BaseCredential {
  id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ShopifyCredential extends BaseCredential {
  store_name: string;
  store_domain: string;
  store_identifier: string;
}

interface SkyvernCredential extends BaseCredential {
  credential_name: string;
  base_url: string;
  api_key: string;
  organization_id?: string;
}

interface NotionCredential extends BaseCredential {
  label: string;
  api_key: string;
}

interface BaseFormData {
  is_active: boolean;
}

interface ShopifyFormData extends BaseFormData {
  store_name: string;
  store_domain: string;
  access_token: string;
}

interface SkyvernFormData extends BaseFormData {
  credential_name: string;
  base_url: string;
  api_key: string;
  organization_id?: string;
}

interface NotionFormData extends BaseFormData {
  label: string;
  api_key: string;
}

type CredentialType = 'shopify' | 'skyvern' | 'notion';
type Credential = ShopifyCredential | SkyvernCredential | NotionCredential;
type FormData = ShopifyFormData | SkyvernFormData | NotionFormData;

// =============================================================================
// NOTION HELP MODAL COMPONENT
// =============================================================================

interface NotionHelpModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const NotionHelpModal = ({ isOpen, onOpenChange }: NotionHelpModalProps) => {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const copyToClipboard = async (text: string, stepNumber: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStep(stepNumber);
      setTimeout(() => setCopiedStep(null), 2000);
      toast({
        title: "Copiado",
        description: "Enlace copiado al portapapeles",
      });
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  const steps = [
    {
      number: 1,
      title: "Crear una Integración",
      description: "Ve al dashboard de integraciones de Notion",
      action: "Abrir en nueva pestaña",
      url: "https://www.notion.com/my-integrations",
      details: [
        "Haz clic en '+ New integration'",
        "Dale un nombre (ej: 'Cleo Agent')",
        "Selecciona tu workspace",
        "Haz clic en 'Submit'"
      ]
    },
    {
      number: 2,
      title: "Obtener tu Token API",
      description: "Copia tu Internal Integration Secret",
      details: [
        "En la página de configuración de tu integración",
        "Busca la sección 'Configuration'",
        "Copia el 'Internal Integration Secret'",
        "Los nuevos tokens empiezan con 'ntn_'",
        "Los tokens antiguos empiezan con 'secret_'"
      ]
    },
    {
      number: 3,
      title: "Dar Permisos",
      description: "Conecta la integración a tus páginas",
      details: [
        "Ve a la página de Notion que quieres usar",
        "Haz clic en 'Share' (arriba a la derecha)",
        "Clic en 'Add people, emails, groups, or integrations'",
        "Busca y selecciona tu integración",
        "Elige los permisos apropiados"
      ]
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-xl">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-black to-gray-700 flex items-center justify-center">
              <span className="text-white text-sm font-bold">N</span>
            </div>
            <span>Cómo obtener tu API Key de Notion</span>
          </DialogTitle>
          <DialogDescription>
            Sigue estos simples pasos para conectar tu workspace de Notion con Cleo Agent
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                  {step.number}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground mb-3">
                    {step.description}
                  </p>
                  
                  {step.url && (
                    <div className="mb-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="inline-flex items-center space-x-2"
                        onClick={() => {
                          window.open(step.url, '_blank');
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>{step.action}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2"
                        onClick={() => copyToClipboard(step.url!, step.number)}
                      >
                        {copiedStep === step.number ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  )}

                  <ul className="space-y-2">
                    {step.details.map((detail, detailIndex) => (
                      <li key={detailIndex} className="flex items-start space-x-2 text-sm text-muted-foreground">
                        <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0 text-primary" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              {index < steps.length - 1 && (
                <div className="absolute left-4 top-12 w-px h-6 bg-border"></div>
              )}
            </motion.div>
          ))}
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Formato de Token Actualizado
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Desde septiembre 2024, los nuevos tokens empiezan con <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 rounded text-xs">ntn_</code> en lugar de <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 rounded text-xs">secret_</code>. Ambos formatos funcionan perfectamente.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// =============================================================================
// SERVICE CONFIGURATIONS
// =============================================================================

interface ServiceConfig {
  type: CredentialType;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  fields: FieldConfig[];
  apiEndpoint: string;
  testEndpoint?: string;
}

interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url';
  placeholder: string;
  required: boolean;
  description?: string;
}

const SERVICE_CONFIGS: Record<CredentialType, ServiceConfig> = {
  shopify: {
    type: 'shopify',
    name: 'Shopify',
    description: 'E-commerce store management and analytics',
    icon: (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm">
        <img src="/icons/shopify.png" alt="Shopify" className="w-6 h-6" />
      </div>
    ),
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50/50 dark:bg-green-950/20',
    borderColor: 'border-green-200/50 dark:border-green-800/50',
    apiEndpoint: '/api/shopify/credentials',
    testEndpoint: '/api/shopify/test',
    fields: [
      { key: 'store_name', label: 'Store Name', type: 'text', placeholder: 'My Awesome Store', required: true },
      { key: 'store_domain', label: 'Store Domain', type: 'url', placeholder: 'mystore.myshopify.com', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'shpat_...', required: true, description: 'Private app access token' }
    ]
  },
  skyvern: {
    type: 'skyvern',
    name: 'Skyvern',
    description: 'AI-powered web automation and browser interactions',
    icon: (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
        W
      </div>
    ),
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50/50 dark:bg-purple-950/20',
    borderColor: 'border-purple-200/50 dark:border-purple-800/50',
    apiEndpoint: '/api/skyvern/credentials',
    testEndpoint: '/api/skyvern/test',
    fields: [
      { key: 'credential_name', label: 'Credential Name', type: 'text', placeholder: 'Production API', required: true, description: 'Friendly name for this credential' },
      { key: 'base_url', label: 'Base URL', type: 'url', placeholder: 'https://api.skyvern.com', required: true, description: 'Skyvern API base URL' },
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-...', required: true, description: 'Your Skyvern API key' },
      { key: 'organization_id', label: 'Organization ID', type: 'text', placeholder: 'org_123...', required: false, description: 'Optional: For enterprise accounts' }
    ]
  },
  notion: {
    type: 'notion',
    name: 'Notion',
    description: 'Workspace management and content organization',
    icon: (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm">
        <img src="/icons/notion-icon.svg" alt="Notion" className="w-6 h-6" />
      </div>
    ),
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-50/50 dark:bg-slate-950/20',
    borderColor: 'border-slate-200/50 dark:border-slate-800/50',
    apiEndpoint: '/api/notion/credentials',
    testEndpoint: '/api/notion/test',
    fields: [
      { key: 'label', label: 'Label', type: 'text', placeholder: 'Primary Workspace', required: true, description: 'Friendly name for this API key' },
      { key: 'api_key', label: 'Internal Integration Token', type: 'password', placeholder: 'ntn_... (or secret_...)', required: true, description: 'Your Notion internal integration token (new tokens start with ntn_, older tokens with secret_)' }
    ]
  }
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface CredentialsManagerProps {
  serviceType: CredentialType;
  className?: string;
}

export default function CredentialsManager({ serviceType, className = '' }: CredentialsManagerProps) {
  const config = SERVICE_CONFIGS[serviceType];
  
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isNotionHelpOpen, setIsNotionHelpOpen] = useState(false);

  // Initialize form data based on service type
  const getInitialFormData = (): FormData => {
    const base = { is_active: true };
    switch (serviceType) {
      case 'shopify':
        return { ...base, store_name: '', store_domain: '', access_token: '' } as ShopifyFormData;
      case 'skyvern':
        return { ...base, credential_name: '', base_url: 'https://api.skyvern.com', api_key: '', organization_id: '' } as SkyvernFormData;
      case 'notion':
        return { ...base, label: '', api_key: '' } as NotionFormData;
      default:
        return base as FormData;
    }
  };

  const [formData, setFormData] = useState<FormData>(getInitialFormData());

  // =============================================================================
  // LIFECYCLE & DATA LOADING
  // =============================================================================

  useEffect(() => {
    loadCredentials();
  }, [serviceType]);

  const loadCredentials = async () => {
    try {
      setLoading(true);
      const response = await fetch(config.apiEndpoint);
      if (response.ok) {
        const data = await response.json();
        setCredentials(data.credentials || []);
      } else {
        throw new Error('Failed to load credentials');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to load ${config.name} credentials`,
        status: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // =============================================================================
  // FORM HANDLING
  // =============================================================================

  const resetForm = () => {
    setFormData(getInitialFormData());
    setEditingCredential(null);
  };

  const handleFieldChange = (key: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const openEditDialog = (credential: Credential) => {
    setEditingCredential(credential);
    
    // Pre-populate form based on service type
    const baseData = { is_active: credential.is_active };
    switch (serviceType) {
      case 'shopify':
        const shopifyCredential = credential as ShopifyCredential;
        setFormData({
          ...baseData,
          store_name: shopifyCredential.store_name,
          store_domain: shopifyCredential.store_domain,
          access_token: '', // Don't pre-populate sensitive data
        } as ShopifyFormData);
        break;
      case 'skyvern':
        const skyvernCredential = credential as SkyvernCredential;
        setFormData({
          ...baseData,
          credential_name: skyvernCredential.credential_name,
          base_url: skyvernCredential.base_url,
          api_key: '', // Don't pre-populate sensitive data
          organization_id: skyvernCredential.organization_id || '',
        } as SkyvernFormData);
        break;
      case 'notion':
        const notionCredential = credential as NotionCredential;
        setFormData({
          ...baseData,
          label: notionCredential.label,
          api_key: '', // Don't pre-populate sensitive data
        } as NotionFormData);
        break;
    }
    
    setIsEditDialogOpen(true);
  };

  // =============================================================================
  // CRUD OPERATIONS
  // =============================================================================

  const handleAdd = async () => {
    try {
      const response = await fetch(config.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `${config.name} credentials added successfully`,
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
      // Prepare update data, excluding empty sensitive fields
      const updateData: Partial<FormData> = { ...formData };
      
      // Remove empty password/secret fields to avoid overwriting
      config.fields.forEach(field => {
        if (field.type === 'password' && !(formData as any)[field.key]?.trim()) {
          delete (updateData as any)[field.key];
        }
      });

      const response = await fetch(`${config.apiEndpoint}/${editingCredential.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `${config.name} credentials updated successfully`,
        });
        setIsEditDialogOpen(false);
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

  const handleDelete = async (credential: Credential) => {
    try {
      const response = await fetch(`${config.apiEndpoint}/${credential.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `${config.name} credentials deleted successfully`,
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

  // =============================================================================
  // CONNECTION TESTING
  // =============================================================================

  const handleTestConnection = async (credential: Credential) => {
    if (!config.testEndpoint) return;

    try {
      setTesting(credential.id);
      const response = await fetch(`${config.testEndpoint}/${credential.id}`, {
        method: 'POST',
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        toast({
          title: '✅ Connection Successful',
          description: result.message || `${config.name} connection is working properly`,
        });
      } else {
        throw new Error(result.error || 'Connection test failed');
      }
    } catch (error) {
      toast({
        title: '❌ Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to test connection',
        status: 'error',
      });
    } finally {
      setTesting(null);
    }
  };

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  const toggleSecretVisibility = (credentialId: string) => {
    setShowSecrets(prev => ({ ...prev, [credentialId]: !prev[credentialId] }));
  };

  const getCredentialDisplayName = (credential: Credential): string => {
    switch (serviceType) {
      case 'shopify':
        return (credential as ShopifyCredential).store_name;
      case 'skyvern':
        return (credential as SkyvernCredential).credential_name;
      case 'notion':
        return (credential as NotionCredential).label;
      default:
        return 'Unknown';
    }
  };

  const getCredentialSubtitle = (credential: Credential): string => {
    switch (serviceType) {
      case 'shopify':
        return (credential as ShopifyCredential).store_domain;
      case 'skyvern':
        return (credential as SkyvernCredential).base_url;
      case 'notion':
        return 'Notion Workspace';
      default:
        return '';
    }
  };

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const renderFormField = (field: FieldConfig) => {
    const value = (formData as any)[field.key] || '';
    
    return (
      <div key={field.key} className="space-y-2">
        <Label htmlFor={field.key} className="text-sm font-medium text-foreground">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Input
          id={field.key}
          type={field.type}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => handleFieldChange(field.key, e.target.value)}
          required={field.required}
          className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/20"
        />
        {field.description && (
          <p className="text-xs text-muted-foreground">{field.description}</p>
        )}
      </div>
    );
  };

  const renderCredentialCard = (credential: Credential) => {
    const displayName = getCredentialDisplayName(credential);
    const subtitle = getCredentialSubtitle(credential);
    
    return (
      <motion.div
        key={credential.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`relative overflow-hidden rounded-lg border backdrop-blur-sm transition-all duration-200 hover:shadow-lg dark:hover:shadow-2xl ${config.borderColor} ${config.bgColor}`}
      >
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {config.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="font-semibold text-foreground truncate">{displayName}</h3>
                  {credential.is_active ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-800">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-muted-foreground">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1.5" />
                      Inactive
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate mb-1">{subtitle}</p>
                <p className="text-xs text-muted-foreground/70">
                  Created {new Date(credential.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 flex-wrap sm:flex-nowrap">
              {config.testEndpoint && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestConnection(credential)}
                  disabled={testing === credential.id}
                  className="flex items-center space-x-2 hover:bg-accent transition-all duration-200"
                >
                  {testing === credential.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                      <span className="hidden sm:inline">Testing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">Test</span>
                    </>
                  )}
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditDialog(credential)}
                className="hover:bg-accent transition-all duration-200"
              >
                <Edit2 className="w-4 h-4" />
                <span className="sr-only">Edit {displayName}</span>
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 transition-all duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="sr-only">Delete {displayName}</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-popover border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-popover-foreground">Delete {config.name} Credentials</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                      Are you sure you want to delete the credentials for <span className="font-medium">"{displayName}"</span>? 
                      This action cannot be undone and will disable {config.name} integration for this configuration.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(credential)}
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
        
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-transparent opacity-0 hover:opacity-5 transition-opacity duration-200 pointer-events-none" 
             style={{ background: `linear-gradient(45deg, transparent 60%, ${config.color.includes('green') ? '#10b981' : '#8b5cf6'}15 100%)` }} />
      </motion.div>
    );
  };

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  return (
    <div className={className}>
      <Card className="overflow-hidden backdrop-blur-sm border-border/50 bg-card/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {config.icon}
              </div>
              <div>
                <CardTitle className="flex items-center space-x-3">
                  <span className="text-foreground">{config.name} Integration</span>
                  <Badge variant="outline" className={`${config.color} border-current/20`}>
                    {credentials.length} {credentials.length === 1 ? 'config' : 'configs'}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1 text-muted-foreground">
                  {config.description}
                </CardDescription>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Help button specifically for Notion */}
              {serviceType === 'notion' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/50"
                  onClick={() => setIsNotionHelpOpen(true)}
                >
                  <HelpCircle className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">¿Cómo obtener API Key?</span>
                  <span className="sm:hidden">Ayuda</span>
                </Button>
              )}
              
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Add {config.name}</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-popover border-border">
                <DialogHeader>
                  <DialogTitle className="text-popover-foreground">Add {config.name} Credentials</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Configure your {config.name} API credentials to enable integration.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {config.fields.map(renderFormField)}
                  
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => handleFieldChange('is_active', checked)}
                    />
                    <Label htmlFor="is_active" className="text-sm font-medium text-foreground">
                      Enable this configuration
                    </Label>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAdd} className="bg-primary hover:bg-primary/90">
                    Add Credentials
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-8 h-8 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Loading credentials...</p>
              </div>
            </div>
          ) : credentials.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Key className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No {config.name} credentials configured
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Add your first {config.name} configuration to start using the integration with your agents.
              </p>
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add {config.name} Credentials
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {credentials.map(renderCredentialCard)}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md bg-popover border-border">
          <DialogHeader>
            <DialogTitle className="text-popover-foreground">Edit {config.name} Credentials</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update your {config.name} configuration. Leave password fields empty to keep existing values.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {config.fields.map(renderFormField)}
            
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30">
              <Switch
                id="edit_is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleFieldChange('is_active', checked)}
              />
              <Label htmlFor="edit_is_active" className="text-sm font-medium text-foreground">
                Enable this configuration
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} className="bg-primary hover:bg-primary/90">
              Update Credentials
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Notion Help Modal */}
      {serviceType === 'notion' && (
        <NotionHelpModal 
          isOpen={isNotionHelpOpen} 
          onOpenChange={setIsNotionHelpOpen} 
        />
      )}
    </div>
  );
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export const ShopifyCredentialsManager = () => (
  <CredentialsManager serviceType="shopify" />
);

export const SkyvernCredentialsManager = () => (
  <CredentialsManager serviceType="skyvern" />
);

export const NotionCredentialsManager = () => (
  <CredentialsManager serviceType="notion" />
);
