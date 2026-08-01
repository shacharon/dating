# Sprint 36: Component Refactoring - Agent Commands

**Sprint Goal:** Clean up technical debt and improve code maintainability  
**Duration:** 1 week  
**Stories:** 3  
**Process (LOCKED):** Full waterfall per story — `0 → 1 → 2 → 3`. Run **one command at a time**. Prefer sequential stories (no skipping CR/PM for parallel speed).

---

## Waterfall rule

```bash
--agent 0 sprint 36 story N
--agent 1 sprint 36 story N
--agent 2 sprint 36 story N
--agent 3 sprint 36 story N
```

---

## 📋 Story Execution Order

### Sequential (by the book):
- Story 36.1: Refactor match detail page
- Story 36.2: Refactor conversation detail page
- Story 36.3: Code cleanup and documentation

---

## Story 36.1: Refactor Match Detail Page

**Phase:** 1 (Refactoring)  
**Priority:** 🟢 LOW (technical debt)  
**Estimated Time:** 8-10 hours

### Commands (waterfall):

```bash
--agent 0 sprint 36 story 1
--agent 1 sprint 36 story 1
--agent 2 sprint 36 story 1
--agent 3 sprint 36 story 1
```

### Agent Prompt (Agent 0 lock / Agent 1 implement):

```
You are refactoring a large component into smaller, maintainable pieces.

PROBLEM:
Match detail page is 575 lines in one file.
Too many responsibilities: photo, content, actions, feedback, modals, hard blocks.
Hard to maintain and test.

OBJECTIVE:
Split into 6+ smaller components (each < 150 lines).
Extract logic into custom hooks.
Enable code splitting for modals.

CURRENT STRUCTURE:
```
/dating/me-matches/[id]/page.tsx (575 lines)
  - Everything in one file
  - useState for all state
  - useEffect for data fetching
  - Inline modal components
```

NEW STRUCTURE:
```
/dating/me-matches/[id]/page.tsx (100 lines, orchestrator)
  ├─ <MatchDetailHeader />       (photo, name, age, location)
  ├─ <MatchDetailContent />      (bio, narrative, shared interests)
  ├─ <MatchDetailActions />      (like, pass, block buttons + state)
  ├─ <MatchFeedbackWidget />     (thumbs up/down)
  ├─ <HardBlockBanner />         (conditional)
  └─ <MatchDetailModals />       (report, celebration - lazy loaded)

hooks:
  ├─ useMatchActions()           (like, pass, undo, state)
  ├─ useMatchFeedback()          (thumbs, submit, state)
  └─ useCelebrationFlow()        (trigger, dismiss, state)
