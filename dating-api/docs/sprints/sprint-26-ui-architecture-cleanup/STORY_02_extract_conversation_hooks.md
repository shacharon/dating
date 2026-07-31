# Story 2: Extract conversation detail hooks from 604-line page

**Priority:** P0 (Critical)  
**Estimated effort:** 1–2 days  
**Agent:** `generalPurpose`  
**Dependencies:** None

---

## Problem

`dating-ui/src/app/dating/conversations/[id]/page.tsx` is **604 lines** with ~10 `useState` hooks, polling logic, socket integration, mark-read debounce, unmatch flow, and report dialog all mixed together. This makes it hard to:
- Test message logic independently
- Reuse conversation patterns elsewhere
- Review changes (high regression risk)
- Reason about race conditions

---

## Goal

Extract reusable custom hooks:
1. `useConversationMessages` — load, send, receive, mark-read
2. `useConversationActions` — unmatch, report
3. `useConversationPolling` — 3-second poll with cleanup

Page component should be <300 lines, focused on UI composition.

---

## Acceptance Criteria

- [ ] `hooks/use-conversation-messages.ts` created with tests
- [ ] `hooks/use-conversation-actions.ts` created with tests
- [ ] `hooks/use-conversation-polling.ts` created with tests
- [ ] Page component <300 lines
- [ ] No behavior change (send/receive/unmatch/report all work)
- [ ] Tests cover happy path + error cases for each hook
- [ ] Socket integration still works
- [ ] Polling cleanup on unmount verified
- [ ] Commit message follows convention

---

## Current structure (reference)

```typescript
// Current: app/dating/conversations/[id]/page.tsx (~604 lines)

export default function ConversationDetailPage() {
  // ~10 useState hooks
  const [messages, setMessages] = useState<Message[]>([])
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unmatchDialogOpen, setUnmatchDialogOpen] = useState(false)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  // ... more state

  // Polling logic
  useEffect(() => {
    const interval = setInterval(() => {
      // poll messages
    }, 3000)
    return () => clearInterval(interval)
  }, [conversationId])

  // Socket integration
  useMessagingSocket({
    onMessage: (msg) => { /* add to messages */ }
  })

  // Mark-read debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      // mark read
    }, 500)
    return () => clearTimeout(timer)
  }, [messages])

  // Unmatch logic
  const handleUnmatch = async () => { /* ... */ }

  // Report logic
  const handleReport = async () => { /* ... */ }

  // Send message
  const handleSend = async () => { /* ... */ }

  // 400+ lines of JSX
}
```

---

## Proposed hooks

### 1. `use-conversation-messages.ts`
```typescript
interface UseConversationMessagesOptions {
  conversationId: string;
  pollInterval?: number; // default 3000ms
}

interface UseConversationMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  sending: boolean;
  markAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useConversationMessages(
  options: UseConversationMessagesOptions
): UseConversationMessagesReturn {
  // Load messages on mount
  // Poll for new messages
  // Handle socket updates
  // Debounced mark-read
  // Send message with optimistic UI
}
```

### 2. `use-conversation-actions.ts`
```typescript
interface UseConversationActionsReturn {
  unmatch: () => Promise<void>;
  unmatching: boolean;
  report: (reason: string) => Promise<void>;
  reporting: boolean;
}

export function useConversationActions(
  conversationId: string
): UseConversationActionsReturn {
  // Unmatch flow
  // Report flow
  // Error handling
  // Toast notifications
}
```

### 3. `use-conversation-polling.ts`
```typescript
interface UseConversationPollingOptions {
  conversationId: string;
  interval: number; // milliseconds
  onNewMessages: (messages: Message[]) => void;
  enabled: boolean; // allow pause/resume
}

export function useConversationPolling(
  options: UseConversationPollingOptions
): void {
  // Set up interval
  // Fetch messages
  // Call onNewMessages if new data
  // Clean up on unmount or when enabled=false
}
```

---

## Agent instructions

