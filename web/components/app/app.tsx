'use client';

import { useMemo } from 'react';
import { TokenSource } from 'livekit-client';
import { useSession } from '@livekit/components-react';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr';
import type { AppConfig } from '@/app-config';
import { AgentSessionProvider } from '@/components/agents-ui/agent-session-provider';
import { StartAudioButton } from '@/components/agents-ui/start-audio-button';
import { SettingsPanel } from '@/components/app/settings-panel';
import { ViewController } from '@/components/app/view-controller';
import { Toaster } from '@/components/ui/sonner';
import { useAgentErrors } from '@/hooks/useAgentErrors';
import { useDebugMode } from '@/hooks/useDebug';
import { getSandboxTokenSource } from '@/lib/utils';

const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';
const USE_SANDBOX =
  process.env.NEXT_PUBLIC_USE_SANDBOX === 'true' &&
  Boolean(process.env.NEXT_PUBLIC_SANDBOX_ID || process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT);

function AppSetup() {
  useDebugMode({ enabled: IN_DEVELOPMENT });
  useAgentErrors();

  return null;
}

interface AppProps {
  appConfig: AppConfig;
}

function createTokenSource(appConfig: AppConfig) {
  // Optional sandbox path for local experimentation
  if (USE_SANDBOX) {
    if (process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT) {
      return getSandboxTokenSource(appConfig);
    }
    if (process.env.NEXT_PUBLIC_SANDBOX_ID) {
      return TokenSource.sandboxTokenServer(process.env.NEXT_PUBLIC_SANDBOX_ID);
    }
  }

  // Default: secure Next.js /api/token (local + production)
  return TokenSource.endpoint('/api/token');
}

export function App({ appConfig }: AppProps) {
  const tokenSource = useMemo(() => createTokenSource(appConfig), [appConfig]);

  const session = useSession(
    tokenSource,
    appConfig.agentName ? { agentName: appConfig.agentName } : undefined
  );

  return (
    <AgentSessionProvider session={session}>
      <AppSetup />
      <SettingsPanel appConfig={appConfig} />
      <main className="grid h-svh grid-cols-1 place-content-center">
        <ViewController appConfig={appConfig} />
      </main>
      <StartAudioButton label="Start Audio" />
      <Toaster
        icons={{
          warning: <WarningIcon weight="bold" />,
        }}
        position="top-center"
        className="toaster group"
        style={
          {
            '--normal-bg': 'var(--popover)',
            '--normal-text': 'var(--popover-foreground)',
            '--normal-border': 'var(--border)',
          } as React.CSSProperties
        }
      />
    </AgentSessionProvider>
  );
}
