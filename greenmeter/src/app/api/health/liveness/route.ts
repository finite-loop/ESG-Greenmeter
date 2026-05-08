import { NextResponse } from 'next/server';
import { healthService } from '@/services/healthService';

/**
 * Unauthenticated liveness probe for load balancers and monitoring tools.
 * Returns 200 when healthy/degraded, 503 when unhealthy.
 */
export async function GET() {
  try {
    const result = await healthService.getHealthCheck();
    const statusCode = result.status === 'unhealthy' ? 503 : 200;

    return NextResponse.json(
      { status: result.status, timestamp: result.timestamp },
      { status: statusCode }
    );
  } catch {
    return NextResponse.json(
      { status: 'unhealthy', timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
