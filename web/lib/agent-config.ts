import fs from 'node:fs';
import path from 'node:path';
import {
  canManageAgentSecrets,
  listAgentSecretNames,
  updateAgentSecrets,
} from '@/lib/livekit-agent-secrets';
import { type McpServerConfig, sanitizeMcpServers } from '@/lib/mcp-connectors';

const DEFAULT_CONFIG_PATH = path.resolve(process.cwd(), '..', 'agent', 'data', 'api_config.json');
const DEFAULT_MCP_PATH = path.resolve(process.cwd(), '..', 'agent', 'data', 'mcp_servers.json');

export interface TavilyConfig {
  api_key?: string;
  enabled: boolean;
}

export interface ApiConfig {
  tavily?: TavilyConfig;
  composio?: {
    api_key?: string;
    enabled?: boolean;
  };
}

export interface MaskedTavilyStatus {
  configured: boolean;
  enabled: boolean;
}

export interface MaskedMcpStatus {
  configured: boolean;
  count: number;
  path: string;
}

export interface MaskedComposioStatus {
  configured: boolean;
  enabled: boolean;
}

export interface StorageStatus {
  writable: boolean;
  mode: 'file' | 'livekit' | 'readonly';
  path: string;
  hint: string;
}

export interface MaskedConfig {
  tavily: MaskedTavilyStatus;
  mcp: MaskedMcpStatus;
  composio: MaskedComposioStatus;
  storage: StorageStatus;
  secret_names?: string[];
}

export function getConfigPath(): string {
  return process.env.AGENT_CONFIG_PATH || DEFAULT_CONFIG_PATH;
}

export function getMcpConfigPath(): string {
  return process.env.AGENT_MCP_CONFIG_PATH || DEFAULT_MCP_PATH;
}

export function getStorageStatus(): StorageStatus {
  const filePath = getConfigPath();

  if (canManageAgentSecrets()) {
    return {
      writable: true,
      mode: 'livekit',
      path: 'LiveKit agent secrets',
      hint: 'Saves push to the LiveKit Cloud agent (rolling restart). Keys are not readable back from the cloud.',
    };
  }

  const onVercel = Boolean(process.env.VERCEL);
  if (onVercel || process.env.AGENT_CONFIG_READONLY === 'true') {
    return {
      writable: false,
      mode: 'readonly',
      path: filePath,
      hint: 'Production filesystem is read-only. Set LIVEKIT_AGENT_ID on Vercel (with LIVEKIT_API_KEY/SECRET) so admin can update agent secrets.',
    };
  }

  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.accessSync(dir, fs.constants.W_OK);
    return {
      writable: true,
      mode: 'file',
      path: filePath,
      hint: 'Keys are saved to agent/data for local development.',
    };
  } catch {
    return {
      writable: false,
      mode: 'readonly',
      path: filePath,
      hint: `Cannot write to ${filePath}. Set LIVEKIT_AGENT_ID to manage secrets via LiveKit Cloud.`,
    };
  }
}

export function readConfig(): ApiConfig {
  const filePath = getConfigPath();
  try {
    if (!fs.existsSync(filePath)) {
      return {};
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) {
      return {};
    }
    return data as ApiConfig;
  } catch {
    return {};
  }
}

export function writeConfig(config: ApiConfig): void {
  const storage = getStorageStatus();
  if (storage.mode !== 'file') {
    throw new Error(storage.hint);
  }

  const filePath = getConfigPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
}

export function readMcpServers(): McpServerConfig[] {
  const filePath = getMcpConfigPath();
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return sanitizeMcpServers(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writeMcpServers(servers: McpServerConfig[]): void {
  const storage = getStorageStatus();
  if (storage.mode !== 'file') {
    throw new Error(storage.hint);
  }
  const cleaned = sanitizeMcpServers(servers);
  const filePath = getMcpConfigPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2), 'utf-8');
}