```

IMPLEMENTATION:

1. **CREATE ORCHESTRATOR PAGE:**
   FILE: dating-ui/src/app/dating/me-matches/[id]/page.tsx
   
   ```tsx
   export default function MeMatchDetailPage() {
     const { id } = useParams();
     const [data, setData] = useState<MeMatchDetailDto | null>(null);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState<string | null>(null);
     
     // Fetch match data
     useEffect(() => {
       fetchMyMatchById(id).then(setData).catch(setError).finally(() => setLoading(false));
     }, [id]);
     
     // Hooks
     const matchActions = useMatchActions({ matchId: id, ... });
     const matchFeedback = useMatchFeedback({ matchId: id });
     const celebration = useCelebrationFlow();
     
     if (loading) return <LoadingState />;
     if (error) return <ErrorState error={error} />;
     if (!data) return null;
     
     return (
       <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
         <div className="mx-auto max-w-2xl space-y-8 px-6 py-10">
           <nav>
             <Link href="/dating/me-matches">Back to Matches</Link>
           </nav>
           
           <article className="overflow-hidden rounded-xl border">
             <MatchDetailHeader data={data} />
             
             {data.hardBlocked && <HardBlockBanner hardBlocked={data.hardBlocked} />}
             
             <MatchDetailContent data={data} />
             
             <MatchFeedbackWidget {...matchFeedback} />
             
             <MatchDetailActions
               data={data}
               matchActions={matchActions}
               celebration={celebration}
             />
           </article>
           
           <MatchDetailModals
             data={data}
             matchId={id}
             celebration={celebration}
           />
         </div>
       </div>
     );
   }
   ```

2. **CREATE HEADER COMPONENT:**
   FILE: dating-ui/src/components/match-detail/match-detail-header.tsx (~50 lines)
   
   ```tsx
   interface Props {
     data: MeMatchDetailDto;
   }
   
   export function MatchDetailHeader({ data }: Props) {
     return (
       <header className="border-b bg-zinc-50/80 px-6 py-5">
         <MatchPhoto variant="hero" photoUrl={data.primaryPhotoUrl} ... />
         <p className="text-xs uppercase">Match</p>
         <h1 className="text-xl font-semibold">{matchDetailTitle(data)}</h1>
         {matchDetailSubtitle(data) && <p className="text-sm">{matchDetailSubtitle(data)}</p>}
       </header>
     );
   }
   ```

3. **CREATE CONTENT COMPONENT:**
   FILE: dating-ui/src/components/match-detail/match-detail-content.tsx (~80 lines)
   
   ```tsx
   export function MatchDetailContent({ data }: Props) {
     const prose = resolveDetailProse(data);
     const sharedNote = formatSharedInterestNote(data.explainability?.sharedInterestNote);
     
     return (
       <div className="space-y-5 px-6 py-5 text-sm">
         {prose?.kind === 'narrative' && <NarrativeProse text={prose.text} />}
         {prose?.kind === 'short' && <ShortProse text={prose.text} />}
         {sharedNote && <SharedInterestsNote note={sharedNote} />}
         {data.recommendation?.caution && <CautionNote text={data.recommendation.caution} />}
         {data.analyzedAt && <AnalyzedTimestamp date={data.analyzedAt} />}
       </div>
     );
   }
   ```

4. **CREATE ACTIONS COMPONENT:**
   FILE: dating-ui/src/components/match-detail/match-detail-actions.tsx (~120 lines)
   
   ```tsx
   interface Props {
     data: MeMatchDetailDto;
     matchActions: ReturnType<typeof useMatchActions>;
     celebration: ReturnType<typeof useCelebrationFlow>;
   }
   
   export function MatchDetailActions({ data, matchActions, celebration }: Props) {
     const { like, pass, undo, actionLoading, currentAction, canUndo } = matchActions;
     const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
     const [reportOpen, setReportOpen] = useState(false);
     
     return (
       <footer className="flex flex-col gap-3 border-t px-6 py-4">
         {/* Mutual match section */}
         {/* Status message section */}
         {/* Action buttons (like, pass) */}
         {/* Block/Report section */}
       </footer>
     );
   }
   ```

5. **CREATE FEEDBACK WIDGET:**
   FILE: dating-ui/src/components/match-detail/match-feedback-widget.tsx (~60 lines)
   
   ```tsx
   interface Props {
     submitFeedback: (sentiment: 'positive' | 'negative') => Promise<void>;
     submitting: boolean;
     sentiment: 'POSITIVE' | 'NEGATIVE' | null;
     submitted: boolean;
     error: string | null;
   }
   
   export function MatchFeedbackWidget({ submitFeedback, ... }: Props) {
     return (
       <section className="rounded-lg border px-4 py-3">
         <p>How's this match quality?</p>
         <div className="mt-3 flex gap-2">
           <button onClick={() => submitFeedback('positive')}>👍</button>
           <button onClick={() => submitFeedback('negative')}>👎</button>
         </div>
         {submitted && <p>Thanks!</p>}
       </section>
     );
   }
   ```

6. **CREATE HARD BLOCK BANNER:**
   FILE: dating-ui/src/components/match-detail/hard-block-banner.tsx (~70 lines)
   
   ```tsx
   export function HardBlockBanner({ hardBlocked }: Props) {
     return (
       <div className="border-b bg-amber-50 px-6 py-4">
         <p className="font-semibold">Why you won't match</p>
         <ul>
           {hardBlocked.reasons.map(r => (
             <li key={...}>{formatHardBlockReason(r)}</li>
           ))}
         </ul>
         <Link href="/settings/preferences">Review Preferences</Link>
       </div>
     );
   }
   ```

7. **CREATE MODALS COMPONENT (LAZY LOADED):**
   FILE: dating-ui/src/components/match-detail/match-detail-modals.tsx (~50 lines)
   
   ```tsx
   const MatchCelebrationModal = dynamic(() => import('@/components/match-celebration-modal'));
   const ReportUserDialog = dynamic(() => import('@/components/report-user-dialog'));
   
   export function MatchDetailModals({ data, matchId, celebration, reportOpen, ... }: Props) {
     return (
       <>
         {celebration.celebrationData && (
           <MatchCelebrationModal
             open
             onClose={celebration.dismissCelebration}
             candidateName={matchDetailTitle(data)}
             photoUrl={data.primaryPhotoUrl}
           />
         )}
         
         {reportOpen && (
           <ReportUserDialog
             open={reportOpen}
             onClose={...}
             contextType="MATCH_PROFILE"
             contextId={matchId}
           />
         )}
       </>
     );
   }
   ```

8. **EXTRACT HOOKS (Already exist, verify they work):**
   - hooks/use-match-actions.ts
   - hooks/use-match-feedback.ts
   - hooks/use-celebration-flow.ts

ACCEPTANCE CRITERIA:
- [ ] All functionality preserved (no regressions)
- [ ] Each component < 150 lines
- [ ] Orchestrator page < 100 lines
- [ ] Components are independently testable
- [ ] Modals lazy loaded (code splitting)
- [ ] Props well-typed (TypeScript)
- [ ] No visual regressions
- [ ] Tests pass (update as needed)
- [ ] No duplicate code

TESTING:
- [ ] Like action works
- [ ] Pass action works
- [ ] Undo works
- [ ] Block confirmation works
- [ ] Report dialog works
- [ ] Feedback widget works
- [ ] Celebration modal works (on mutual match)
- [ ] Hard block banner shows correctly

OUTPUT:
Refactor complete, run tests, verify no regressions.
```

