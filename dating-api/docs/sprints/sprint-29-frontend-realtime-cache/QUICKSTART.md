# Sprint 29 Quick Start

**Goal:** Frontend realtime + cache with Cursor agents, one story at a time. No AWS required.

---

## How to run

Paste into chat **one command at a time**:

```text
--agent 0 sprint 29 story 1
```

Then Agent 1 → 2 → 3 for that story, then next story’s Agent 0.

Full sheet: [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)

---

## Order

1. WS realtime default  
2. Conversations cursor + unread-total  
3. TanStack Query  
4. next/image optimization  
5. Lazy-load admin / heavy UI  

---

## After each story

```powershell
cd C:\dev\piza\dating\dating-api
npm run build   # if API touched

cd C:\dev\piza\dating\dating-ui
npm run typecheck
# plus story-specific vitest from the Architect / Dev handoff
```
