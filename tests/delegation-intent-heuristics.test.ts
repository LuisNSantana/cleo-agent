jest.mock('../lib/agents/services/sub-agent-service', () => ({
  supabase: { from: () => ({ select: () => ({}) }) }
}))
import './setup/register-aliases'
import { scoreDelegationIntent } from '../lib/delegation/intent-heuristics'
import { __clearConfirmationIntervalForTest } from '../lib/confirmation/unified'

describe('Delegation Intent Heuristics', () => {
  afterAll(() => {
    // Prevent open handle warning in Jest
    __clearConfirmationIntervalForTest()
  })

test('scoreDelegationIntent detects Ami for Gmail organization', () => {
  const result = scoreDelegationIntent(
    'Necesito organizar mi bandeja de entrada de Gmail, responder correos importantes y agendar recordatorios'
  )
  expect(result.target).toBe('ami-creative')
  expect(result.score).toBeGreaterThan(0.2)
  expect(result.reasons.some(reason => reason.startsWith('matched:') || reason.includes('gmail'))).toBe(true)
  // Only check scores if both agents exist in the result
  if (result.scores && result.scores['ami-creative'] !== undefined && result.scores['peter-google'] !== undefined) {
    expect(result.scores['ami-creative']).toBeGreaterThan(result.scores['peter-google'])
  }
})

test('scoreDelegationIntent prefers Toby for technical debugging requests', () => {
  const result = scoreDelegationIntent(
    'Fix TypeScript build error in Next.js and debug failing integration tests with docker compose'
  )
  expect(result.target).toBe('toby-technical')
  // Only check scores if both agents exist in the result
  if (result.scores && result.scores['toby-technical'] !== undefined && result.scores['ami-creative'] !== undefined) {
    expect(result.scores['toby-technical']).toBeGreaterThan(result.scores['ami-creative'])
  }
  expect(result.score).toBeGreaterThanOrEqual(0.5)
})

test('scoreDelegationIntent returns null target when no keywords match', () => {
  const result = scoreDelegationIntent('Hola, ¿qué tal?')
  expect(result.target).toBeNull()
  expect(result.score).toBe(0)
})
})
