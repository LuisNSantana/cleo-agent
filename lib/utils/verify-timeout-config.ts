/**
 * Timeout Configuration Verification Utility
 * Run this to validate timeout hierarchy is correct
 */

export interface TimeoutConfig {
  name: string;
  timeoutMs: number;
  level: number;
  parent?: string;
}

export const TIMEOUT_CONFIGS: TimeoutConfig[] = [
  // Level 1: Task Executors (Top level) - Hierarchical multi-agent support
  { name: 'Cleo Task Executor', timeoutMs: 900_000, level: 1 },
  { name: 'Astra Task Executor', timeoutMs: 300_000, level: 1 },
  { name: 'Apu Task Executor', timeoutMs: 300_000, level: 1 },
  { name: 'Ami Task Executor', timeoutMs: 300_000, level: 1 },
  { name: 'Wex Task Executor', timeoutMs: 360_000, level: 1 },
  
  // Level 2: Delegations (Sub-orchestrations)
  { name: 'Delegation (Scheduled Task)', timeoutMs: 420_000, level: 2, parent: 'Cleo Task Executor' },
  { name: 'Delegation (Chat)', timeoutMs: 300_000, level: 2, parent: 'Cleo Task Executor' },
  
  // Level 3: Sub-Agents
  { name: 'Astra Agent', timeoutMs: 300_000, level: 3, parent: 'Delegation (Scheduled Task)' },
  { name: 'Ami Agent', timeoutMs: 300_000, level: 3, parent: 'Delegation (Scheduled Task)' },
  { name: 'Apu Agent', timeoutMs: 300_000, level: 3, parent: 'Delegation (Scheduled Task)' },
  
  // Level 4: Execution Manager
  { name: 'Execution Manager (Astra)', timeoutMs: 300_000, level: 4, parent: 'Astra Agent' },
  { name: 'Execution Manager (Ami)', timeoutMs: 300_000, level: 4, parent: 'Ami Agent' },
  { name: 'Execution Manager (Apu)', timeoutMs: 300_000, level: 4, parent: 'Apu Agent' },
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

export function validateTimeoutHierarchy(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    info: []
  };
  
  const MIN_MARGIN = 1.2; // 20% minimum margin
  const RECOMMENDED_MARGIN = 1.5; // 50% recommended margin
  
  // Build a map for quick lookup
  const configMap = new Map<string, TimeoutConfig>();
  TIMEOUT_CONFIGS.forEach(config => {
    configMap.set(config.name, config);
  });
  
  // Validate each config with a parent
  TIMEOUT_CONFIGS.forEach(config => {
    if (!config.parent) {
      result.info.push(`✓ ${config.name}: ${config.timeoutMs / 1000}s (top level)`);
      return;
    }
    
    const parent = configMap.get(config.parent);
    if (!parent) {
      result.errors.push(`✗ ${config.name}: Parent '${config.parent}' not found`);
      result.valid = false;
      return;
    }
    
    const ratio = parent.timeoutMs / config.timeoutMs;
    
    if (ratio < 1.0) {
      result.errors.push(
        `✗ ${config.name}: Parent timeout (${parent.timeoutMs / 1000}s) is LESS than child (${config.timeoutMs / 1000}s)`
      );
      result.valid = false;
    } else if (ratio < MIN_MARGIN) {
      result.errors.push(
        `✗ ${config.name}: Insufficient margin (${(ratio * 100).toFixed(0)}%, need ${MIN_MARGIN * 100}%)`
      );
      result.valid = false;
    } else if (ratio < RECOMMENDED_MARGIN) {
      result.warnings.push(
        `⚠ ${config.name}: Low margin (${(ratio * 100).toFixed(0)}%, recommend ${RECOMMENDED_MARGIN * 100}%)`
      );
      result.info.push(`  Parent: ${parent.name} (${parent.timeoutMs / 1000}s)`);
    } else {
      result.info.push(
        `✓ ${config.name}: ${config.timeoutMs / 1000}s (margin: ${(ratio * 100).toFixed(0)}%)`
      );
    }
  });
  
  return result;
}

