# Sprint 34: Content & Messaging UX - Agent Commands

**Sprint Goal:** Improve messaging inbox and content moderation transparency  
**Duration:** 1 week  
**Stories:** 5  
**Process (LOCKED):** Full waterfall per phase — `0 architect → 1 implement → 2 CR → 3 PM ACCEPT+commit`. Run **one command at a time**.

---

## Waterfall rule

For every phase below (`backend`, `frontend`, `content`, `implementation`, or whole story), run:

```bash
--agent 0 sprint 34 story N <phase?>
--agent 1 sprint 34 story N <phase?>
--agent 2 sprint 34 story N <phase?>
--agent 3 sprint 34 story N <phase?>
```

Do **not** stop after a single role line.

---

## 📋 Story Execution Order

### Critical Path: Message Previews
- Story 34.1: Add message previews (backend + frontend)

### Parallel Work:
- Story 34.2: Improve moderation errors (backend + frontend)
- Story 34.3: Add timestamps to messages (frontend only)
- Story 34.4: Add writing prompts (content + frontend)
- Story 34.5: Add conversation filters (depends on 34.1)

---

## Story 34.1: Add Message Previews to Conversation List

**Phase:** 0 + 1 (Backend API + Frontend)  
**Priority:** 🔴 CRITICAL  
**Estimated Time:** 6-8 hours

### Commands (Backend — waterfall):

```bash
--agent 0 sprint 34 story 1 backend
--agent 1 sprint 34 story 1 backend
--agent 2 sprint 34 story 1 backend
--agent 3 sprint 34 story 1 backend
```

### Agent Prompt (Backend — Agent 0 lock / Agent 1 implement):

```
You are a backend developer adding message preview support to the conversations API.

PROBLEM:
Conversation list shows only user names/photos, no message previews.
Users can't see what conversations are about without opening each one.

OBJECTIVE:
Add lastMessage and unreadCount to conversation list API response.

API TO MODIFY:
Endpoint: GET /api/v1/me/conversations
Service: dating-api/src/me-profile/me-conversations.service.ts
Controller: dating-api/src/me-profile/me-conversation-messages.controller.ts
DTOs: dating-api/src/me-profile/dto/

CURRENT RESPONSE:
```json
{
  "conversations": [
    {
      "id": "abc123",
      "otherUser": {
        "id": "xyz789",
        "nickname": "Sarah",
        "photoUrl": "...",
        "age": 28,
        "locationName": "New York"
      },
      "matchedAt": "2026-07-15T10:00:00Z"
    }
  ],
  "total": 5
}
```

NEW RESPONSE (add these fields):
```json
{
  "conversations": [
    {
      "id": "abc123",
      "otherUser": { ... },
      "matchedAt": "2026-07-15T10:00:00Z",
      "lastMessage": {               // NEW
        "text": "Hey, how are you?",
        "senderId": "xyz789",
        "sentAt": "2026-08-01T12:30:00Z"
      },
      "unreadCount": 2               // NEW
    }
  ],
  "total": 5
}
```

IMPLEMENTATION:

1. UPDATE DTO:
   FILE: dating-api/src/me-profile/dto/list-my-conversations.dto.ts
   
   ```typescript
   class ConversationLastMessageDto {
     @ApiProperty()
     text: string;
     
     @ApiProperty()
     senderId: string;
     
     @ApiProperty()
     sentAt: string; // ISO date
   }
   
   class ConversationListItemDto {
     // ... existing fields ...
     
     @ApiProperty({ type: ConversationLastMessageDto, nullable: true })
     lastMessage: ConversationLastMessageDto | null;
     
     @ApiProperty({ description: 'Number of unread messages in this conversation' })
     unreadCount: number;
   }
   ```

2. UPDATE SERVICE:
   FILE: dating-api/src/me-profile/me-conversations.service.ts
   
   Query to fetch last message:
   ```typescript
   const conversations = await this.prisma.conversation.findMany({
     where: { ... },
     include: {
       messages: {
         orderBy: { createdAt: 'desc' },
         take: 1, // Get only the last message
         select: {
           id: true,
           text: true,
           senderId: true,
           createdAt: true,
         },
       },
     },
   });
   
   // Map to DTO
   conversations.map(conv => ({
     ...conv,
     lastMessage: conv.messages[0] ? {
       text: conv.messages[0].text,
       senderId: conv.messages[0].senderId,
       sentAt: conv.messages[0].createdAt.toISOString(),
     } : null,
     unreadCount: await this.getUnreadCount(conv.id, currentUserId),
   }));
   ```

3. UNREAD COUNT:
   Implement getUnreadCount():
   ```typescript
   async getUnreadCount(conversationId: string, userId: string): Promise<number> {
     return this.prisma.message.count({
       where: {
         conversationId,
         senderId: { not: userId }, // Not sent by me
         readAt: null, // Not read yet
       },
     });
   }
   ```

4. ADD INDEXES (Performance):
   ```prisma
   // In schema.prisma
   model Message {
     // ... fields ...
     
     @@index([conversationId, createdAt(sort: Desc)]) // For last message query
     @@index([conversationId, senderId, readAt]) // For unread count
   }
   ```

ACCEPTANCE CRITERIA:
- [ ] API returns lastMessage for each conversation
- [ ] lastMessage is null for conversations with no messages
- [ ] unreadCount is accurate (excludes messages sent by current user)
- [ ] Performance is good (< 200ms for 50 conversations)
- [ ] Indexes added for optimal queries
- [ ] DTO types are correct
- [ ] Swagger docs updated
- [ ] Tests added (unit + integration)

TESTING:
```bash
# Create test conversations with messages
# Query GET /api/v1/me/conversations
# Verify lastMessage and unreadCount are correct
```

OUTPUT:
Implement API changes, add tests, and document response format.
```

