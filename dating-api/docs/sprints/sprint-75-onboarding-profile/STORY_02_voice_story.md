# Story 2: Record your story by voice

**Status:** Proposed
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

### Acceptance criteria

- [ ] Recording works in the browser and produces a draft in all three fields
- [ ] The draft comes back in the language that was spoken (he / en / es)
- [ ] The draft is editable and is only saved on Continue
- [ ] Re-recording replaces the draft without losing manual edits silently — warn first
- [ ] Every failure path falls back to plain typing with a readable message
- [ ] No audio is written to disk, S3 or the database
- [ ] Generated text passes through the same moderation as typed text
- [ ] The endpoint is rate limited and the limit is covered by a test

## Out of scope

- Capacitor / native mobile microphone — web only in this story
- Storing or replaying the recording
- Voice for anything other than the three story fields

## Definition of done

- [ ] A new user can go from empty story to three filled paragraphs by speaking once
- [ ] Denying microphone access degrades to the current typing experience exactly
- [x] Cost per draft measured and written into this story — **planning estimate (no live Whisper call in CI):** ~$0.01–0.02 / draft (Whisper ~$0.006/min + gpt-4o-mini shaping). Response `usage` fields support measuring a live call later.