---

## Story 36.2: Refactor Conversation Detail Page

**Phase:** 1 (Refactoring)  
**Priority:** 🟢 LOW (technical debt)  
**Estimated Time:** 8-10 hours

### Commands (waterfall):

```bash
--agent 0 sprint 36 story 2
--agent 1 sprint 36 story 2
--agent 2 sprint 36 story 2
--agent 3 sprint 36 story 2
```

### Agent Prompt (Agent 0 lock / Agent 1 implement):

```
You are refactoring the conversation detail component.

PROBLEM:
Conversation page is 460 lines with WebSocket, message list, composer, and actions.
Hard to test WebSocket logic.
Composer could be reused elsewhere.

OBJECTIVE:
Split into smaller components and extract hooks.

CURRENT STRUCTURE:
```
/dating/conversations/[id]/page.tsx (460 lines)
  - WebSocket connection
  - Message list with pagination
  - Message composer
  - Unmatch/Report actions
  - All state management
```

NEW STRUCTURE:
```
/dating/conversations/[id]/page.tsx (100 lines, orchestrator)
  ├─ <ConversationHeader />      (match card, back button)
  ├─ <MessageList />             (messages, load earlier, scroll)
  ├─ <MessageComposer />         (textarea, send, char count)
  └─ <ConversationActions />     (unmatch, report)

hooks:
  ├─ useConversationMessages()   (WebSocket, pagination, send)
  ├─ useConversationActions()    (unmatch, report)
  └─ useMessageComposer()        (draft, validation, send)