### Commands (Frontend — waterfall; after backend ACCEPT):

```bash
--agent 0 sprint 34 story 1 frontend
--agent 1 sprint 34 story 1 frontend
--agent 2 sprint 34 story 1 frontend
--agent 3 sprint 34 story 1 frontend
```

### Agent Prompt (Frontend — Agent 0 lock / Agent 1 implement):

```
You are a frontend developer implementing message previews in the conversation list.

PREREQUISITES:
- Backend API (Story 34.1 backend) must be complete
- API now returns lastMessage and unreadCount

OBJECTIVE:
Display message preview, timestamp, and unread indicator in conversation list UI.

DESIGN:
```
┌─────────────────────────────────────────┐
│ 👤 Sarah                          2h ago│
│    Hey, how are you?                  ●│ ← Unread dot
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 👤 Emma                       Yesterday │
│    You: Thanks for sharing!             │ ← "You:" prefix
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 👤 Alex                           Oct 15│
│    Looking forward to meeting...        │ ← Truncated
└─────────────────────────────────────────┘
```

FILES TO MODIFY:
- dating-ui/src/app/dating/conversations/conversations-page-client.tsx
- dating-ui/src/lib/conversations-api.ts (update types)
- dating-ui/src/app/dating/conversations/conversation-display.ts (add preview formatter)

IMPLEMENTATION:

1. UPDATE API TYPES:
   FILE: dating-ui/src/lib/conversations-api.ts
   
   ```typescript
   interface ConversationLastMessage {
     text: string;
     senderId: string;
     sentAt: string;
   }
   
   interface ConversationListItem {
     // ... existing fields ...
     lastMessage: ConversationLastMessage | null;
     unreadCount: number;
   }
   ```

2. CREATE PREVIEW COMPONENT:
   FILE: dating-ui/src/components/conversation-message-preview.tsx
   
   ```tsx
   interface Props {
     lastMessage: ConversationLastMessage | null;
     currentUserId: string;
     otherUserName: string;
   }
   
   export function ConversationMessagePreview({ lastMessage, currentUserId, otherUserName }: Props) {
     if (!lastMessage) {
       return <p className="text-sm text-zinc-400">No messages yet</p>;
     }
     
     const isMyMessage = lastMessage.senderId === currentUserId;
     const preview = truncateMessage(lastMessage.text, 60);
     
     return (
       <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
         {isMyMessage && <span className="text-zinc-500">You: </span>}
         {preview}
       </p>
     );
   }
   
   function truncateMessage(text: string, maxLength: number): string {
     if (text.length <= maxLength) return text;
     return text.slice(0, maxLength) + '...';
   }
   ```

3. UPDATE CONVERSATION CARD:
   FILE: dating-ui/src/app/dating/conversations/conversations-page-client.tsx
   
   Add to each conversation card:
   - Message preview component
   - Relative timestamp
   - Unread badge/indicator
   
   ```tsx
   <div className="conversation-card">
     <div className="flex items-center justify-between">
       <h3>{otherUser.nickname}</h3>
       <span className="text-xs text-zinc-400">
         {formatRelativeTime(lastMessage?.sentAt)}
       </span>
     </div>
     
     <div className="flex items-center justify-between mt-1">
       <ConversationMessagePreview 
         lastMessage={lastMessage}
         currentUserId={user.id}
         otherUserName={otherUser.nickname}
       />
       {unreadCount > 0 && (
         <span className="unread-badge">{unreadCount}</span>
       )}
     </div>
   </div>
   ```

4. ADD TIME FORMATTER:
   FILE: dating-ui/src/lib/time-format.ts
   
   ```typescript
   export function formatRelativeTime(isoDate: string | undefined): string {
     if (!isoDate) return '';
     
     const date = new Date(isoDate);
     const now = new Date();
     const diffMs = now.getTime() - date.getTime();
     const diffMinutes = Math.floor(diffMs / 60000);
     const diffHours = Math.floor(diffMinutes / 60);
     const diffDays = Math.floor(diffHours / 24);
     
     if (diffMinutes < 60) return `${diffMinutes}m ago`;
     if (diffHours < 24) return `${diffHours}h ago`;
     if (diffDays < 7) return diffDays === 1 ? 'Yesterday' : `${diffDays}d ago`;
     
     return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
   }
   ```

5. UNREAD BADGE STYLING:
   - Bold text for unread conversations
   - Badge with count (if > 0)
   - Blue dot indicator

ACCEPTANCE CRITERIA:
- [ ] Message preview shows last 60 chars + "..."
- [ ] "You:" prefix if current user sent message
- [ ] Relative timestamp (2h ago, Yesterday, Oct 15)
- [ ] Unread badge shows if unreadCount > 0
- [ ] Badge displays count (or just dot if design prefers)
- [ ] Empty conversations show "No messages yet"
- [ ] Truncation works for long messages and emojis
- [ ] Real-time updates when new message arrives (WebSocket)
- [ ] Mobile responsive
- [ ] Dark mode works

EDGE CASES:
- Handle emoji-only messages
- Handle very long single-word messages
- Handle messages with line breaks (show first line only)
- Handle deleted messages (show placeholder)

TESTING:
- Test with various message lengths
- Test with emoji messages
- Test with no messages
- Test unread counts
- Test real-time updates (send message in another tab)

OUTPUT:
Implement preview UI, test thoroughly, ensure accessibility.
```

