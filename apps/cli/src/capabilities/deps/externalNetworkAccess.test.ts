import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('dependency status without external network access', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

  it('does not fetch latest releases even when explicitly requested', async () => {
    const home = await mkdtemp(join(tmpdir(), 'happier-private-deps-'));
    vi.stubEnv('HAPPIER_HOME_DIR', home);
    vi.stubEnv('HAPPIER_EXTERNAL_NETWORK_ACCESS', '0');
    const fetch = vi.fn(async () => { throw new Error('unexpected external request'); });
    vi.stubGlobal('fetch', fetch);
    try {
      const { getGhDepStatus } = await import('./gh');
      const { getCodexAcpDepStatus } = await import('./codexAcp');
      const { getAgyAcpDepStatus } = await import('./agyAcp');
      for (const detect of [getGhDepStatus, getCodexAcpDepStatus, getAgyAcpDepStatus]) {
        expect(await detect({ includeLatestVersion: true })).not.toHaveProperty('latestVersionCheck');
      }
      expect(fetch).not.toHaveBeenCalled();
    } finally { await rm(home, { recursive: true, force: true }); }
  });
});
