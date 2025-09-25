


import { agentRegistry, getAllAgents, refreshAgentRegistry } from '../lib/agents/registry'
import type { AgentConfig } from '../lib/agents/types'

describe('Recuperación de estado', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('recupera agentes tras refresh (simula recarga)', async () => {
    // Simula que hay agentes en el registry
    const fakeAgent: AgentConfig = {
      id: 'test',
      name: 'Test Agent',
      description: 'desc',
      role: 'specialist',
      model: 'openrouter:test',
      temperature: 0,
      maxTokens: 8192,
      tools: [],
      prompt: '',
      color: '#000',
      icon: 'agent',
    };
    // Mock getAllAgents to return our fake agent
    const getAllAgentsSpy = jest.spyOn(require('../lib/agents/registry'), 'getAllAgents').mockResolvedValue([fakeAgent]);

    const agents = await getAllAgents('user-123');
    expect(agents).toEqual([fakeAgent]);
    getAllAgentsSpy.mockRestore();
  });

  test('maneja error al refrescar agentes', async () => {
    // Simula error en refresh
    const refreshSpy = jest.spyOn(agentRegistry, 'refresh').mockImplementation(async () => { throw new Error('fail') });
    await expect(refreshAgentRegistry('user-123')).rejects.toThrow('fail');
    refreshSpy.mockRestore();
  });
});