---

## Story 34.2: Improve Content Moderation Error Messages

**Phase:** 0 + 1 (Backend + Frontend)  
**Priority:** 🔴 CRITICAL  
**Estimated Time:** 8-10 hours

### Commands (Backend — waterfall):

```bash
--agent 0 sprint 34 story 2 backend
--agent 1 sprint 34 story 2 backend
--agent 2 sprint 34 story 2 backend
--agent 3 sprint 34 story 2 backend
```

### Agent Prompt (Backend — Agent 0 lock / Agent 1 implement):

```
You are improving content moderation error transparency.

PROBLEM:
When content is rejected, users only see:
"Your profile contains inappropriate content"

They don't know:
- Which field was flagged
- Which phrase was problematic
- Why it was flagged
- How to fix it

OBJECTIVE:
Return detailed moderation errors with flagged text, reason, and suggestions.

FILES TO MODIFY:
- dating-api/src/content-moderation/content-moderation.types.ts
- dating-api/src/content-moderation/dating-policy.ts
- dating-api/src/content-moderation/openai-moderation.client.ts
- dating-api/src/me-profile/me-profile.service.ts
- dating-api/src/me-profile/me-conversation-messages.service.ts

IMPLEMENTATION:

1. UPDATE MODERATION RESULT TYPE:
   FILE: dating-api/src/content-moderation/content-moderation.types.ts
   
   ```typescript
   interface ModerationResult {
     clean: boolean;
     category?: string; // existing
     flaggedText?: string;         // NEW - what was flagged
     flaggedTextIndex?: number;    // NEW - position in original text
     flaggedTextLength?: number;   // NEW - length of flagged segment
     reason?: string;              // NEW - human-readable reason
     suggestion?: string;          // NEW - how to fix
     exampleAlternative?: string;  // NEW - example of acceptable text
   }
   ```

2. UPDATE DATING POLICY:
   FILE: dating-api/src/content-moderation/dating-policy.ts
   
   For blocklist matches:
   ```typescript
   export function matchesDatingBlocklist(text: string): ModerationResult {
     for (const pattern of DATING_BLOCKLIST) {
       const match = text.match(pattern);
       if (match) {
         return {
           clean: false,
           category: 'sexual',
           flaggedText: match[0],
           flaggedTextIndex: match.index,
           flaggedTextLength: match[0].length,
           reason: getDatingBlocklistReason(pattern),
           suggestion: 'Please describe personality traits or interests instead of using direct sexual language',
           exampleAlternative: 'Example: "Looking for someone adventurous and open-minded"',
         };
       }
     }
     return { clean: true };
   }
   
   function getDatingBlocklistReason(pattern: RegExp): string {
     // Map patterns to human-readable reasons
     const reasons: Record<string, string> = {
       'freaky': 'This word often implies sexual content',
       'dtf': 'This abbreviation is a direct sexual invitation',
       'netflix.{0,5}chill': 'This phrase is commonly used as a sexual euphemism',
       // ... etc
     };
     return reasons[pattern.source] || 'Contains language that violates our community guidelines';
   }
   ```

3. UPDATE OPENAI CLIENT:
   FILE: dating-api/src/content-moderation/openai-moderation.client.ts
   
   For OpenAI violations:
   ```typescript
   if (openaiResult.flagged) {
     const category = getHighestScoringCategory(openaiResult.category_scores);
     return {
       clean: false,
       category,
       flaggedText: text, // OpenAI doesn't return specific text, return full text
       flaggedTextIndex: 0,
       flaggedTextLength: text.length,
       reason: getOpenAIReason(category),
       suggestion: getOpenAISuggestion(category),
     };
   }
   
   function getOpenAIReason(category: string): string {
     const reasons: Record<string, string> = {
       sexual: 'Contains explicit sexual content',
       violence: 'Contains violent or threatening language',
       hate: 'Contains hateful or discriminatory language',
       harassment: 'Contains harassing or bullying language',
       // ... etc
     };
     return reasons[category] || 'Contains inappropriate content';
   }
   
   function getOpenAISuggestion(category: string): string {
     const suggestions: Record<string, string> = {
       sexual: 'Please rephrase without explicit sexual content. Focus on personality traits and interests',
       violence: 'Please rephrase without threatening or violent language',
       hate: 'Please rephrase without discriminatory language. Treat all people with respect',
       // ... etc
     };
     return suggestions[category] || 'Please rephrase your message';
   }
   ```

4. UPDATE ERROR RESPONSE:
   FILE: dating-api/src/me-profile/me-profile.service.ts
   
   When moderation fails:
   ```typescript
   if (!moderationResult.clean) {
     throw new BadRequestException({
       error: 'content_moderation_failed',
       message: 'Your profile contains inappropriate content',
       details: {
         field: fieldName,
         category: moderationResult.category,
         flaggedText: moderationResult.flaggedText,
         flaggedTextIndex: moderationResult.flaggedTextIndex,
         reason: moderationResult.reason,
         suggestion: moderationResult.suggestion,
         exampleAlternative: moderationResult.exampleAlternative,
       },
     });
   }
   ```

ACCEPTANCE CRITERIA:
- [ ] Moderation errors include flagged text
- [ ] Errors include human-readable reason
- [ ] Errors include actionable suggestion
- [ ] Errors include example alternative (when applicable)
- [ ] Works for both OpenAI and dating policy violations
- [ ] Text index/length accurate for highlighting
- [ ] Different messages for different violation types
- [ ] No sensitive info leaked (e.g., internal error details)

TESTING:
- Test with various blocked phrases
- Test with OpenAI violations
- Test with combined violations
- Verify error response format

OUTPUT:
Implement detailed error responses and test with various violation types.
```

