# Sprint 28 Quick Start

**Goal:** Backend scale hardening with Cursor agents, one story at a time. No AWS required.

---

## How to run

Paste into chat **one command at a time**:

```text
--agent 0 sprint 28 story 1
```

Then Agent 1 → 2 → 3 for that story, then next story’s Agent 0.

Full sheet: [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)

---

## Order

1. Prisma pool + timeouts  
2. Lock expensive endpoints  
3. Missing indexes  
4. Batch unread counts  
5. Message RL → Redis  
6. Throttle lastSeenAt  

---

## After each story

```powershell
cd C:\dev\piza\dating\dating-api
npm run build
# plus story-specific tests from the Architect / Dev handoff
```
