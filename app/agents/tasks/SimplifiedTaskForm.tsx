import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { X, ChevronRight, Calendar, Info, Search, Check } from 'lucide-react'
import { 
  TASK_PRESETS, 
  PRESET_CATEGORIES, 
  getPresetById,
  validateCronExpression,
  describeCronExpression,
  CRON_PRESETS,
  type TaskPreset 
} from './task-presets'

// Agent avatar resolver - complete mapping
const getAgentAvatarUrl = (agentName?: string) => {
  const map: Record<string, string> = {
    'emma': '/img/agents/emma4.png',
    'wex': '/img/agents/wex4.png',
    'toby': '/img/agents/toby4.png',
    'peter': '/img/agents/peter4.png',
    'apu': '/img/agents/apu4.png',
    'ami': '/img/agents/ami4.png',
    'ankie': '/img/agents/ankie4.png',
    'cleo': '/img/agents/ankie4.png',
    // Added missing agents
    'jenn': '/img/agents/jenn4.png',
    'jen': '/img/agents/jenn4.png',
    'jennifer': '/img/agents/jenn4.png',
    'nora': '/img/agents/nora4.png',
    'astra': '/img/agents/astra4.png',
    'iris': '/img/agents/iris4.jpeg' // Correct iris avatar
  }
  const key = (agentName || '').toLowerCase().trim()
  return map[key] || '/img/agents/ankie4.png'
}

interface SimplifiedTaskFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (taskData: any) => Promise<void>;
  userTimezone: string;
  timezoneDisplay: string;
  agents?: Array<{ id: string; name: string; icon?: string; color?: string; }>;
}