### Commands (Frontend — waterfall; after backend ACCEPT):

```bash
--agent 0 sprint 34 story 2 frontend
--agent 1 sprint 34 story 2 frontend
--agent 2 sprint 34 story 2 frontend
--agent 3 sprint 34 story 2 frontend
```

### Agent Prompt (Frontend — Agent 0 lock / Agent 1 implement):

```
You are implementing improved moderation error UI.

PREREQUISITES:
- Backend returns detailed moderation errors (Story 34.2 backend)

OBJECTIVE:
Show users exactly what was flagged and how to fix it.

DESIGN:
```
OLD (BEFORE):
┌─────────────────────────────────────────┐
│ ⚠️ Your profile contains inappropriate  │
│    content                               │
└─────────────────────────────────────────┘

NEW (AFTER):
┌─────────────────────────────────────────┐
│ ⚠️ We found an issue in your profile    │
│                                         │
│ Field: About my ideal partner          │
│ Flagged phrase: "looking for freaky"   │
│ Category: Sexual content                │
│                                         │
│ Why: Direct sexual language isn't      │
│ allowed in profiles                     │
│                                         │
│ 💡 Suggestion:                          │
│ Describe personality traits instead    │
│ Example: "Looking for someone          │
│ adventurous and open-minded"           │
│                                         │
│ [Edit Profile] [Content Guidelines]    │
└─────────────────────────────────────────┘
```

FILES TO MODIFY:
- dating-ui/src/lib/me-profile-api.ts (update error type)
- dating-ui/src/components/onboarding-texts-form.tsx (show detailed error)
- dating-ui/src/components/content-moderation-error.tsx (NEW - reusable error component)

IMPLEMENTATION:

1. UPDATE ERROR TYPE:
   FILE: dating-ui/src/lib/me-profile-api.ts
   
   ```typescript
   interface ContentModerationError {
     field: string;
     category: string;
     flaggedText?: string;
     flaggedTextIndex?: number;
     reason?: string;
     suggestion?: string;
     exampleAlternative?: string;
   }
   ```

2. CREATE ERROR COMPONENT:
   FILE: dating-ui/src/components/content-moderation-error.tsx
   
   ```tsx
   interface Props {
     error: ContentModerationError;
     onDismiss?: () => void;
   }
   
   export function ContentModerationError({ error, onDismiss }: Props) {
     return (
       <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
         <h4 className="font-semibold text-amber-900 dark:text-amber-100">
           ⚠️ We found an issue in your profile
         </h4>
         
         <dl className="mt-3 space-y-2 text-sm">
           <div>
             <dt className="font-medium text-amber-800 dark:text-amber-200">Field:</dt>
             <dd className="text-amber-900 dark:text-amber-100">{formatFieldName(error.field)}</dd>
           </div>
           
           {error.flaggedText && (
             <div>
               <dt className="font-medium text-amber-800 dark:text-amber-200">Flagged phrase:</dt>
               <dd className="font-mono text-amber-900 dark:text-amber-100">"{error.flaggedText}"</dd>
             </div>
           )}
           
           <div>
             <dt className="font-medium text-amber-800 dark:text-amber-200">Category:</dt>
             <dd className="text-amber-900 dark:text-amber-100">{formatCategory(error.category)}</dd>
           </div>
           
           {error.reason && (
             <div>
               <dt className="font-medium text-amber-800 dark:text-amber-200">Why:</dt>
               <dd className="text-amber-900 dark:text-amber-100">{error.reason}</dd>
             </div>
           )}
         </dl>
         
         {error.suggestion && (
           <div className="mt-4 rounded-md bg-amber-100/50 p-3 dark:bg-amber-950/50">
             <h5 className="text-sm font-medium text-amber-900 dark:text-amber-100">💡 Suggestion:</h5>
             <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">{error.suggestion}</p>
             {error.exampleAlternative && (
               <p className="mt-2 text-sm italic text-amber-700 dark:text-amber-300">
                 {error.exampleAlternative}
               </p>
             )}
           </div>
         )}
         
         <div className="mt-4 flex gap-2">
           {onDismiss && (
             <button onClick={onDismiss} className="btn-secondary">
               Edit Profile
             </button>
           )}
           <a href="/content-guidelines" target="_blank" className="btn-text">
             Content Guidelines
           </a>
         </div>
       </div>
     );
   }
   
   function formatFieldName(field: string): string {
     const names: Record<string, string> = {
       aboutMe: 'About me',
       aboutRelationship: 'About my ideal partner',
       relationshipGoals: 'Relationship goals',
     };
     return names[field] || field;
   }
   
   function formatCategory(category: string): string {
     const categories: Record<string, string> = {
       sexual: 'Sexual content',
       violence: 'Violent content',
       hate: 'Hate speech',
       harassment: 'Harassment',
     };
     return categories[category] || category;
   }
   ```

3. USE IN FORMS:
   FILE: dating-ui/src/components/onboarding-texts-form.tsx
   
   ```tsx
   const [moderationError, setModerationError] = useState<ContentModerationError | null>(null);
   
   // After save fails with moderation error:
   if (error.code === 'content_moderation_failed') {
     setModerationError(error.details);
   }
   
   // In JSX:
   {moderationError && (
     <ContentModerationError 
       error={moderationError}
       onDismiss={() => setModerationError(null)}
     />
   )}
   ```

4. OPTIONAL: HIGHLIGHT IN TEXTAREA
   If flaggedTextIndex is provided, highlight in textarea:
   ```tsx
   // Wrap textarea with highlighting overlay
   <div className="relative">
     <textarea value={text} onChange={...} />
     {moderationError?.flaggedTextIndex !== undefined && (
       <div className="pointer-events-none absolute inset-0">
         {/* Render highlighted region */}
       </div>
     )}
   </div>
   ```

ACCEPTANCE CRITERIA:
- [ ] Error shows which field was flagged
- [ ] Error shows flagged phrase (if available)
- [ ] Error shows category in plain English
- [ ] Error shows human-readable reason
- [ ] Error shows actionable suggestion
- [ ] Error shows example alternative
- [ ] Link to content guidelines
- [ ] Works for profile fields and messages
- [ ] Mobile responsive
- [ ] Dark mode works
- [ ] Accessible (screen reader friendly)

TESTING:
- Test with various error types
- Test with/without flaggedText
- Test with/without suggestions
- Test mobile layout
- Test dark mode

OUTPUT:
Implement error component and integrate into all forms.
```

