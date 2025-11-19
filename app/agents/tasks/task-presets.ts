/**
 * Task Presets - Plantillas predefinidas para casos de uso comunes
 * Simplifica la creación de tareas para usuarios
 */

export interface TaskPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'research' | 'communication' | 'automation' | 'analysis' | 'custom';
  template: {
    title: string;
    description: string;
    agent_id: string;
    task_type: 'manual' | 'scheduled' | 'recurring';
    priority?: number;
    cron_expression?: string;
    suggested_schedule?: string; // Human-readable schedule suggestion
  };
}

export const TASK_PRESETS: TaskPreset[] = [
  // Research Presets
  {
    id: 'daily-research',
    name: 'Daily Research',
    icon: '🔍',
    description: 'Research a topic and get a daily summary',
    category: 'research',
    template: {
      title: 'Daily Research: [Topic]',
      description: 'Research [topic] and provide a comprehensive summary with key findings and sources.',
      agent_id: 'cleo-supervisor',
      task_type: 'recurring',
      priority: 5,
      cron_expression: '0 9 * * *', // 9 AM daily
      suggested_schedule: 'Every day at 9:00 AM'
    }
  },
  {
    id: 'market-monitoring',
    name: 'Market Monitoring',
    icon: '📈',
    description: 'Monitor market trends and send updates',
    category: 'research',
    template: {
      title: 'Market Monitoring: [Company/Stock]',
      description: 'Monitor news and market data for [company/stock ticker]. Alert on significant changes.',
      agent_id: 'cleo-supervisor',
      task_type: 'recurring',
      priority: 7,
      cron_expression: '0 8,12,16 * * 1-5', // 8 AM, 12 PM, 4 PM on weekdays
      suggested_schedule: 'Weekdays at 8 AM, 12 PM, 4 PM'
    }
  },

  // Communication Presets
  {
    id: 'scheduled-email',
    name: 'Scheduled Email',
    icon: '📧',
    description: 'Send an email at a specific time',
    category: 'communication',
    template: {
      title: 'Send email: [Subject]',
      description: 'Send an email to [recipient] with subject "[subject]" and message: [your message here]',
      agent_id: 'cleo-supervisor',
      task_type: 'scheduled',
      priority: 6
    }
  },
  {
    id: 'weekly-report',
    name: 'Weekly Report',
    icon: '📊',
    description: 'Generate and send weekly reports',
    category: 'communication',
    template: {
      title: 'Weekly Report: [Report Name]',
      description: 'Generate a weekly report on [topic] and send to [recipients]. Include key metrics and insights.',
      agent_id: 'cleo-supervisor',
      task_type: 'recurring',
      priority: 6,
      cron_expression: '0 9 * * 1', // Monday 9 AM
      suggested_schedule: 'Every Monday at 9:00 AM'
    }
  },

  // Automation Presets
  {
    id: 'web-scraping',
    name: 'Web Scraping',
    icon: '🌐',
    description: 'Extract data from websites periodically',
    category: 'automation',
    template: {
      title: 'Scrape data from [Website]',
      description: 'Extract [data type] from [URL]. Save results and alert on changes.',
      agent_id: 'cleo-supervisor',
      task_type: 'recurring',
      priority: 5,
      cron_expression: '0 */6 * * *', // Every 6 hours
      suggested_schedule: 'Every 6 hours'
    }
  },
  {
    id: 'calendar-sync',
    name: 'Calendar Reminder',
    icon: '📅',
    description: 'Create calendar events and reminders',
    category: 'automation',
    template: {
      title: 'Calendar: [Event Name]',
      description: 'Create a calendar event for [event name] on [date/time]. Add reminder [X minutes] before.',
      agent_id: 'cleo-supervisor',
      task_type: 'scheduled',
      priority: 7
    }
  },

  // Analysis Presets
  {
    id: 'financial-analysis',
    name: 'Financial Analysis',
    icon: '💰',
    description: 'Analyze financial data and metrics',
    category: 'analysis',
    template: {
      title: 'Financial Analysis: [Topic]',
      description: 'Analyze [financial data/metrics] and provide insights with recommendations.',
      agent_id: 'cleo-supervisor',
      task_type: 'manual',
      priority: 6
    }
  },
  {
    id: 'competitor-analysis',
    name: 'Competitor Analysis',
    icon: '🎯',
    description: 'Monitor competitors and market position',
    category: 'analysis',
    template: {
      title: 'Competitor Analysis: [Company]',
      description: 'Analyze [competitor name] recent activities, pricing, features, and market positioning.',
      agent_id: 'cleo-supervisor',
      task_type: 'manual',
      priority: 6
    }
  },

  // Custom
  {
    id: 'custom',
    name: 'Custom Task',
    icon: '⚙️',
    description: 'Create a task from scratch',
    category: 'custom',
    template: {
      title: '',
      description: '',
      agent_id: 'cleo-supervisor',
      task_type: 'manual',
      priority: 5
    }
  }
];

