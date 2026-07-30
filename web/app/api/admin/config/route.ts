import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import { getMaskedConfig, readMcpServers, updateConfig } from '@/lib/agent-config';
import { sanitizeMcpServers } from '@/lib/mcp-connectors';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const masked = await getMaskedConfig();
  const mcp_servers = masked.storage.mode === 'livekit' ? [] : readMcpServers();
  return NextResponse.json({ ...masked, mcp_servers });
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
    mcp_servers?: unknown;
    composio?: {
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

  if (body.composio) {
    if (body.composio.enabled !== undefined && typeof body.composio.enabled !== 'boolean') {
      errors.push('composio.enabled must be a boolean');
    }
    if (body.composio.api_key !== undefined && typeof body.composio.api_key !== 'string') {
      errors.push('composio.api_key must be a string');
    }
    if (body.composio.api_key !== undefined && body.composio.api_key.length > 500) {
      errors.push('composio.api_key is too long');
    }
  }

  let mcpServers;
  if (body.mcp_servers !== undefined) {
    try {
      mcpServers = sanitizeMcpServers(body.mcp_servers);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Invalid mcp_servers');
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
  }

  try {
    const result = await updateConfig({
      tavily: body.tavily,
      mcp_servers: mcpServers,
      composio: body.composio,
    });
    return NextResponse.json({
      ...result.masked,
      mcp_servers: result.mcp_servers,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save settings.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