---

## Story 34.3: Add Timestamps to Conversation Messages

**Phase:** 1 (Frontend only)  
**Priority:** 🟡 MEDIUM  
**Estimated Time:** 2-3 hours

### Commands (waterfall):

```bash
--agent 0 sprint 34 story 3
--agent 1 sprint 34 story 3
--agent 2 sprint 34 story 3
--agent 3 sprint 34 story 3
```

### Agent Prompt (Agent 0 lock / Agent 1 implement):

```
You are adding visible timestamps to conversation messages.

PROBLEM:
Timestamps only appear on hover (not discoverable on mobile).

OBJECTIVE:
Show timestamp below each message bubble.

DESIGN:
```
┌─────────────────────────────┐
│ Hey, how are you doing?     │ ← Message
└─────────────────────────────┘
  2:45 PM                      ← Timestamp (always visible)
```

FILE TO MODIFY:
- dating-ui/src/app/dating/conversations/[id]/page.tsx

IMPLEMENTATION:

Current code (timestamp in data-testid only):
```tsx
<span className="text-xs text-zinc-400" data-testid="conversation-message-time">
  {formatMessageTime(msg.createdAt, formatCopy, locale)}
</span>
```

New code (make always visible):
```tsx
<div className="message-bubble">
  <p className="message-text">{msg.text}</p>
