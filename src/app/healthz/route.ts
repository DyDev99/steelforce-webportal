import { NextResponse } from 'next/server';

/**
 * Liveness probe for the container HEALTHCHECK and the deploy script.
 *
 * Deliberately outside `/api/*`: next.config.js rewrites that prefix to the
 * backend, and this must answer for the portal itself. It checks nothing
 * downstream - a backend outage should not make Docker restart the portal.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    { status: 'ok' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