```

IMPLEMENTATION:

1. **CREATE ORCHESTRATOR PAGE:**
   FILE: dating-ui/src/app/dating/conversations/[id]/page.tsx
   
   ```tsx
   export default function ConversationDetailPage() {
     const { id } = useParams();
     const [data, setData] = useState<ConversationDetailDto | null>(null);
     const [loading, setLoading] = useState(true);
     
     // Fetch conversation metadata
     useEffect(() => {
       fetchMyConversationById(id).then(setData).finally(() => setLoading(false));
     }, [id]);
     
     // Hooks
     const messages = useConversationMessages({ conversationId: id });
     const actions = useConversationActions(id);
     const composer = useMessageComposer({ conversationId: id, onSent: messages.addOptimisticMessage });
     
     if (loading) return <LoadingState />;
     if (!data) return null;
     
     return (
       <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
         <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10">
           <ConversationHeader data={data} />
           
           <section className="flex min-h-64 flex-col rounded-xl border">
             <MessageList messages={messages} />
             <MessageComposer composer={composer} />
           </section>
           
           <ConversationActions actions={actions} otherUserName={data.otherUser.nickname} />
         </div>
       </div>
     );
   }
   ```

2. **CREATE HEADER COMPONENT:**
   FILE: dating-ui/src/components/conversation/conversation-header.tsx (~40 lines)
   
   ```tsx
   export function ConversationHeader({ data }: Props) {
     return (
       <>
         <nav>
           <Link href="/dating/conversations">Back to Conversations</Link>
         </nav>
         
         <section className="rounded-xl border bg-white p-6">
           <div className="flex items-center gap-4">
             {/* Avatar */}
             {/* Name, age, location */}
             {/* Matched date */}
           </div>
         </section>
       </>
     );
   }
   ```

3. **CREATE MESSAGE LIST COMPONENT:**
   FILE: dating-ui/src/components/conversation/message-list.tsx (~100 lines)
   
   ```tsx
   interface Props {
     messages: ReturnType<typeof useConversationMessages>;
   }
   
   export function MessageList({ messages }: Props) {
     const { user } = useAuth();
     const {
       messages: messageList,
       loading,
       error,
       hasMore,
       loadEarlier,
       loadingEarlier,
       socketReconnecting,
       listRef,
     } = messages;
     
     return (
       <>
         {socketReconnecting && <ReconnectingBanner />}
         
         <div ref={listRef} className="flex-1 overflow-y-auto p-4">
           {loading && <LoadingMessages />}
           {error && <ErrorMessage error={error} />}
           
           {!loading && hasMore && (
             <button onClick={loadEarlier} disabled={loadingEarlier}>
               Load Earlier
             </button>
           )}
           
           {messageList.map((msg) => (
             <MessageBubble
               key={msg.id}
               message={msg}
               isMine={msg.senderId === user?.id}
             />
           ))}
           
           {!loading && messageList.length === 0 && <EmptyMessages />}
         </div>
       </>
     );
   }
   ```

4. **CREATE MESSAGE COMPOSER:**
   FILE: dating-ui/src/components/conversation/message-composer.tsx (~80 lines)
   
   ```tsx
   interface Props {
     composer: ReturnType<typeof useMessageComposer>;
   }
   
   export function MessageComposer({ composer }: Props) {
     const {
       draft,
       setDraft,
       canSend,
       sending,
       sendError,
       handleSend,
       handleKeyDown,
       charCount,
       overLimit,
     } = composer;
     
     return (
       <div className="border-t p-4">
         {sendError && <ErrorBanner error={sendError} />}
         
         <textarea
           value={draft}
           onChange={(e) => setDraft(e.target.value)}
           onKeyDown={handleKeyDown}
           disabled={sending}
           placeholder="Type a message..."
           rows={3}
         />
         
         <div className="mt-2 flex justify-between">
           <CharCounter count={charCount} max={MAX_LENGTH} overLimit={overLimit} />
           <button onClick={handleSend} disabled={!canSend}>
             {sending ? 'Sending...' : 'Send'}
           </button>
         </div>
       </div>
     );
   }
   ```

5. **CREATE ACTIONS COMPONENT:**
   FILE: dating-ui/src/components/conversation/conversation-actions.tsx (~60 lines)
   
   ```tsx
   export function ConversationActions({ actions, otherUserName }: Props) {
     const { unmatch, unmatching, unmatchError, clearUnmatchError } = actions;
     const [unmatchConfirmOpen, setUnmatchConfirmOpen] = useState(false);
     const [reportOpen, setReportOpen] = useState(false);
     
     return (
       <div className="flex flex-col gap-2">
         <details>
           <summary>⋯</summary>
           <div>
             <button onClick={() => setReportOpen(true)}>Report</button>
           </div>
         </details>
         
         {unmatchConfirmOpen ? (
           <UnmatchConfirmDialog
             onConfirm={unmatch}
             onCancel={() => setUnmatchConfirmOpen(false)}
             otherUserName={otherUserName}
             loading={unmatching}
           />
         ) : (
           <button onClick={() => setUnmatchConfirmOpen(true)}>Unmatch</button>
         )}
         
         {unmatchError && <ErrorMessage error={unmatchError} />}
       </div>
     );
   }
   ```

6. **EXTRACT MESSAGE COMPOSER HOOK:**
   FILE: dating-ui/src/hooks/use-message-composer.ts
   
   ```tsx
   export function useMessageComposer({ conversationId, onSent }: Props) {
     const [draft, setDraft] = useState('');
     const [sending, setSending] = useState(false);
     const [sendError, setSendError] = useState<string | null>(null);
     
     const draftTrimmed = draft.trim();
     const charCount = draft.length;
     const overLimit = charCount > MAX_MESSAGE_TEXT_LENGTH;
     const canSend = draftTrimmed.length > 0 && !overLimit && !sending;
     
     async function handleSend() {
       if (!canSend) return;
       setSending(true);
       setSendError(null);
       
       try {
         await sendMessage(conversationId, draft);
         setDraft(''); // Clear on success
         onSent?.();
       } catch (err) {
         setSendError(err instanceof Error ? err.message : 'Failed to send');
       } finally {
         setSending(false);
       }
     }
     
     function handleKeyDown(e: React.KeyboardEvent) {
       if (e.key === 'Enter' && !e.shiftKey) {
         e.preventDefault();
         void handleSend();
       }
     }
     
     return {
       draft,
       setDraft,
       canSend,
       sending,
       sendError,
       handleSend,
       handleKeyDown,
       charCount,
       overLimit,
     };
   }
   ```

7. **VERIFY EXISTING HOOKS:**
   - hooks/use-conversation-messages.ts (already exists)
   - hooks/use-conversation-actions.ts (already exists)

ACCEPTANCE CRITERIA:
- [ ] All functionality preserved
- [ ] Each component < 150 lines
- [ ] Orchestrator < 100 lines
- [ ] WebSocket logic testable (isolated in hook)
- [ ] Message composer reusable
- [ ] No visual regressions
- [ ] Real-time messaging still works
- [ ] Tests pass

TESTING:
- [ ] Send message works
- [ ] Receive message works (WebSocket)
- [ ] Load earlier works
- [ ] Unmatch works
- [ ] Report works
- [ ] Character limit enforced
- [ ] Enter key sends message

OUTPUT:
Refactor complete, test thoroughly.
```