</div>
<span className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
  {formatMessageTime(msg.createdAt, formatCopy, locale)}
</span>
```

Format for timestamps:
- Today: "2:45 PM"
- Yesterday: "Yesterday, 2:45 PM"
- This week: "Mon, 2:45 PM"
- Older: "Oct 15, 2:45 PM"

ACCEPTANCE CRITERIA:
- [ ] Timestamp visible below each bubble
- [ ] Format varies by age (today, yesterday, older)
- [ ] Timestamp color is subtle (doesn't distract)
- [ ] Works for sent and received messages
- [ ] Mobile responsive
- [ ] Dark mode works

TESTING:
- Send messages and verify timestamps
- Test with messages from different days
- Test mobile layout

OUTPUT:
Quick fix, should take < 3 hours.
```

---

## Story 34.4: Add Writing Prompts to Text Fields

**Phase:** 0 + 1 (Content writing + Implementation)  
**Priority:** 🔴 CRITICAL  
**Estimated Time:** 6-8 hours

### Commands (Content — waterfall):

```bash
--agent 0 sprint 34 story 4 content
--agent 1 sprint 34 story 4 content
--agent 2 sprint 34 story 4 content
--agent 3 sprint 34 story 4 content
```

### Agent Prompt (Content — Agent 0 lock / Agent 1 write):

```
You are a UX copywriter creating helpful prompts for profile text fields.

PROBLEM:
Users face blank textareas with no guidance ("blank canvas anxiety").
Many users don't know what to write or write very generic profiles.

OBJECTIVE:
Write prompt questions, examples, and guidance for each text field.

FIELDS TO WRITE FOR:
1. About Me
2. About My Ideal Partner
3. Relationship Goals

FOR EACH FIELD, WRITE:

1. **Prompt Questions** (3-4 questions to spark ideas)
   Example for "About Me":
   - What hobbies or activities do you enjoy in your free time?
   - What's something unique about your personality?
   - What's a typical weekend like for you?
   - What are you passionate about?

2. **Example Profile** (2-3 examples of good profiles)
   Example for "About Me":
   ```
   I'm an avid hiker who loves exploring new trails on weekends.
   During the week, you'll find me at local coffee shops reading or
   working on my photography. I value authenticity and deep conversations
   over small talk.
   ```

3. **Character Guidance**
   - Recommended length: 50-200 words
   - What to include
   - What to avoid

4. **Tone Tips**
   - Be specific, not generic
   - Show, don't tell
   - Be authentic

OUTPUT FORMAT:
Create file: dating-ui/docs/sprints/sprint-34-messaging-content/STORY_04_writing_prompts.md

Structure:
```markdown
# Profile Writing Prompts

## About Me

### Prompt Questions
1. ...
2. ...
3. ...
4. ...

### Example Profiles
Example 1: ...
Example 2: ...
Example 3: ...

### Guidance
- Recommended length: 50-200 words
- What to include: ...
- What to avoid: ...
- Tone: ...

## About My Ideal Partner
...

## Relationship Goals
...
```

CRITERIA FOR GOOD PROMPTS:
- Specific enough to spark ideas
- Open-ended (not yes/no)
- Encouraging (not intimidating)
- Inclusive (all genders, orientations, backgrounds)

CRITERIA FOR GOOD EXAMPLES:
- Realistic (not overly polished)
- Specific (not generic like "I like to have fun")
- Varied (different personalities/interests)
- Appropriate length (50-200 words)

OUTPUT:
Write all prompts and examples in markdown file.
```

### Commands (Implementation — waterfall; after content ACCEPT):

```bash
--agent 0 sprint 34 story 4 implementation
--agent 1 sprint 34 story 4 implementation
--agent 2 sprint 34 story 4 implementation
--agent 3 sprint 34 story 4 implementation
```

### Agent Prompt (Implementation — Agent 0 lock / Agent 1 implement):

```
You are implementing writing prompts in the onboarding text fields.

PREREQUISITES:
- Content written (Story 34.4 content): dating-ui/docs/sprints/sprint-34-messaging-content/STORY_04_writing_prompts.md

OBJECTIVE:
Add prompts, examples, and guidance to each textarea.

DESIGN:
```
About Me
┌─────────────────────────────────────────┐
│                                         │
│ [Cursor here]                           │
│                                         │
└─────────────────────────────────────────┘
0 / 500 characters (50-200 recommended)

💡 Think about:
• What hobbies do you enjoy?
• What makes you unique?
• What's a typical weekend like?

[Show example profiles ↓]

  [Expanded] Example 1:
  "I'm an avid hiker who loves exploring..."