export async function getMaskedConfig(): Promise<MaskedConfig> {
  const storage = getStorageStatus();
  if (storage.mode === 'livekit') {
    let names: string[] = [];
    try {
      names = await listAgentSecretNames();
    } catch {
      names = [];
    }
    const nameSet = new Set(names);
    const hasMcp = nameSet.has('MCP_SERVERS');
    return {
      tavily: {
        configured: nameSet.has('TAVILY_API_KEY'),
        // LiveKit cannot read secret values; default to enabled when key exists.
        enabled: true,
      },
      mcp: {
        configured: hasMcp,
        count: hasMcp ? 1 : 0,
        path: 'MCP_SERVERS (LiveKit secret)',
      },
      composio: {
        configured: nameSet.has('COMPOSIO_API_KEY'),
        enabled: true,
      },
      storage,
      secret_names: names,
    };
  }

  return getMaskedConfigFrom(readConfig());
}

export interface UpdateConfigPayload {
  tavily?: {
    api_key?: string;
    enabled?: boolean;
  };
  mcp_servers?: McpServerConfig[];
  composio?: {
    api_key?: string;
    enabled?: boolean;
  };
}

export async function updateConfig(payload: UpdateConfigPayload): Promise<{
  masked: MaskedConfig;
  mcp_servers: McpServerConfig[];
}> {
  const storage = getStorageStatus();

  if (storage.mode === 'livekit') {
    const secrets: Record<string, string> = {};

    if (payload.tavily) {
      if (payload.tavily.api_key?.trim()) {
        secrets.TAVILY_API_KEY = payload.tavily.api_key.trim();
      }
      if (payload.tavily.enabled !== undefined) {
        secrets.TAVILY_ENABLED = payload.tavily.enabled ? 'true' : 'false';
      }
    }

    if (payload.mcp_servers) {
      const cleaned = sanitizeMcpServers(payload.mcp_servers);
      secrets.MCP_SERVERS = JSON.stringify(cleaned);
    }

    if (payload.composio) {
      if (payload.composio.api_key?.trim()) {
        secrets.COMPOSIO_API_KEY = payload.composio.api_key.trim();
      }
      if (payload.composio.enabled !== undefined) {
        secrets.COMPOSIO_ENABLED = payload.composio.enabled ? 'true' : 'false';
      }
    }

    if (Object.keys(secrets).length === 0) {
      throw new Error('Nothing to save. Provide a key or MCP config to update.');
    }

    await updateAgentSecrets(secrets);
    const masked = await getMaskedConfig();
    return {
      masked,
      mcp_servers: payload.mcp_servers ? sanitizeMcpServers(payload.mcp_servers) : [],
    };
  }

  if (!storage.writable) {
    throw new Error(storage.hint);
  }

  const current = readConfig();
  const next: ApiConfig = { ...current };

  if (payload.tavily) {
    const existing = next.tavily || { enabled: true };
    next.tavily = {
      ...existing,
      ...payload.tavily,
    };
  }

  if (payload.composio) {
    const existing = next.composio || { enabled: true };
    next.composio = {
      ...existing,
      ...payload.composio,
    };
  }

  if (payload.tavily || payload.composio) {
    writeConfig(next);
  }

  let mcpServers = readMcpServers();
  if (payload.mcp_servers) {
    writeMcpServers(payload.mcp_servers);
    mcpServers = sanitizeMcpServers(payload.mcp_servers);
  }

  return { masked: getMaskedConfigFrom(next), mcp_servers: mcpServers };
}

function getMaskedConfigFrom(config: ApiConfig): MaskedConfig {
  const tavily = config.tavily;
  const mcpServers = readMcpServers();
  const composio = config.composio;
  return {
    tavily: {
      configured: Boolean(tavily?.api_key),
      enabled: tavily?.enabled ?? true,
    },
    mcp: {
      configured: mcpServers.length > 0,
      count: mcpServers.length,
      path: getMcpConfigPath(),
    },
    composio: {
      configured: Boolean(composio?.api_key) || Boolean(process.env.COMPOSIO_API_KEY),
      enabled: composio?.enabled ?? true,
    },
    storage: getStorageStatus(),
  };
}