---

## Story 36.3: Code Cleanup and Documentation

**Phase:** 1 (Cleanup)  
**Priority:** 🟢 LOW  
**Can Run Parallel:** Yes  
**Estimated Time:** 4-6 hours

### Commands (waterfall):

```bash
--agent 0 sprint 36 story 3
--agent 1 sprint 36 story 3
--agent 2 sprint 36 story 3
--agent 3 sprint 36 story 3
```

### Agent Prompt (Agent 0 lock / Agent 1 implement):

```
You are doing code cleanup and documentation.

OBJECTIVE:
Remove dead code, update docs, add JSDoc, run linter.

TASKS:

1. **REMOVE COMMENTED-OUT CODE:**
   ```bash
   # Find commented code
   grep -r '// ' dating-ui/src/ | grep -v 'TODO' | grep -v 'FIXME'
   
   # Remove commented-out code blocks
   # (Keep only meaningful comments that explain WHY, not WHAT)
   ```

2. **REMOVE UNUSED IMPORTS:**
   ```bash
   # Run ESLint with auto-fix
   cd dating-ui
   npm run lint -- --fix
   
   # Or use editor's "organize imports" feature
   ```

3. **ADD JSDOC TO COMPONENTS:**
   Add JSDoc to all new components created in Sprints 33-36:
   
   ```tsx
   /**
    * Displays the profile quality meter with score, progress bar, and suggestions.
    * 
    * Fetches quality data from API and shows:
    * - Overall score (0-100%)
    * - What's complete
    * - What needs improvement
    * 
    * @example
    * <ProfileQualityMeter />
    */
   export function ProfileQualityMeter() {
     // ...
   }
   ```
   
   Components to document:
   - All nav components (Sprint 33)
   - All conversation components (Sprint 34)
   - All profile components (Sprint 35)
   - All refactored components (Sprint 36)

4. **UPDATE README:**
   FILE: dating-ui/README.md
   
   Update route table with new structure:
   ```markdown
   ## Routes
   
   ### Public
   - `/` - Landing page
   - `/privacy` - Privacy policy
   - `/terms` - Terms of service
   
   ### Onboarding
   - `/onboarding/basic` - Step 1: Basic info
   - `/onboarding/texts` - Step 2: Story
   
   ### Dating App
   - `/dating/me-matches` - Match list
   - `/dating/me-matches/[id]` - Match detail
   - `/dating/conversations` - Conversation list
   - `/dating/conversations/[id]` - Conversation detail
   - `/profile` - Unified profile (view/edit/analysis/settings)
   
   ### Admin
   - `/admin` - Admin dashboard
   - `/admin/photos` - Photo moderation
   - `/admin/reports` - Reports queue
   - `/admin/content-violations` - Content violations
   - `/admin/match-quality` - Match quality insights
   ```

5. **UPDATE ARCHITECTURE DOCS (if exists):**
   FILE: dating-ui/docs/ARCHITECTURE.md
   
   Document new structure:
   - Global navigation pattern
   - Unified profile architecture
   - Component refactoring approach
   - Hook patterns

6. **RUN LINTER:**
   ```bash
   cd dating-ui
   npm run lint
   
   # Fix all auto-fixable issues
   npm run lint -- --fix
   
   # Manually fix remaining issues
   ```

7. **FIX LINTER WARNINGS:**
   Common issues:
   - Unused variables
   - Missing dependencies in useEffect
   - Missing ARIA labels
   - Missing alt text on images
   - Console.log statements (remove or use proper logger)

8. **WRITE STORYBOOK STORIES (if Storybook is set up):**
   Create stories for key components:
   - AppNav (desktop + mobile)
   - ProfileQualityMeter
   - ContentModerationError
   - MessagePreview
   - WritingPrompts
   
   Example:
   ```tsx
   // profile-quality-meter.stories.tsx
   export default {
     title: 'Profile/ProfileQualityMeter',
     component: ProfileQualityMeter,
   };
   
   export const Empty = () => (
     <ProfileQualityMeter quality={{ score: 30, ... }} />
   );
   
   export const Complete = () => (
     <ProfileQualityMeter quality={{ score: 100, ... }} />
   );
   ```

9. **CHECK FOR TODO/FIXME:**
   ```bash
   # Find all TODOs
   grep -r 'TODO' dating-ui/src/
   grep -r 'FIXME' dating-ui/src/
   
   # Create issues for unresolved TODOs
   # Remove completed TODOs
   ```

10. **UPDATE PACKAGE.JSON SCRIPTS:**
    Ensure useful scripts exist:
    ```json
    {
      "scripts": {
        "dev": "next dev",
        "build": "next build",
        "start": "next start",
        "lint": "eslint . --ext .ts,.tsx",
        "lint:fix": "eslint . --ext .ts,.tsx --fix",
        "test": "jest",
        "test:watch": "jest --watch",
        "type-check": "tsc --noEmit",
        "format": "prettier --write \"src/**/*.{ts,tsx}\"",
        "storybook": "storybook dev -p 6006"
      }
    }
    ```

ACCEPTANCE CRITERIA:
- [ ] No commented-out code (except meaningful explanations)
- [ ] All public components have JSDoc
- [ ] README route table updated
- [ ] Linter passes with 0 warnings
- [ ] No unused imports
- [ ] No console.log statements (use proper logger)
- [ ] Storybook stories for 5+ key components (if Storybook exists)
- [ ] All TODOs resolved or documented as issues

FILES TO UPDATE:
- dating-ui/README.md
- dating-ui/docs/ARCHITECTURE.md (if exists)
- All component files (add JSDoc)
- package.json (verify scripts)

DOCUMENTATION CHECKLIST:
```
□ README updated with new routes
□ Architecture docs updated (if exists)
□ JSDoc added to all new components (30+)
□ Storybook stories created (5+)
□ TODOs reviewed and resolved
□ Linter warnings fixed (0 remaining)
□ Type errors fixed (tsc passes)
□ Dead code removed
□ Imports organized
```

OUTPUT:
Clean codebase, comprehensive docs, 0 linter warnings.
```

---

## 🚀 Sprint 36 Execution Plan

**Process:** Full waterfall. One command at a time. Prefer story order 1 → 2 → 3.

```bash
--agent 0 sprint 36 story 1
# … 1, 2, 3; then story 2; then story 3
```

See `QUICK_START_COMMANDS.md` for the full expanded list.

**Start:**

```bash
--agent 0 sprint 36 story 1
```

---

## 📊 Sprint 36 Summary

**Total Stories:** 3  
**Refactoring Stories:** 2 (36.1, 36.2)  
**Cleanup Stories:** 1 (36.3)

**Mockups Needed:**
- ❌ None (refactoring only)

**By End of Sprint:**
- ✅ Components < 200 lines each
- ✅ Hooks extracted and testable
- ✅ Code splitting for modals
- ✅ 0 linter warnings
- ✅ Comprehensive documentation
- ✅ Clean, maintainable codebase

**End of 4-Sprint Plan!** 🏁

After Sprint 36, you'll have:
- ✅ Global navigation
- ✅ Critical UX bugs fixed
- ✅ Improved messaging UX
- ✅ Unified profile page
- ✅ Clean, maintainable code
- ✅ Comprehensive documentation

Ready for production! 🚀