export const PRESET_CATEGORIES = [
  { id: 'research', name: 'Research', icon: '🔍' },
  { id: 'communication', name: 'Communication', icon: '📧' },
  { id: 'automation', name: 'Automation', icon: '🤖' },
  { id: 'analysis', name: 'Analysis', icon: '📊' },
  { id: 'custom', name: 'Custom', icon: '⚙️' }
] as const;

// Helper to get preset by ID
export function getPresetById(id: string): TaskPreset | undefined {
  return TASK_PRESETS.find(p => p.id === id);
}

// Helper to get presets by category
export function getPresetsByCategory(category: string): TaskPreset[] {
  return TASK_PRESETS.filter(p => p.category === category);
}

// Cron expression helpers with validation
export const CRON_PRESETS = {
  'every-hour': { expression: '0 * * * *', label: 'Every hour' },
  'every-6-hours': { expression: '0 */6 * * *', label: 'Every 6 hours' },
  'daily-9am': { expression: '0 9 * * *', label: 'Daily at 9 AM' },
  'weekdays-9am': { expression: '0 9 * * 1-5', label: 'Weekdays at 9 AM' },
  'weekly-monday': { expression: '0 9 * * 1', label: 'Every Monday at 9 AM' },
  'monthly-1st': { expression: '0 9 1 * *', label: 'Monthly on the 1st at 9 AM' }
} as const;

/**
 * Validate cron expression (basic validation)
 */
export function validateCronExpression(expr: string): { valid: boolean; error?: string } {
  if (!expr || !expr.trim()) {
    return { valid: false, error: 'Cron expression cannot be empty' };
  }

  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) {
    return { 
      valid: false, 
      error: 'Cron expression must have 5 parts: minute hour day month weekday' 
    };
  }

  // Basic format validation (not exhaustive)
  const cronRegex = /^[\d\*\-\/,]+$/;
  for (const part of parts) {
    if (!cronRegex.test(part)) {
      return { 
        valid: false, 
        error: `Invalid cron part: "${part}". Use numbers, *, -, /, or commas` 
      };
    }
  }

  return { valid: true };
}

/**
 * Get human-readable description of cron expression
 */
export function describeCronExpression(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return 'Invalid cron expression';

  const [minute, hour, day, month, weekday] = parts;

  // Check for common patterns
  if (expr === '0 * * * *') return 'Every hour';
  if (expr === '0 */6 * * *') return 'Every 6 hours';
  if (expr === '0 9 * * *') return 'Every day at 9:00 AM';
  if (expr === '0 9 * * 1-5') return 'Weekdays at 9:00 AM';
  if (expr === '0 9 * * 1') return 'Every Monday at 9:00 AM';
  if (expr === '0 9 1 * *') return 'Monthly on the 1st at 9:00 AM';

  // Generic description
  let desc = '';
  
  if (minute === '*') desc += 'every minute';
  else if (minute === '0') desc += 'on the hour';
  else desc += `at ${minute} minutes past`;

  if (hour !== '*') desc += ` ${hour}:00`;
  if (day !== '*') desc += ` on day ${day}`;
  if (month !== '*') desc += ` in month ${month}`;
  if (weekday !== '*') {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekdayNums = weekday.split(',').map(n => days[parseInt(n)] || n);
    desc += ` on ${weekdayNums.join(', ')}`;
  }

  return desc || 'Custom schedule';
}
