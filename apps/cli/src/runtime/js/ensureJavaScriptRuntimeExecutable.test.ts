import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureJavaScriptRuntimeExecutable } from './ensureJavaScriptRuntimeExecutable';

describe('private JavaScript runtime resolution', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps the current local runtime usable without external access', async () => {
    await expect(ensureJavaScriptRuntimeExecutable({ isBunRuntime: false, currentExecPath: process.execPath, processEnv: { HAPPIER_EXTERNAL_NETWORK_ACCESS: '0' } })).resolves.toBe(process.execPath);
  });

  it('does not download a missing runtime', async () => {
    const home = await mkdtemp(join(tmpdir(), 'happier-private-runtime-'));
    const fetch = vi.fn(async () => { throw new Error('unexpected download'); });
    vi.stubGlobal('fetch', fetch);
    const execPath = process.execPath;
    Object.defineProperty(process, 'execPath', { value: join(home, 'missing-native-runner'), configurable: true });
    try {
      await expect(ensureJavaScriptRuntimeExecutable({ isBunRuntime: true, currentExecPath: null, processEnv: { HAPPIER_HOME_DIR: home, PATH: '', HAPPIER_EXTERNAL_NETWORK_ACCESS: '0' } })).resolves.toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(process, 'execPath', { value: execPath, configurable: true });
      await rm(home, { recursive: true, force: true });
    }
  });
});