```

FILES TO MODIFY:
- dating-ui/src/components/onboarding-texts-form.tsx
- dating-ui/src/lib/i18n/copy/en.ts (add prompt content)

FILES TO CREATE:
- dating-ui/src/components/onboarding/writing-prompts.tsx
- dating-ui/src/components/onboarding/example-profiles.tsx

IMPLEMENTATION:

1. ADD TO COPY:
   FILE: dating-ui/src/lib/i18n/copy/en.ts
   
   ```typescript
   onboarding: {
     prompts: {
       aboutMe: {
         questions: [
           'What hobbies or activities do you enjoy?',
           'What makes you unique?',
           'What's a typical weekend like for you?',
         ],
         examples: [
           'I'm an avid hiker...',
           'Coffee enthusiast...',
         ],
         guidance: {
           recommended: '50-200 words',
           include: 'Your hobbies, personality, interests',
           avoid: 'Generic phrases like "I like to have fun"',
         },
       },
       // ... other fields
     },
   }
   ```

2. CREATE PROMPTS COMPONENT:
   FILE: dating-ui/src/components/onboarding/writing-prompts.tsx
   
   ```tsx
   interface Props {
     questions: string[];
     characterCount: number;
     recommendedMin: number;
     recommendedMax: number;
   }
   
   export function WritingPrompts({ questions, characterCount, recommendedMin, recommendedMax }: Props) {
     return (
       <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
         <div className="flex justify-between">
           <span>{characterCount} characters</span>
           <span className="text-zinc-400">
             {recommendedMin}-{recommendedMax} recommended
           </span>
         </div>
         
         <div className="mt-3">
           <p className="font-medium">💡 Think about:</p>
           <ul className="mt-1 space-y-1">
             {questions.map((q, i) => (
               <li key={i}>• {q}</li>
             ))}
           </ul>
         </div>
       </div>
     );
   }
   ```

3. CREATE EXAMPLES COMPONENT:
   FILE: dating-ui/src/components/onboarding/example-profiles.tsx
   
   ```tsx
   interface Props {
     examples: string[];
   }
   
   export function ExampleProfiles({ examples }: Props) {
     const [expanded, setExpanded] = useState(false);
     
     return (
       <div className="mt-3">
         <button
           onClick={() => setExpanded(!expanded)}
           className="text-sm font-medium text-blue-600 hover:text-blue-700"
         >
           {expanded ? '▲ Hide' : '▼ Show'} example profiles
         </button>
         
         {expanded && (
           <div className="mt-2 space-y-3">
             {examples.map((example, i) => (
               <div key={i} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                 <p className="font-medium text-zinc-500 dark:text-zinc-400">Example {i + 1}:</p>
                 <p className="mt-1 text-zinc-700 dark:text-zinc-300">{example}</p>
               </div>
             ))}
           </div>
         )}
       </div>
     );
   }
   ```

4. USE IN FORM:
   FILE: dating-ui/src/components/onboarding-texts-form.tsx
   
   Add below each textarea:
   ```tsx
   <textarea ... />
   
   <WritingPrompts
     questions={copy.onboarding.prompts.aboutMe.questions}
     characterCount={aboutMe.length}
     recommendedMin={50}
     recommendedMax={200}
   />
   
   <ExampleProfiles examples={copy.onboarding.prompts.aboutMe.examples} />
   ```

ACCEPTANCE CRITERIA:
- [ ] Each text field has prompt questions
- [ ] Character count shows recommended range
- [ ] "Show examples" expandable works
- [ ] Examples are helpful and realistic
- [ ] Prompts don't overwhelm UI
- [ ] Mobile responsive
- [ ] Dark mode works
- [ ] Content in i18n system (translatable)

TESTING:
- Fill out fields with prompts visible
- Test examples expand/collapse
- Test mobile layout
- Get feedback from real users (if possible)

OUTPUT:
Implement prompts and examples for all 3 text fields.
```

---

## Story 34.5: Add Search/Filter to Conversation List

**Phase:** 1 (Frontend only)  
**Priority:** 🟡 MEDIUM  
**Depends On:** Story 34.1 (needs message data)  
**Estimated Time:** 4-5 hours

### Commands (waterfall; after 34.1 frontend ACCEPT):

```bash
--agent 0 sprint 34 story 5
--agent 1 sprint 34 story 5
--agent 2 sprint 34 story 5
--agent 3 sprint 34 story 5
```

### Agent Prompt (Agent 0 lock / Agent 1 implement):

```
You are adding search and filtering to the conversation list.

OBJECTIVE:
Let users search conversations by name and filter by unread/recent.

FEATURES:
- Search input (filter by other user's name)
- Filter dropdown: All / Unread / Recent (24h)
- Sort dropdown: Recent first (default) / Alphabetical

DESIGN:
```
Conversations

[🔍 Search by name...          ] [All ▼] [Recent ▼]

