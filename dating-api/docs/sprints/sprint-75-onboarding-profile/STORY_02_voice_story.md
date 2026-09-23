# Story 2: Record your story by voice

**Status:** Done (live mic check pending operator; Agent 2.5 deferred)  
**Shipped on main:** `3620c74`  
**Feature tip ahead of main:** 0  
**Depends on:** Story 1

## Why

Screen 1 of a brand-new account is three empty text boxes. A person who signed up
ten seconds ago has to write paragraphs about themselves from a blinking cursor. Most
either quit there or type something generic — "I'm a fun person who likes travelling
and good food" — which tells the matching engine nothing. So a blank box costs us both
sign-ups and signal.

Talking is far easier than writing. If the user speaks for a minute and we turn that
into a first draft they can edit, we get their own words, in their own voice, with
almost no effort. Editing text that already exists is an order of magnitude easier
than producing it.

## What

**As a** new user
**I want** to talk for a minute instead of writing from nothing
**So that** I can finish my story quickly and still sound like myself

### On the story screen

- A record button above the fields: "Talk for a minute — who you are, who you're
  looking for, what you want."
- Recording shows elapsed time and a stop control. Hard cap 120 seconds.
- On stop: upload, show a working state, then fill the three textareas with the draft,
  clearly marked as a draft the user can edit.
- Re-record replaces the draft. Nothing is saved to the profile until Continue.
- Typing by hand stays fully available and is never hidden.

### API

`POST /api/v1/me/profile/story/voice-draft`, multipart audio.

- Transcribe with OpenAI (`openai` v6 is already a dependency — no new provider, no new key).
- Prompt the existing LLM layer to shape the transcript into `aboutMe`,
  `aboutPartner`, `aboutRelationship`, **in the language the user spoke**.
- Run the existing profile moderation on the generated text before returning it. A
  draft that fails moderation is not returned.
- The audio is never persisted. Log duration, language and token usage only.
- Rate limit it — this endpoint costs money per call.

### Failure paths, all of which must leave the user able to continue by typing

- Microphone permission denied
- Recording too short to transcribe
- Transcription or draft generation fails
- Moderation rejects the generated draft
- Unsupported browser / MediaRecorder

### Acceptance criteria

- [x] Recording works in the browser and produces a draft in all three fields (code path + unit/UI tests; live mic pending operator)
- [x] The draft comes back in the language that was spoken (he / en / es) — Whisper language → LLM prompt
- [x] The draft is editable and is only saved on Continue
- [x] Re-recording replaces the draft without losing manual edits silently — warn first (`window.confirm`)
- [x] Every failure path falls back to plain typing with a readable message
- [x] No audio is written to disk, S3 or the database (memory multer; CR asserted)
- [x] Generated text passes through the same moderation as typed text
- [x] The endpoint is rate limited and the limit is covered by a test (5/hour → 429)

## Out of scope

- Capacitor / native mobile microphone — web only in this story
- Storing or replaying the recording
- Voice for anything other than the three story fields

## Definition of done

- [x] A new user can go from empty story to three filled paragraphs by speaking once (engineering path complete; live mic pending operator)
- [x] Denying microphone access degrades to the current typing experience exactly (UI copy + fields remain)
- [x] Cost per draft measured and written into this story — **planning estimate (no live Whisper call in CI):** ~$0.01–0.02 / draft (Whisper ~$0.006/min + gpt-4o-mini shaping). Response `usage` fields support measuring a live call later.
- [x] Landed on `main` (ahead count 0)

## Deferred

- Live HTTPS/localhost mic + OpenAI smoke on reset account — **pending operator**
- Agent 2.5 security pass — **deferred** (pipeline skipped by operator; CR covered auth/memory/rate-limit/log scrub basics)
