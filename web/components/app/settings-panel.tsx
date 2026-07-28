'use client';

import { useState } from 'react';
import type { AppConfig } from '@/app-config';
import { Button } from '@/components/ui/button';

interface SettingsPanelProps {
  appConfig: AppConfig;
}

export function SettingsPanel({ appConfig }: SettingsPanelProps) {
  const [open, setOpen] = useState(false);
  const modelMode = appConfig.modelMode ?? 'inference';

  return (
    <div className="fixed top-4 right-4 z-50">
      <Button
        variant="outline"
        size="sm"
        className="rounded-full font-mono text-[10px] tracking-wider uppercase"
        onClick={() => setOpen((v) => !v)}
      >
        Settings
      </Button>

      {open && (
        <div className="bg-popover text-popover-foreground border-border mt-2 w-72 rounded-xl border p-4 shadow-lg">
          <h2 className="text-sm font-semibold">Operator settings</h2>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            Model keys are configured on the agent server, never in the browser.
          </p>

          <dl className="mt-4 space-y-3 text-xs">
            <div>
              <dt className="text-muted-foreground">Model mode</dt>
              <dd className="mt-0.5 font-mono font-medium">{modelMode}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Agent name</dt>
              <dd className="mt-0.5 font-mono font-medium">{appConfig.agentName ?? 'auto'}</dd>
            </div>
          </dl>

          <p className="text-muted-foreground mt-4 text-xs leading-5">
            Switch to BYOK by setting <code className="font-mono">MODEL_MODE=byok</code> in{' '}
            <code className="font-mono">agent/.env.local</code>. See the project README.
          </p>

          <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
}
