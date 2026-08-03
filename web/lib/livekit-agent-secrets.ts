import { createHmac } from 'node:crypto';

const AGENTS_API = 'https://agents.livekit.cloud/twirp/livekit.CloudAgent';
const CLI_VERSION = process.env.LIVEKIT_CLI_VERSION || '2.18.0';

export interface AgentSecretInfo {
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64url');
}

function signAgentAdminJwt(apiKey: string, apiSecret: string, ttlSeconds = 300): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({
      iss: apiKey,
      nbf: now,
      exp: now + ttlSeconds,
      agent: { admin: true },
    })
  );
  const sig = createHmac('sha256', apiSecret).update(`${header}.${payload}`).digest();
  return `${header}.${payload}.${b64url(sig)}`;
}

export function getLiveKitAgentSecretsConfig(): {
  apiKey: string;
  apiSecret: string;
  agentId: string;
} | null {
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  const agentId = process.env.LIVEKIT_AGENT_ID?.trim();
  if (!apiKey || !apiSecret || !agentId) {
    return null;
  }
  return { apiKey, apiSecret, agentId };
}

export function canManageAgentSecrets(): boolean {
  return getLiveKitAgentSecretsConfig() !== null;
}

async function agentsRequest<T>(
  method: 'ListAgentSecrets' | 'UpdateAgentSecrets',
  body: Record<string, unknown>
): Promise<T> {
  const cfg = getLiveKitAgentSecretsConfig();
  if (!cfg) {
    throw new Error(
      'LiveKit agent secrets not configured. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_AGENT_ID on the web app.'
    );
  }

  const token = signAgentAdminJwt(cfg.apiKey, cfg.apiSecret);
  const res = await fetch(`${AGENTS_API}/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-LiveKit-CLI-Version': CLI_VERSION,
    },
    body: JSON.stringify({ agent_id: cfg.agentId, ...body }),
  });

  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg =
      typeof data === 'object' && data && 'msg' in data
        ? String((data as { msg: unknown }).msg)
        : text || res.statusText;
    throw new Error(`LiveKit ${method} failed (${res.status}): ${msg}`);
  }

  return data as T;
}

export async function listAgentSecretNames(): Promise<string[]> {
  const data = await agentsRequest<{
    secrets?: Array<{ name?: string }>;
  }>('ListAgentSecrets', {});
  return (data.secrets ?? []).map((s) => s.name).filter((n): n is string => Boolean(n));
}

export async function updateAgentSecrets(
  secrets: Record<string, string>,
  options?: { overwrite?: boolean }
): Promise<void> {
  const entries = Object.entries(secrets).filter(([, v]) => v !== undefined);
  if (entries.length === 0) {
    return;
  }

  const data = await agentsRequest<{ success?: boolean; message?: string }>('UpdateAgentSecrets', {
    overwrite: options?.overwrite ?? false,
    secrets: entries.map(([name, value]) => ({ name, value })),
  });

  if (data.success === false) {
    throw new Error(data.message || 'Failed to update agent secrets');
  }
}