export function printValidationResult(result: ValidationResult): void {
  console.log('\n=== Timeout Configuration Validation ===\n');
  
  if (result.errors.length > 0) {
    console.log('❌ ERRORS:');
    result.errors.forEach(err => console.log(`  ${err}`));
    console.log('');
  }
  
  if (result.warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    result.warnings.forEach(warn => console.log(`  ${warn}`));
    console.log('');
  }
  
  if (result.info.length > 0) {
    console.log('ℹ️  INFO:');
    result.info.forEach(info => console.log(`  ${info}`));
    console.log('');
  }
  
  if (result.valid) {
    console.log('✅ All timeout configurations are valid!\n');
  } else {
    console.log('❌ Timeout configuration has errors that must be fixed!\n');
  }
}

export function getTimeoutForAgent(agentId: string): number {
  // Mirror the logic from task-executor.ts
  if (agentId.includes('cleo')) {
    return 900_000; // 15 minutes
  }
  
  if (agentId.includes('astra')) {
    return 300_000; // 5 minutes
  }
  
  if (agentId.includes('apu')) {
    return 300_000; // 5 minutes
  }
  
  if (agentId.includes('ami')) {
    return 300_000; // 5 minutes
  }
  
  if (agentId.includes('wex')) {
    return 360_000; // 6 minutes
  }
  
  return 180_000; // 3 minutes (standard)
}

export function getDelegationTimeout(isScheduledTask: boolean): number {
  return isScheduledTask ? 420_000 : 300_000;
}

export function validateTaskScenario(
  supervisorAgent: string,
  delegatedAgents: string[],
  isScheduledTask: boolean = true
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    info: []
  };
  
  const supervisorTimeout = getTimeoutForAgent(supervisorAgent);
  const delegationTimeout = getDelegationTimeout(isScheduledTask);
  
  result.info.push(`Scenario: ${supervisorAgent} delegates to ${delegatedAgents.join(', ')}`);
  result.info.push(`Supervisor timeout: ${supervisorTimeout / 1000}s`);
  result.info.push(`Delegation timeout: ${delegationTimeout / 1000}s`);
  
  // In practice, delegations happen sequentially but Cleo doesn't wait for full timeout
  // We calculate based on expected execution time, not maximum timeout
  let totalRequiredTime = 0;
  
  delegatedAgents.forEach(agentId => {
    const agentTimeout = getTimeoutForAgent(agentId);
    // Assume average execution is 60% of timeout (realistic estimate)
    const expectedTime = agentTimeout * 0.6;
    totalRequiredTime += expectedTime;
    result.info.push(`  ${agentId} expected time: ${expectedTime / 1000}s (max: ${agentTimeout / 1000}s)`);
  });
  
  // Add overhead (30s per delegation + 60s supervisor overhead)
  const overhead = (delegatedAgents.length * 30_000) + 60_000;
  totalRequiredTime += overhead;
  
  result.info.push(`Total required time: ${totalRequiredTime / 1000}s (including ${overhead / 1000}s overhead)`);
  
  if (supervisorTimeout < totalRequiredTime) {
    result.errors.push(
      `✗ Supervisor timeout (${supervisorTimeout / 1000}s) is less than required time (${totalRequiredTime / 1000}s)`
    );
    result.valid = false;
  } else {
    const margin = ((supervisorTimeout - totalRequiredTime) / totalRequiredTime) * 100;
    if (margin < 20) {
      result.warnings.push(
        `⚠ Low safety margin: ${margin.toFixed(0)}% (recommend at least 20%)`
      );
    } else {
      result.info.push(`✓ Safety margin: ${margin.toFixed(0)}%`);
    }
  }
  
  return result;
}

// CLI execution
if (require.main === module) {
  console.log('🔍 Validating timeout configuration...\n');
  
  const hierarchyResult = validateTimeoutHierarchy();
  printValidationResult(hierarchyResult);
  
  console.log('\n=== Common Task Scenarios ===\n');
  
  // Scenario 1: Simple email
  console.log('Scenario 1: Simple Email Task');
  const scenario1 = validateTaskScenario('cleo-supervisor', ['astra-email']);
  printValidationResult(scenario1);
  
  // Scenario 2: Research + Email
  console.log('Scenario 2: Research + Email');
  const scenario2 = validateTaskScenario('cleo-supervisor', ['apu-support', 'astra-email']);
  printValidationResult(scenario2);
  
  // Scenario 3: Complex multi-delegation
  console.log('Scenario 3: Research + Calendar + Email');
  const scenario3 = validateTaskScenario('cleo-supervisor', ['apu-support', 'ami-creative', 'astra-email']);
  printValidationResult(scenario3);
  
  if (!hierarchyResult.valid || !scenario1.valid || !scenario2.valid || !scenario3.valid) {
    process.exit(1);
  }
}
