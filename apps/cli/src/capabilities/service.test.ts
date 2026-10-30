import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHECKLIST_IDS } from './checklistIds';
import { createCapabilitiesService, type Capability } from './service';
import type { CapabilitiesDetectContextBuilder } from './service';
import type { CapabilityDetectRequest, ChecklistId } from './types';

describe('createCapabilitiesService', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('rejects remote installation when external network access is disabled', async () => {
    vi.stubEnv('HAPPIER_EXTERNAL_NETWORK_ACCESS', '0');
    const invoke = vi.fn(async () => ({ ok: true as const, result: {} }));
    const service = createCapabilitiesService({
      capabilities: [{ descriptor: { id: 'cli.claude', kind: 'cli' }, detect: async () => ({}), invoke }],
      checklists: {} as Record<ChecklistId, CapabilityDetectRequest[]>,
      buildContext: async () => ({ cliSnapshot: null }),
    });
    await expect(service.invoke({ id: 'cli.claude', method: 'install' })).resolves.toMatchObject({ ok: false, error: { code: 'external-network-disabled' } });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('applies top-level bypassCache to checklist requests before building context', async () => {
    const buildContext = vi.fn<CapabilitiesDetectContextBuilder>(async () => ({ cliSnapshot: null }));
    const detect = vi.fn(async () => ({ available: true }));

    const capabilities: Capability[] = [
      {
        descriptor: { id: 'cli.claude', kind: 'cli' },
        detect,
      },
      {
        descriptor: { id: 'tool.executionRuns', kind: 'tool' },
        detect,
      },
    ];

    const service = createCapabilitiesService({
      capabilities,
      checklists: {
        [CHECKLIST_IDS.NEW_SESSION]: [
          { id: 'cli.claude' },
          { id: 'tool.executionRuns' },
        ] as CapabilityDetectRequest[],
      } as Record<ChecklistId, CapabilityDetectRequest[]>,
      buildContext,
    });

    await service.detect({
      checklistId: CHECKLIST_IDS.NEW_SESSION,
      bypassCache: true,
    });

    expect(buildContext).toHaveBeenCalledWith([
      { id: 'cli.claude', params: { bypassCache: true } },
      { id: 'tool.executionRuns', params: { bypassCache: true } },
    ]);
  });
});
