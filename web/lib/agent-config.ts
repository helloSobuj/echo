import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_CONFIG_PATH = path.resolve(process.cwd(), '..', 'agent', 'data', 'api_config.json');

export interface TavilyConfig {
  api_key?: string;
  enabled: boolean;
}

export interface ApiConfig {
  tavily?: TavilyConfig;
}

export interface MaskedTavilyStatus {
  configured: boolean;
  enabled: boolean;
}

export interface MaskedConfig {
  tavily: MaskedTavilyStatus;
}

export function getConfigPath(): string {
  return process.env.AGENT_CONFIG_PATH || DEFAULT_CONFIG_PATH;
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
  const filePath = getConfigPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
}

export function getMaskedConfig(): MaskedConfig {
  const config = readConfig();
  const tavily = config.tavily;
  return {
    tavily: {
      configured: Boolean(tavily?.api_key),
      enabled: tavily?.enabled ?? true,
    },
  };
}

export interface UpdateConfigPayload {
  tavily?: {
    api_key?: string;
    enabled?: boolean;
  };
}

export function updateConfig(payload: UpdateConfigPayload): {
  config: ApiConfig;
  masked: MaskedConfig;
} {
  const current = readConfig();
  const next: ApiConfig = { ...current };

  if (payload.tavily) {
    const existing = next.tavily || { enabled: true };
    next.tavily = {
      ...existing,
      ...payload.tavily,
    };
  }

  writeConfig(next);
  return { config: next, masked: getMaskedConfigFrom(next) };
}

function getMaskedConfigFrom(config: ApiConfig): MaskedConfig {
  const tavily = config.tavily;
  return {
    tavily: {
      configured: Boolean(tavily?.api_key),
      enabled: tavily?.enabled ?? true,
    },
  };
}