export function SimplifiedTaskForm({
  open,
  onClose,
  onSubmit,
  userTimezone,
  timezoneDisplay,
  agents = [{ id: 'cleo-supervisor', name: 'Ankie' }]
}: SimplifiedTaskFormProps) {
  // State
  const [step, setStep] = useState<'preset' | 'details'>('preset');
  const [selectedPreset, setSelectedPreset] = useState<TaskPreset | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [agentSearch, setAgentSearch] = useState('');

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [agentId, setAgentId] = useState('cleo-supervisor');
  const [taskType, setTaskType] = useState<'manual' | 'scheduled' | 'recurring'>('manual');
  const [priority, setPriority] = useState(5);
  const [scheduledAt, setScheduledAt] = useState('');
  const [cronExpression, setCronExpression] = useState('');
  const [tags, setTags] = useState('');

  // Validation
  const [cronError, setCronError] = useState<string | null>(null);

  // Filtered agents based on search
  const filteredAgents = useMemo(() => {
    if (!agentSearch.trim()) return agents;
    const term = agentSearch.toLowerCase();
    return agents.filter(a => a.name.toLowerCase().includes(term));
  }, [agents, agentSearch]);

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setStep('preset');
      setSelectedPreset(null);
      setSelectedCategory(null);
      setAdvancedMode(false);
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAgentId('cleo-supervisor');
    setTaskType('manual');
    setPriority(5);
    setScheduledAt('');
    setCronExpression('');
    setTags('');
    setCronError(null);
  };

  const selectPreset = (preset: TaskPreset) => {
    setSelectedPreset(preset);
    setTitle(preset.template.title);
    setDescription(preset.template.description);
    setAgentId(preset.template.agent_id);
    setTaskType(preset.template.task_type);
    setPriority(preset.template.priority || 5);
    
    if (preset.template.cron_expression) {
      setCronExpression(preset.template.cron_expression);
    }
    
    setStep('details');
  };

  const handleCronChange = (value: string) => {
    setCronExpression(value);
    const validation = validateCronExpression(value);
    setCronError(validation.valid ? null : validation.error || null);
  };

  const handleSubmit = async () => {
    // Validation
    if (!title.trim() || !description.trim()) {
      alert('Please fill in title and description');
      return;
    }

    if (taskType === 'recurring' && cronError) {
      alert('Please fix the cron expression error');
      return;
    }

    setSubmitting(true);
    try {
      const taskData: any = {
        title: title.trim(),
        description: description.trim(),
        agent_id: agentId,
        task_type: taskType,
        priority,
        task_config: {},
        context_data: {}
      };

      if (taskType === 'scheduled' && scheduledAt) {
        taskData.scheduled_at = scheduledAt;
        taskData.timezone = userTimezone;
      }

      if (taskType === 'recurring' && cronExpression) {
        taskData.cron_expression = cronExpression;
        taskData.timezone = userTimezone;
      }

      if (tags.trim()) {
        taskData.tags = tags.split(',').map(t => t.trim()).filter(Boolean);
      }

      await onSubmit(taskData);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background border border-border rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {step === 'preset' ? '✨ Create New Task' : '📝 Task Details'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {step === 'preset' 
                ? 'Choose a template or start fresh' 
                : selectedPreset 
                  ? `Template: ${selectedPreset.icon} ${selectedPreset.name}`
                  : 'Fill in the details for your task'
              }
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {step === 'preset' ? (
              <motion.div
                key="preset"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* Category Filter */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={selectedCategory === null ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                  >
                    All
                  </Button>
                  {PRESET_CATEGORIES.map(cat => (
                    <Button
                      key={cat.id}
                      variant={selectedCategory === cat.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      <span className="mr-1">{cat.icon}</span>
                      {cat.name}
                    </Button>
                  ))}
                </div>

                {/* Preset Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {TASK_PRESETS
                    .filter(p => !selectedCategory || p.category === selectedCategory)
                    .map(preset => (
                      <Card
                        key={preset.id}
                        className="p-4 cursor-pointer hover:border-primary transition-colors"
                        onClick={() => selectPreset(preset)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-3xl">{preset.icon}</div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground">{preset.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {preset.description}
                            </p>
                            {preset.template.suggested_schedule && (
                              <Badge variant="secondary" className="mt-2 text-xs">
                                {preset.template.suggested_schedule}
                              </Badge>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </Card>
                    ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Task Name */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    📝 Task Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Send daily sales report to team"
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground/60"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    A short name to identify this task
                  </p>
                </div>

                {/* Task Instructions */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    📋 What should the agent do? <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={"Research the latest AI trends in healthcare and send a summary email to:\n• john@company.com\n• sarah@company.com\n\nInclude sources and key insights."}
                    rows={5}
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground/60"
                  />
                  <div className="flex items-start gap-2 mt-2 p-2 bg-muted/30 rounded-md border border-border">
                    <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      <strong>Tip:</strong> Be specific! Include email addresses, URLs, dates, or any details the agent needs.
                    </p>
                  </div>
                </div>

                {/* Agent Selector - Visual Cards with Avatars */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    🤖 Who should do this?
                  </label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Select an agent or leave Ankie to auto-delegate to the right specialist
                  </p>
                  
                  {/* Search input */}
                  {agents.length > 4 && (
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={agentSearch}
                        onChange={(e) => setAgentSearch(e.target.value)}
                        placeholder="Search agents..."
                        className="pl-9 bg-background border-border placeholder:text-muted-foreground/60"
                      />
                    </div>
                  )}
                  
                  {/* Agent Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                    {filteredAgents.map(agent => (
                      <Card
                        key={agent.id}
                        onClick={() => setAgentId(agent.id)}
                        className={`p-3 cursor-pointer transition-all hover:border-primary/50 ${
                          agentId === agent.id 
                            ? 'border-primary bg-primary/10 ring-1 ring-primary/30' 
                            : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <img 
                              src={getAgentAvatarUrl(agent.name)}
                              alt={agent.name}
                              className="w-9 h-9 rounded-full object-cover border-2 border-background shadow-sm"
                            />
                            {agentId === agent.id && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-sm">
                                <Check className="w-2.5 h-2.5 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                          <span className="text-sm font-medium text-foreground truncate">
                            {agent.name}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                  
                  {filteredAgents.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No agents found matching "{agentSearch}"
                    </p>
                  )}
                </div>

                {/* Schedule Section */}
                {!advancedMode && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      ⏰ When to execute?
                    </label>
                    <Select value={taskType} onValueChange={(v: any) => setTaskType(v)}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Right now (Manual)</SelectItem>
                        <SelectItem value="scheduled">At a specific time (Scheduled)</SelectItem>
                        <SelectItem value="recurring">Repeatedly (Recurring)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Scheduled DateTime */}
                {taskType === 'scheduled' && (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Schedule for
                    </label>
                    <Input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="bg-background border-border"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      🌍 Timezone: {timezoneDisplay}
                    </p>
                  </div>
                )}

                {/* Recurring Cron */}
                {taskType === 'recurring' && (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Schedule pattern
                    </label>
                    
                    {/* Cron Presets */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {Object.entries(CRON_PRESETS).map(([key, preset]) => (
                        <Button
                          key={key}
                          variant={cronExpression === preset.expression ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleCronChange(preset.expression)}
                          className="justify-start"
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>

                    {/* Custom Cron */}
                    <div>
                      <Input
                        value={cronExpression}
                        onChange={(e) => handleCronChange(e.target.value)}
                        placeholder="0 9 * * * (custom cron)"
                        className={`bg-background border-border ${cronError ? 'border-red-500' : ''}`}
                      />
                      {cronError && (
                        <p className="text-xs text-red-500 mt-1">{cronError}</p>
                      )}
                      {!cronError && cronExpression && (
                        <p className="text-xs text-green-500 mt-1">
                          ✓ {describeCronExpression(cronExpression)}
                        </p>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-2">
                      🌍 Timezone: {timezoneDisplay}
                    </p>
                  </div>
                )}

                {/* Advanced Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAdvancedMode(!advancedMode)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {advancedMode ? '▼' : '▶'} Advanced options
                </Button>

                {/* Advanced Fields */}
                {advancedMode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 pt-2 border-t border-border"
                  >
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Priority (1-10)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={priority}
                        onChange={(e) => setPriority(parseInt(e.target.value) || 5)}
                        className="bg-background border-border w-32"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Tags (comma-separated)
                      </label>
                      <Input
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="research, weekly, important"
                        className="bg-background border-border"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Info Box */}
                <div className="bg-muted/30 border border-border rounded-lg p-3 flex items-start gap-2">
                  <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    <strong>Tip:</strong> Ankie will automatically delegate to specialists when needed. 
                    For emails she'll use Astra, for research Apu, for calendar Ami, etc.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex items-center justify-between">
          {step === 'details' && (
            <Button
              variant="ghost"
              onClick={() => setStep('preset')}
              size="sm"
            >
              ← Back to templates
            </Button>
          )}
          <div className="flex-1" />
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {step === 'details' && (
              <Button
                onClick={handleSubmit}
                disabled={submitting || !title.trim() || !description.trim()}
              >
                {submitting ? 'Creating...' : 'Create Task'}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