### Step 1: Read current file
```bash
1. Read app/dating/conversations/[id]/page.tsx
2. Identify state blocks:
   - Messages state + loading/error
   - Polling logic
   - Socket integration
   - Mark-read debounce
   - Unmatch state + dialog
   - Report state + dialog
   - Send message logic
```

### Step 2: Create `use-conversation-messages` hook
```bash
1. Create dating-ui/src/hooks/use-conversation-messages.ts
2. Extract:
   - messages, loading, error state
   - loadMessages (initial fetch)
   - Poll logic (useEffect with interval)
   - Socket listener integration (useMessagingSocket)
   - Mark-read debounce
   - sendMessage with optimistic UI
3. Return clean interface
```

### Step 3: Create `use-conversation-actions` hook
```bash
1. Create dating-ui/src/hooks/use-conversation-actions.ts
2. Extract:
   - unmatch logic (call API, handle error, redirect)
   - report logic (call API, handle error, toast)
3. Return { unmatch, unmatching, report, reporting }
```

### Step 4: Create `use-conversation-polling` hook
```bash
1. Create dating-ui/src/hooks/use-conversation-polling.ts
2. Extract polling logic as reusable hook
3. Support enable/disable
4. Ensure cleanup on unmount
```

### Step 5: Refactor page to use hooks
```bash
1. Import new hooks
2. Replace inline logic with hook calls:
   const { messages, sendMessage, markAsRead, ... } = useConversationMessages({...})
   const { unmatch, report, ... } = useConversationActions(conversationId)
   useConversationPolling({ conversationId, interval: 3000, onNewMessages, enabled })
3. Page should now be <300 lines
```

### Step 6: Add tests for hooks
```bash
1. Create use-conversation-messages.spec.ts:
   - Test load messages
   - Test send message (optimistic UI)
   - Test mark-read
   - Test error handling
   - Mock fetch, verify calls

2. Create use-conversation-actions.spec.ts:
   - Test unmatch flow
   - Test report flow
   - Mock API calls

3. Create use-conversation-polling.spec.ts:
   - Test interval setup
   - Test cleanup
   - Test enable/disable
```

### Step 7: Manual test
```bash
1. Navigate to conversation detail page
2. Verify messages load
3. Send a message (check optimistic UI)
4. Verify messages auto-refresh (polling)
5. Test unmatch (dialog, confirmation, redirect)
6. Test report (dialog, submit, toast)
7. Verify socket updates (if available)
8. Check no console errors/warnings
```

### Step 8: Commit
```bash
git add dating-ui/src/hooks/use-conversation-*.ts
git add dating-ui/src/app/dating/conversations/[id]/page.tsx
git commit -m "refactor(ui): extract conversation detail hooks

Extract reusable hooks from 604-line conversation page:
- useConversationMessages: load/send/mark-read/polling
- useConversationActions: unmatch/report flows
- useConversationPolling: 3s interval with cleanup

Page now <300 lines. Add vitest specs for each hook.
No behavior change.

Sprint 26 Story 2"
```

---

## Testing checklist

Manual:
- [ ] Conversation loads messages
- [ ] Send message works (shows optimistic, confirms after API)
- [ ] Messages auto-refresh every 3s
- [ ] Mark-read debounce works (no spam)
- [ ] Unmatch dialog opens, confirms, redirects
- [ ] Report dialog opens, submits, shows toast
- [ ] Socket updates work (if testable)
- [ ] No console errors

Automated:
- [ ] Hook tests pass (`npm test`)
- [ ] Page still renders correctly
- [ ] TypeScript clean

---

## Success criteria

- ✅ 3 new hooks created with tests
- ✅ Page <300 lines
- ✅ No behavior change
- ✅ Clean separation of concerns
- ✅ Tests cover main flows

---

## Notes

- **Socket integration**: Keep `useMessagingSocket` call in page, pass callback to hook
- **Debounce**: Use existing pattern or import from utils
- **Error handling**: Maintain existing toast/error boundary behavior
- **Polling interval**: Make configurable (default 3000ms) for testing
- **Race conditions**: Ensure cleanup prevents state updates after unmount
