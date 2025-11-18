import { NextResponse } from 'next/server'
import { circuitBreakerRegistry } from '@/lib/resilience/circuit-breaker'

/**
 * Health check endpoint for circuit breakers
 * GET /api/health/circuit-breakers
 * 
 * Returns status of all registered circuit breakers for monitoring
 */
export async function GET() {
  try {
    const metrics = circuitBreakerRegistry.getMetrics()
    
    // Check if any breakers are open (service down)
    const hasOpenBreakers = Object.values(metrics).some(
      (m: any) => m.state === 'open'
    )
    
    // Check if any breakers are half-open (recovering)
    const hasHalfOpenBreakers = Object.values(metrics).some(
      (m: any) => m.state === 'half-open'
    )
    
    const status = hasOpenBreakers ? 'degraded' : hasHalfOpenBreakers ? 'recovering' : 'healthy'
    const statusCode = hasOpenBreakers ? 503 : 200
    
    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      breakers: metrics,
      summary: {
        total: Object.keys(metrics).length,
        healthy: Object.values(metrics).filter((m: any) => m.state === 'closed').length,
        degraded: Object.values(metrics).filter((m: any) => m.state === 'open').length,
        recovering: Object.values(metrics).filter((m: any) => m.state === 'half-open').length,
      }
    }, { status: statusCode })
  } catch (error) {
    console.error('[Health Check] Circuit breaker metrics error:', error)
    return NextResponse.json({
      status: 'error',
      error: 'Failed to retrieve circuit breaker metrics'
    }, { status: 500 })
  }
}
