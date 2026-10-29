import { createCodexAppServerStreamEventBridge } from '../streamEventBridge';
import type { CodexRolloutAction } from '../../localControl/rolloutMapper';

/** Project provider-owned history without treating its activity records as new tool executions. */
export function projectCodexNativeHistoryItem(item: Readonly<Record<string, unknown>>): CodexRolloutAction[] {
  if (item.type === 'userMessage') {
    if (!Array.isArray(item.content)) throw new Error('Codex native history contains malformed user content');
    const nativeContent: Record<string, unknown>[] = [];
    const parts: string[] = [];
    const content: readonly unknown[] = item.content;
    for (const value of content) {
      if (!value || typeof value !== 'object' || Array.isArray(value) || !('type' in value) || typeof value.type !== 'string') {
        throw new Error('Codex native history contains malformed user content');
      }
      const part = value as Record<string, unknown>;
      nativeContent.push(part);
      if (part.type === 'text') {
        if (typeof part.text !== 'string') throw new Error('Codex native history contains malformed user text');
        parts.push(part.text);
      } else if (part.type === 'localImage' || part.type === 'image') {
        const reference = part.type === 'localImage' ? part.path : part.url;
        if (typeof reference !== 'string' || !reference) throw new Error('Codex native history contains malformed image content');
        parts.push(`[Image attachment reference: ${reference.startsWith('data:') ? 'embedded image' : reference}]`);
      } else {
        parts.push(`[Codex ${part.type} input]\n${JSON.stringify(part, null, 2)}`);
      }
    }
    return [{ type: 'user-text', text: parts.join('\n'), nativeContent }];
  }
  if (['webSearch', 'imageView', 'subAgentActivity', 'collabAgentToolCall'].includes(String(item.type))) {
    return [{ type: 'native-event', item }];
  }
  const bridge = createCodexAppServerStreamEventBridge();
  const updates = bridge.onNotification({
    method: item.type === 'userMessage' ? 'item/started' : 'item/completed', params: { item },
  });
  const actions: CodexRolloutAction[] = [];
  for (const update of updates) {
    switch (update.type) {
      case 'provider-user-text': actions.push({ type: 'user-text', text: update.text }); break;
      case 'assistant-text-final':
      case 'async-user-input-request': actions.push({ type: 'assistant-text', text: update.text }); break;
      case 'tool-call': actions.push({ type: 'tool-call', callId: update.callId, name: update.name, input: update.input }); break;
      case 'tool-result': actions.push({ type: 'tool-result', callId: update.callId, output: update.output }); break;
      case 'context-compaction': actions.push({ type: 'context-compaction', phase: 'completed', lifecycleId: `codex:context-compaction:${update.itemId}`, source: 'provider-event', providerEventId: update.itemId }); break;
      case 'reasoning-final': actions.push({ type: 'thinking', text: update.text }); break;
      case 'review-mode-started':
      case 'review-mode-completed':
      case 'session-media': actions.push({ type: 'native-event', item }); break;
      default: throw new Error(`Codex native history contains an unsupported transcript update: ${update.type}`);
    }
  }
  if (updates.length === 0 && !['reasoning', 'hookPrompt'].includes(String(item.type))) {
    if (typeof item.type !== 'string' || !item.type.trim()) throw new Error('Codex native history contains a malformed transcript item');
    // Native APIs add activity kinds independently of this client. Preserve them
    // explicitly as history records without inventing executable tool semantics.
    return [{ type: 'native-event', item }];
  }
  return actions;
}
