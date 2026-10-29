import { isRecoveredHistoryTranscriptObservationProvenance } from '@happier-dev/protocol';
import { normalizeTranscriptSeq } from '../../domains/messages/transcriptOrdering';
import type { NormalizedMessage } from '../../typesRaw';
import type { ReducerState } from '../reducer';

export function reconcileUserMessageEcho(params: Readonly<{
    state: ReducerState;
    message: NormalizedMessage;
    changed: Set<string>;
}>): boolean {
    const { state, message, changed } = params;
    if (message.role !== 'user' || !message.localId
        || isRecoveredHistoryTranscriptObservationProvenance(message.transcriptObservationProvenance)) return false;
    const messageId = state.localIds.get(message.localId);
    if (!messageId) return false;

    // Native history can materialize the row before its sequenced relay echo.
    const existing = state.messages.get(messageId);
    if (existing?.role === 'user') {
        const seq = normalizeTranscriptSeq(message.seq);
        const previousSeq = normalizeTranscriptSeq(existing.seq);
        if (seq !== null && (previousSeq === null || seq > previousSeq)) {
            existing.seq = seq;
            changed.add(messageId);
        }
    }
    state.messageIds.set(message.id, messageId);
    return true;
}
