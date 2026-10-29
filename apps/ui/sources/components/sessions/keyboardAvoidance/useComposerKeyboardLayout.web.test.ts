import { act } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHook, standardCleanup } from '@/dev/testkit';

const webHookState = vi.hoisted(() => ({
    windowHeight: 800,
}));

vi.mock('react-native', async () => {
    const { createReactNativeWebMock } = await import('@/dev/testkit/mocks/reactNative');
    return createReactNativeWebMock({
        useWindowDimensions: () => ({
            width: 1024,
            height: webHookState.windowHeight,
            scale: 1,
            fontScale: 1,
        }),
    });
});

vi.mock('react-native-reanimated', async () => {
    const React = await import('react');
    return {
        useSharedValue: <T,>(value: T) => React.useRef({ value }).current,
    };
});

describe('useComposerKeyboardLayout web', () => {
    afterEach(() => vi.unstubAllGlobals());

    beforeEach(() => {
        standardCleanup();
        webHookState.windowHeight = 800;
    });

    it('does not reserve the measured composer height inside the transcript inset', async () => {
        const { useComposerKeyboardLayout } = await import('./useComposerKeyboardLayout.web');
        const hook = await renderHook(() => useComposerKeyboardLayout({
            headerHeight: 100,
            safeAreaBottom: 0,
        }));

        act(() => {
            hook.getCurrent().setComposerMeasuredHeight(127);
        });

        expect(hook.getCurrent().composerHeight.value).toBe(127);
        expect(hook.getCurrent().listBottomInset.value).toBe(0);
    });

    it('caps available panel height to the measured scaffold container', async () => {
        const { useComposerKeyboardLayout } = await import('./useComposerKeyboardLayout.web');
        const hook = await renderHook(() => useComposerKeyboardLayout({
            availablePanelMaxHeight: 420,
            headerHeight: 100,
            safeAreaBottom: 0,
        }));

        expect(hook.getCurrent().availablePanelHeight.value).toBe(420);
    });

    it.each([{ reserved: 0, lift: 404 }, { reserved: 56, lift: 348 }])('accounts for $reserved pixels already reserved below the composer', async ({ reserved, lift }) => {
        webHookState.windowHeight = 844;
        const viewport = Object.assign(new EventTarget(), { height: 440, width: 390, offsetTop: 0 });
        vi.stubGlobal('window', Object.assign(new EventTarget(), { innerHeight: 844, visualViewport: viewport }));
        vi.stubGlobal('document', { activeElement: { tagName: 'TEXTAREA' } });
        const { useComposerKeyboardLayout } = await import('./useComposerKeyboardLayout.web');
        const hook = await renderHook(() => useComposerKeyboardLayout({
            availablePanelMaxHeight: 788 - reserved,
            headerHeight: 56,
            layoutBottomInset: reserved,
        }));
        expect(hook.getCurrent().bottomInset.value).toBe(lift);
        expect(hook.getCurrent().availablePanelHeight.value).toBe(384);
        expect(hook.getCurrent().keyboardHeightLive.value).toBe(404);
        act(() => { viewport.height = 844; viewport.dispatchEvent(new Event('resize')); });
        expect(hook.getCurrent().bottomInset.value).toBe(0);
        expect(hook.getCurrent().availablePanelHeight.value).toBe(788 - reserved);
    });
});
