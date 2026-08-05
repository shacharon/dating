# Story 02 — Display openers in UI + pre-fill

**Sprint 42 · Status: Done**  
**Closed:** 2026-08-05 — Agent 3 ACCEPT (browser Network smoke deferred — Docker/Postgres down)  
**Priority:** P0 (make openers visible + usable)  
**Estimated effort:** 2 days  
**Dependencies:** Story 1 (backend generates openers)  
**Repo:** `dating-ui` primarily  
**Risk:** Low (straightforward UI work)  
**Handoffs:** `handoffs/STORY_02_opener_ui/agent-*.md`

---

## Objective

Display suggested conversation openers on HIGH priority match cards and enable one-tap usage by pre-filling the conversation message input.

## Why

Backend generates smart openers (Story 1), but they're useless if users can't see or use them easily. This story completes the feature loop.

---

## Current State

After Story 1:
- API returns `suggestedOpener` for HIGH priority matches
- Match card displays photo, priority, explanation
- No opener UI yet

---

## Target State

### Match Card with Opener

**HIGH priority match card:**
```tsx
┌─────────────────────────────────┐
│ [Photo - 60%]                   │
│ Sarah, 32 • Tel Aviv            │
│                                 │
│ 🎯 92% match                    │
│ You both want kids and love...  │
│                                 │
│ 💬 TRY THIS:                    │
│ "I saw you love hiking - have   │
│  you done the Israel Trail?"    │
│                                 │
│ [Use this opener] [View match]  │
└─────────────────────────────────┘
```

**When user taps "Use this opener":**
1. Navigate to `/dating/conversations/{conversationId}`
2. Pre-fill message input with opener text
3. User can edit or send as-is
4. Track: Opener used

**GOOD/OTHER priority matches:**
- No opener shown (only HIGH gets this feature)

---

## Scope / Tasks

### Agent 0 (Architect)
1. Review match card component structure
2. Decide: Opener in card OR separate section?
3. Design URL param strategy for pre-filling:
   - Option A: `/conversations/{id}?starter=...`
   - Option B: Session storage
   - Option C: Context/state management
4. Define analytics events to track
5. Lock styling (how prominent should opener be?)

### Agent 1 (Senior Dev)

**1. Update match DTO types:**
```typescript
// In dating-ui/src/types/match.ts
export interface Match {
  ...existing fields,
  suggestedOpener?: string  // Only on HIGH priority
}
```

**2. Update match card component:**
```tsx
// In components/match-card.tsx or similar

export function MatchCard({ match }: { match: Match }) {
  const showOpener = match.priorityTier === 'HIGH' && match.suggestedOpener;

  return (
    <div className="match-card">
      <MatchPhoto src={match.primaryPhotoUrl} />
      
      <div className="match-info">
        <h3>{match.name}, {match.age}</h3>
        <p className="match-score">🎯 {match.priorityScore}% match</p>
        <p className="match-reason">{match.reasonShort}</p>

        {showOpener && (
          <div className="conversation-starter">
            <p className="starter-label">💬 TRY THIS:</p>
            <p className="starter-text">"{match.suggestedOpener}"</p>
            <button
              onClick={() => handleUseOpener(match.conversationId, match.suggestedOpener)}
              className="btn-use-opener"
            >
              Use this opener
            </button>
          </div>
        )}

        <div className="match-actions">
          <Link href={`/dating/me-matches/${match.id}`}>View match</Link>
        </div>
      </div>
    </div>
  );
}
```

**3. Implement opener usage flow:**
```typescript
// In match card or dedicated hook

const handleUseOpener = (conversationId: string, opener: string) => {
  // Track analytics
  trackEvent('conversation.opener_used', {
    conversationId,
    openerLength: opener.length
  });

  // Navigate with pre-filled message
  router.push(
    `/dating/conversations/${conversationId}?starter=${encodeURIComponent(opener)}`
  );
};
```

**4. Update conversation page to accept starter:**
```tsx
// In /dating/conversations/[id]/page.tsx or client component

export function ConversationPageClient({ conversationId }: Props) {
  const searchParams = useSearchParams();
  const starterFromUrl = searchParams.get('starter');
  
  const [message, setMessage] = useState(starterFromUrl || '');

  useEffect(() => {
    if (starterFromUrl) {
      // Track that opener was pre-filled
      trackEvent('conversation.opener_prefilled', { conversationId });
    }
  }, [starterFromUrl, conversationId]);

  return (
    <div className="conversation">
      <MessageList messages={messages} />
      
      <MessageInput
        value={message}
        onChange={setMessage}
        onSend={() => handleSend(message)}
      />
    </div>
  );
}
```

**5. Add styling:**
```css
/* Conversation starter section */
.conversation-starter {
  margin-top: 12px;
  padding: 12px;
  background: rgba(99, 102, 241, 0.1); /* Light indigo */
  border-left: 3px solid rgb(99, 102, 241);
  border-radius: 8px;
}

.starter-label {
  font-size: 12px;
  font-weight: 600;
  color: rgb(99, 102, 241);
  margin-bottom: 6px;
}

.starter-text {
  font-size: 14px;
  font-style: italic;
  color: rgb(55, 65, 81);
  margin-bottom: 8px;
}

.btn-use-opener {
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
  background: rgb(99, 102, 241);
  color: white;
  border-radius: 6px;
  transition: background 0.2s;
}

.btn-use-opener:hover {
  background: rgb(79, 70, 229);
}

/* Dark mode */
.dark .conversation-starter {
  background: rgba(99, 102, 241, 0.15);
}

.dark .starter-text {
  color: rgb(209, 213, 219);
}
```

