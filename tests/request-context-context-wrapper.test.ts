import './setup/register-aliases'
import test from 'node:test'
import assert from 'node:assert/strict'

import { wrapToolExecuteWithRequestContext } from '../lib/tools/context-wrapper'
import { getRequestContext, withRequestContext } from '../lib/server/request-context'

test('wrapToolExecuteWithRequestContext applies fallback context when missing', async () => {
  const recorded: Array<ReturnType<typeof getRequestContext>> = []
  const tool = {
    async execute() {
      recorded.push(getRequestContext())
      return getRequestContext()
    }
  }

  wrapToolExecuteWithRequestContext('testTool', tool)

  const globalAny = globalThis as any
  globalAny.__currentUserId = 'user-fallback'
  globalAny.__currentModel = 'model-fallback'
  globalAny.__requestId = 'req-fallback'

  const result = await tool.execute()

  assert.ok(result)
  assert.equal(result?.userId, 'user-fallback')
  assert.equal(result?.model, 'model-fallback')
  assert.equal(result?.requestId, 'req-fallback')
  assert.equal(recorded[0]?.userId, 'user-fallback')
})

test('wrapToolExecuteWithRequestContext preserves existing context', async () => {
  const tool = {
    async execute() {
      return getRequestContext()
    }
  }

  wrapToolExecuteWithRequestContext('existingContextTool', tool)

  const result = await withRequestContext({ userId: 'user-existing', model: 'model-existing', requestId: 'req-existing' }, async () => {
    return tool.execute()
  })

  assert.ok(result)
  assert.equal(result?.userId, 'user-existing')
  assert.equal(result?.model, 'model-existing')
  assert.equal(result?.requestId, 'req-existing')
})

test('wrapToolExecuteWithRequestContext is idempotent', async () => {
  const tool = {
    async execute() {
      return getRequestContext()
    }
  }

  const first = wrapToolExecuteWithRequestContext('idempotentTool', tool)
  const second = wrapToolExecuteWithRequestContext('idempotentTool', tool)

  assert.strictEqual(first, second)
  assert.strictEqual(first.execute, second.execute)
})
