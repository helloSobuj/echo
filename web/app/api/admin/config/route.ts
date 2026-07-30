import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import { getMaskedConfig, updateConfig } from '@/lib/agent-config';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const masked = getMaskedConfig();
  return NextResponse.json(masked);
}

export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    tavily?: {
      api_key?: string;
      enabled?: boolean;
    };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const errors: string[] = [];

  if (body.tavily) {
    if (body.tavily.enabled !== undefined && typeof body.tavily.enabled !== 'boolean') {
      errors.push('tavily.enabled must be a boolean');
    }
    if (body.tavily.api_key !== undefined && typeof body.tavily.api_key !== 'string') {
      errors.push('tavily.api_key must be a string');
    }
    if (body.tavily.api_key !== undefined && body.tavily.api_key.length > 500) {
      errors.push('tavily.api_key is too long');
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
  }

  const result = updateConfig(body);
  return NextResponse.json(result.masked);
}