### Agent 2 (Code Review)
1. Verify opener only shows on HIGH priority
2. Check: URL encoding handles special chars (quotes, emojis)
3. Verify: Pre-filled message can be edited (not locked)
4. Check: Analytics events fire correctly
5. Verify: Mobile responsive (opener section doesn't break layout)
6. Check: Dark mode styling works
7. Verify: Accessibility (button has aria-label)

### Agent 3 (PM)
1. **Manual smoke test:**
   - Load match list with HIGH priority match
   - Verify: Opener displays correctly
   - Tap "Use this opener"
   - Verify: Navigates to conversation
   - Verify: Message input pre-filled
   - Verify: Can edit pre-filled text
   - Verify: Can send or delete
2. **Test edge cases:**
   - Opener with quotes → renders correctly?
   - Opener with emoji → displays correctly?
   - No opener (LLM failed) → section hidden?
   - GOOD priority match → no opener shown?
3. **Screenshot documentation:**
   - Before/after for sprint review
4. **User feedback:**
   - Show to wife/friends: "Would you use this?"
   - Document reactions

---

## Locked Policy (Architect)

See [`handoffs/STORY_02_opener_ui/agent-0-architect.md`](./handoffs/STORY_02_opener_ui/agent-0-architect.md).

| Item | Decision |
|------|----------|
| Display | `MatchBrowseCard` only; HIGH + non-null `suggestedOpener` |
| No list `conversationId` | **Like & use opener** → draft in sessionStorage → mutual celebration → `?starter=` |
| Prefill | URL `?starter=` (encodeURIComponent) + editable composer `initialDraft` |
| Style | Emerald/zinc HIGH language — not indigo |
| Analytics | `emitProductLog`: `opener_displayed` / `opener_used` / `opener_prefilled` |
| Schema / API | No backend changes |

---

## Out of Scope

- Multiple opener options (just 1 shown)
- Opener regeneration ("try another")
- User feedback on opener quality (Story 3)
- Opener for GOOD/OTHER priority
- Copy-to-clipboard button

---

## Acceptance Criteria

- [x] Opener displays on HIGH priority match cards
- [x] "Use this opener" button navigates to conversation
- [x] Message input pre-filled with opener text
- [x] User can edit pre-filled text before sending
- [x] Analytics track: `opener_used` and `opener_prefilled`
- [x] GOOD/OTHER matches don't show opener
- [x] Mobile responsive (works on small screens)
- [x] Dark mode styling correct
- [x] Empty/missing opener handled gracefully (section hidden)

---

## Testing

### Unit Tests
```typescript
describe('MatchCard with opener', () => {
  it('shows opener for HIGH priority', () => {
    const match = { priorityTier: 'HIGH', suggestedOpener: 'Test opener' };
    render(<MatchCard match={match} />);
    expect(screen.getByText('💬 TRY THIS:')).toBeInTheDocument();
  });

  it('hides opener for GOOD priority', () => {
    const match = { priorityTier: 'GOOD', suggestedOpener: 'Test' };
    render(<MatchCard match={match} />);
    expect(screen.queryByText('💬 TRY THIS:')).not.toBeInTheDocument();
  });

  it('handles missing opener gracefully', () => {
    const match = { priorityTier: 'HIGH', suggestedOpener: undefined };
    render(<MatchCard match={match} />);
    expect(screen.queryByText('💬 TRY THIS:')).not.toBeInTheDocument();
  });
});

describe('Conversation pre-fill', () => {
  it('pre-fills message from URL param', () => {
    const searchParams = new URLSearchParams({ starter: 'Test message' });
    render(<ConversationPage searchParams={searchParams} />);
    expect(screen.getByRole('textbox')).toHaveValue('Test message');
  });
});
```

### Manual Validation
1. Load `/dating/me-matches`
2. Find HIGH priority match with opener
3. Click "Use this opener"
4. Verify: Redirects to conversation
5. Verify: Message input contains opener
6. Edit message (add/remove words)
7. Send message
8. Verify: Message sent correctly

---

## Edge Cases to Test

| Case | Expected Behavior |
|------|-------------------|
| Opener with quotes | Renders with quotes (not escaped) |
| Opener with emoji | Emoji displays correctly |
| Very long opener (20+ words) | Truncated or wraps |
| Empty opener string | Section hidden |
| No conversationId yet | Button disabled or hidden |
| User deletes pre-filled text | Can send empty or write new |

---

## Analytics Events

Track these for Story 3 analysis:

```typescript
// When opener displayed
trackEvent('conversation.opener_displayed', {
  conversationId,
  priorityScore,
  openerLength
});

// When user taps "Use this opener"
trackEvent('conversation.opener_used', {
  conversationId,
  openerLength
});

// When conversation page loads with pre-filled opener
trackEvent('conversation.opener_prefilled', {
  conversationId
});

// When user sends message (Story 3 will track if edited)
trackEvent('conversation.message_sent', {
  conversationId,
  wasPrefilled: boolean,
  wasEdited: boolean  // Compare sent text to original opener
});
```

---

## Suggested Commits

**Frontend:**
```
feat(ui): display conversation openers on HIGH priority matches

- Show "Try this:" section with suggested opener
- "Use this opener" button pre-fills conversation input
- Only visible on HIGH priority matches
- Analytics: track opener usage

Sprint 42 Story 2
```

**Analytics:**
```
feat(analytics): track conversation opener usage

- opener_displayed, opener_used, opener_prefilled events
- Enables Story 3 effectiveness analysis

Sprint 42 Story 2
```

---

## Follow-Up (Story 3)

After this lands, Story 3 tracks effectiveness:
- Usage rate: % of users who tap "Use this opener"
- Edit rate: % who modify before sending
- Send rate: % who actually send (not abandon)
- Response rate: Do openers get more replies?
