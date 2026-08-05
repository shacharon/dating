/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { enCopy } from '@/lib/i18n/en';
import { ConversationMessageComposer } from './conversation-message-composer';
import { createRef } from 'react';

describe('ConversationMessageComposer initialDraft', () => {
  afterEach(() => {
    cleanup();
  });

  it('prefills textarea from initialDraft and notifies once', async () => {
    const onApplied = vi.fn();
    render(
      <ConversationMessageComposer
        detailCopy={enCopy.conversations.detail}
        modCopy={enCopy.contentModeration}
        sending={false}
        sendError={null}
        sendModerationDetails={null}
        clearSendError={vi.fn()}
        sendMessage={vi.fn()}
        listRef={createRef()}
        initialDraft="Into hiking too?"
        onInitialDraftApplied={onApplied}
      />,
    );

    expect(
      (screen.getByTestId('conversation-message-input') as HTMLTextAreaElement)
        .value,
    ).toBe('Into hiking too?');
    await waitFor(() => {
      expect(onApplied).toHaveBeenCalledWith('Into hiking too?');
    });
  });
});
