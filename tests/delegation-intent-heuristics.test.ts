import './setup/register-aliases'
import test from 'node:test'
import assert from 'node:assert/strict'

import { scoreDelegationIntent } from '../lib/delegation/intent-heuristics'

test('scoreDelegationIntent detects Ami for Gmail organization', () => {
  const result = scoreDelegationIntent(
    'Necesito organizar mi bandeja de entrada de Gmail, responder correos importantes y agendar recordatorios'
  )

  assert.equal(result.target, 'ami-creative')
  assert.ok(result.score > 0.2, 'expected Ami to receive a meaningful score')
  assert.ok(result.reasons.some(reason => reason.startsWith('matched:') || reason.includes('gmail')))
  assert.ok(result.scores['ami-creative'] > result.scores['peter-google'])
})

test('scoreDelegationIntent prefers Toby for technical debugging requests', () => {
  const result = scoreDelegationIntent(
    'Fix TypeScript build error in Next.js and debug failing integration tests with docker compose'
  )

  assert.equal(result.target, 'toby-technical')
  assert.ok(result.scores['toby-technical'] > result.scores['ami-creative'])
  assert.ok(result.score >= 0.5, 'technical intent should produce a confident score')
})

test('scoreDelegationIntent returns null target when no keywords match', () => {
  const result = scoreDelegationIntent('Hola, ¿qué tal?')

  assert.equal(result.target, null)
  assert.equal(result.score, 0)
})