┌─────────────────────────────────────────┐
│ 👤 Sarah                          2h ago│
│    Hey, how are you?                  ●│
└─────────────────────────────────────────┘
...
```

FILES TO CREATE:
- dating-ui/src/components/conversation-list-filters.tsx

FILES TO MODIFY:
- dating-ui/src/app/dating/conversations/conversations-page-client.tsx

IMPLEMENTATION:

1. CREATE FILTERS COMPONENT:
   FILE: dating-ui/src/components/conversation-list-filters.tsx
   
   ```tsx
   interface Props {
     searchQuery: string;
     onSearchChange: (query: string) => void;
     filterType: 'all' | 'unread' | 'recent';
     onFilterChange: (filter: 'all' | 'unread' | 'recent') => void;
     sortBy: 'recent' | 'alphabetical';
     onSortChange: (sort: 'recent' | 'alphabetical') => void;
   }
   
   export function ConversationListFilters({ ... }: Props) {
     return (
       <div className="flex gap-2">
         <input
           type="search"
           placeholder="Search by name..."
           value={searchQuery}
           onChange={(e) => onSearchChange(e.target.value)}
           className="flex-1 rounded-lg border px-3 py-2"
         />
         
         <select value={filterType} onChange={(e) => onFilterChange(e.target.value)}>
           <option value="all">All</option>
           <option value="unread">Unread</option>
           <option value="recent">Recent (24h)</option>
         </select>
         
         <select value={sortBy} onChange={(e) => onSortChange(e.target.value)}>
           <option value="recent">Recent first</option>
           <option value="alphabetical">A-Z</option>
         </select>
       </div>
     );
   }
   ```

2. IMPLEMENT FILTERING LOGIC:
   FILE: dating-ui/src/app/dating/conversations/conversations-page-client.tsx
   
   ```tsx
   const [searchQuery, setSearchQuery] = useState('');
   const [filterType, setFilterType] = useState<'all' | 'unread' | 'recent'>('all');
   const [sortBy, setSortBy] = useState<'recent' | 'alphabetical'>('recent');
   
   const filteredConversations = useMemo(() => {
     let result = conversations;
     
     // Search by name
     if (searchQuery) {
       result = result.filter(conv =>
         conv.otherUser.nickname.toLowerCase().includes(searchQuery.toLowerCase())
       );
     }
     
     // Filter by type
     if (filterType === 'unread') {
       result = result.filter(conv => conv.unreadCount > 0);
     } else if (filterType === 'recent') {
       const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
       result = result.filter(conv =>
         conv.lastMessage && new Date(conv.lastMessage.sentAt).getTime() > oneDayAgo
       );
     }
     
     // Sort
     if (sortBy === 'alphabetical') {
       result = result.sort((a, b) =>
         a.otherUser.nickname.localeCompare(b.otherUser.nickname)
       );
     } else {
       result = result.sort((a, b) => {
         const aTime = a.lastMessage?.sentAt || a.matchedAt;
         const bTime = b.lastMessage?.sentAt || b.matchedAt;
         return new Date(bTime).getTime() - new Date(aTime).getTime();
       });
     }
     
     return result;
   }, [conversations, searchQuery, filterType, sortBy]);
   ```

3. PERSIST FILTERS:
   ```tsx
   // Save to localStorage or URL params
   useEffect(() => {
     sessionStorage.setItem('conversationFilters', JSON.stringify({
       searchQuery,
       filterType,
       sortBy,
     }));
   }, [searchQuery, filterType, sortBy]);
   ```

ACCEPTANCE CRITERIA:
- [ ] Search filters by name (case-insensitive)
- [ ] Filter dropdown works (All/Unread/Recent)
- [ ] Sort dropdown works (Recent/Alphabetical)
- [ ] Filters persist during session
- [ ] Clear search button when typing
- [ ] No results message shown
- [ ] Mobile responsive
- [ ] Debounced search (300ms)

TESTING:
- Search for names
- Test unread filter
- Test recent filter
- Test sorting
- Test combined filters

OUTPUT:
Implement filtering and test all combinations.
```

---

## 🚀 Sprint 34 Execution Plan

**Process:** Full waterfall. Paste **one** command at a time.

**Recommended order:**

```bash
# 34.1 backend → frontend
--agent 0 sprint 34 story 1 backend
# … then 1, 2, 3 for backend; then 0–3 for frontend

# 34.2 backend → frontend
--agent 0 sprint 34 story 2 backend
# … same

# 34.3
--agent 0 sprint 34 story 3

# 34.4 content → implementation
--agent 0 sprint 34 story 4 content

# 34.5 (after 34.1)
--agent 0 sprint 34 story 5
```

See `QUICK_START_COMMANDS.md` for the full expanded list.

---

## 📊 Sprint 34 Summary

**Total Stories:** 5  
**Process:** Waterfall 0→1→2→3 per phase  
**Backend phases:** 34.1, 34.2  
**Frontend phases:** 34.1–34.5  
**Content phase:** 34.4  

**By End of Sprint:**
- ✅ Conversation list is useful (previews, timestamps)
- ✅ Content moderation is transparent
- ✅ Profile writing is guided
- ✅ Conversations are searchable/filterable

**Start:**

```bash
--agent 0 sprint 34 story 1 backend
```
