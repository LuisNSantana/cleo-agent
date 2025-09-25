import { resolveConfirmation, requestConfirmation, __getLatestPendingConfirmationIdForTest, __clearConfirmationIntervalForTest } from '@/lib/confirmation/unified'

describe('Confirmation Resume Endpoint', () => {
  afterAll(() => {
    // Prevent open handle warning in Jest
    __clearConfirmationIntervalForTest()
  })
  it('should execute action only after approval', async () => {
    let executed = false
    const fakeAction = async () => { executed = true; return 'done' }
    const promise = requestConfirmation('createCalendarEvent', { title: 'Test' }, fakeAction)
    // Simulate user approval
  const id = __getLatestPendingConfirmationIdForTest()
  expect(id).toBeDefined()
  const result = await resolveConfirmation(id!, true)
    expect(result.success).toBe(true)
    expect(result.executed).toBe(true)
    expect(executed).toBe(true)
    await expect(promise).resolves.toBe('done')
  })

  it('should not execute action if rejected', async () => {
    let executed = false
    const fakeAction = async () => { executed = true; return 'done' }
    const promise = requestConfirmation('createCalendarEvent', { title: 'Test' }, fakeAction)
    // Simulate user rejection
  const id = __getLatestPendingConfirmationIdForTest()
  expect(id).toBeDefined()
  const result = await resolveConfirmation(id!, false)
    expect(result.success).toBe(true)
    expect(result.executed).toBe(false)
    expect(executed).toBe(false)
    await expect(promise).rejects.toThrow('User rejected createCalendarEvent')
  })

  it('should be idempotent (double approval does not double-execute)', async () => {
    let count = 0
    const fakeAction = async () => { count++; return 'ok' }
    const promise = requestConfirmation('createCalendarEvent', { title: 'Test' }, fakeAction)
  const id = __getLatestPendingConfirmationIdForTest()
  expect(id).toBeDefined()
  if (!id) throw new Error('Confirmation id is undefined')
  await resolveConfirmation(id, true)
  const result2 = await resolveConfirmation(id, true)
    expect(count).toBe(1)
    expect(result2.success).toBe(false)
  })
})
