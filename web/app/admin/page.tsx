'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface TavilyStatus {
  configured: boolean;
  enabled: boolean;
}

interface ConfigStatus {
  tavily: TavilyStatus;
}

export default function AdminPage() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [tavilyKey, setTavilyKey] = useState('');
  const [tavilyEnabled, setTavilyEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/admin/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setTavilyEnabled(data.tavily.enabled);
        setIsAuthed(true);
      } else if (res.status === 401) {
        setIsAuthed(false);
      }
    } catch {
      setIsAuthed(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setIsAuthed(true);
        await checkAuth();
      } else {
        const data = await res.json();
        setLoginError(data.error || 'Login failed');
      }
    } catch {
      setLoginError('Login failed');
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {}
    setIsAuthed(false);
    setConfig(null);
    setTavilyKey('');
    setPassword('');
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage('');
    try {
      const payload: { tavily: { enabled: boolean; api_key?: string } } = {
        tavily: { enabled: tavilyEnabled },
      };
      if (tavilyKey.trim()) {
        payload.tavily.api_key = tavilyKey.trim();
      }

      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setSaveMessage('Settings saved successfully.');
        if (tavilyKey.trim()) {
          setTavilyKey('');
        }
      } else {
        const data = await res.json();
        setSaveMessage(data.error || 'Failed to save settings.');
      }
    } catch {
      setSaveMessage('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="bg-card w-full max-w-sm space-y-6 rounded-xl border p-8 shadow-sm">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Admin Panel</h1>
            <p className="text-muted-foreground text-sm">
              Enter the administrator password to continue.
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2"
                placeholder="Enter admin password"
                autoFocus
              />
              {loginError && <p className="text-destructive text-sm">{loginError}</p>}
            </div>
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground text-sm">
            Configure API keys and integrations for Echo.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Sign Out
        </Button>
      </div>

      <Separator className="mb-6" />

      <div className="space-y-6">
        <section className="bg-card rounded-xl border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Tavily Web Search</h2>
              <p className="text-muted-foreground text-sm">
                Enable Echo to search the web for current information using Tavily.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex size-2 rounded-full ${
                  config?.tavily.configured ? 'bg-green-500' : 'bg-muted-foreground/30'
                }`}
              />
              <span className="text-muted-foreground text-sm">
                {config?.tavily.configured ? 'Configured' : 'Not set'}
              </span>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="tavily-key" className="text-sm font-medium">
                API Key
              </label>
              <div className="flex gap-2">
                <input
                  id="tavily-key"
                  type="password"
                  value={tavilyKey}
                  onChange={(e) => setTavilyKey(e.target.value)}
                  className="bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex-1 rounded-md border px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2"
                  placeholder={
                    config?.tavily.configured
                      ? 'Leave blank to keep existing key'
                      : 'Paste your Tavily API key'
                  }
                />
              </div>
              <p className="text-muted-foreground text-xs">
                Get a free API key from{' '}
                <a
                  href="https://tavily.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground underline underline-offset-4"
                >
                  tavily.com
                </a>
                . The key is stored locally and never shown again.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Web Search Enabled</p>
                <p className="text-muted-foreground text-xs">
                  When disabled, Echo will not use Tavily even if a key is configured.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTavilyEnabled(!tavilyEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                  tavilyEnabled ? 'bg-primary' : 'bg-muted'
                }`}
                role="switch"
                aria-checked={tavilyEnabled}
              >
                <span
                  className={`inline-block size-4 rounded-full bg-white shadow-sm transition-transform ${
                    tavilyEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            {saveMessage && (
              <span
                className={`text-sm ${
                  saveMessage.includes('saved') ? 'text-green-500' : 'text-destructive'
                }`}
              >
                {saveMessage}
              </span>
            )}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
