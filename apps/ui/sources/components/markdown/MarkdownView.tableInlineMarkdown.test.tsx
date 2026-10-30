import React from 'react';
import { act, type ReactTestInstance } from 'react-test-renderer';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { renderScreen } from '@/dev/testkit';
import { installMarkdownCommonModuleMocks } from './markdownTestHelpers';

Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
installMarkdownCommonModuleMocks({
    reactNative: async () => {
        const { createReactNativeWebMock } = await import('@/dev/testkit/mocks/reactNative');
        return createReactNativeWebMock({ Platform: { OS: 'web' } });
    },
});

// Substitute the actual web renderer at the native package boundary, not its parsing logic.
vi.mock('react-native-enriched-markdown', async () => {
    const url = new URL('../../../node_modules/react-native-enriched-markdown/src/web/EnrichedMarkdownText.tsx', import.meta.url).href;
    return import(/* @vite-ignore */ url);
});
const openExternalUrl = vi.hoisted(() => vi.fn(async (_url: string) => true));
vi.mock('@/utils/url/openExternalUrl', () => ({ openExternalUrl }));

beforeAll(async () => {
    const url = new URL('../../../node_modules/react-native-enriched-markdown/src/web/parseMarkdown.ts', import.meta.url).href;
    const parser = await import(/* @vite-ignore */ url);
    await parser.preloadMarkdownRuntime();
});

function renderedText(node: ReactTestInstance | string): string {
    return typeof node === 'string' ? node : node.children.map(renderedText).join('');
}

describe('table inline Markdown through the web renderer', () => {
    it('preserves literal content and opens complete links, including nested formatting and parentheses', async () => {
        const { MarkdownView } = await import('./MarkdownView');
        const intercept = vi.fn(() => false);
        const screen = await renderScreen(<MarkdownView onLinkPress={intercept} markdown={[
            '| [Project](https://example.test/project) | Value |',
            '| --- | --- |',
            '| PR | [project #123](https://example.test/project/pull/123) |',
            '| Parentheses | [balanced](https://example.test/A_(B)) |',
            '| Bold | **[nested](https://example.test/nested)** |',
            '| Glob | src/*.ts |',
            '| Code | `[literal](https://example.test/code)` |',
            '| Unsafe | [unsafe](javascript:alert%281%29) |',
        ].join('\n')} />);
        const links = screen.findAllByType('a' as any);
        expect(links.map(node => node.props.href)).toEqual([
            'https://example.test/project', 'https://example.test/project/pull/123',
            'https://example.test/A_(B)', 'https://example.test/nested',
        ]);
        await act(async () => links[2]!.props.onClick({ preventDefault: vi.fn(), stopPropagation: vi.fn() }));
        expect(intercept).toHaveBeenCalledWith('https://example.test/A_(B)');
        expect(openExternalUrl).toHaveBeenCalledWith('https://example.test/A_(B)');
        expect(screen.findAllByType('code' as any).map(renderedText)).toContain('[literal](https://example.test/code)');
        expect(screen.findAllByType('p' as any).map(renderedText)).toContain('src/*.ts');
        expect(screen.findAllByType('strong' as any).length).toBeGreaterThan(0);
    }, 60_000);
});
