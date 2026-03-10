# Extraction pipeline: overlap and competing logic audit

Audit of the extraction pipeline for overlapping or competing logic. **Findings only; no behavior changes.**

Pipeline order (high level): LLM → normalizeRawExtraction → normalizeKeys → validateAndClean → optional retry → sparse guard → text inference → signal count limits → recompute confidence → finalize.

---

## 1. LLM evidence rule vs validateAndClean evidence-based keep

**LLM (prompt):**
- "Every non-null score MUST have one evidence item with a short direct quote from the text (5–15 words)."
- "If you cannot point to a specific snippet that supports a score, use null for that signal."

**validateAndClean:**
- For each official signal key, if the value is out of range (NaN or &lt; 1 or &gt; 10):
  - If the key appears in `evidenceSignals` (evidence items, with alias rewritten to official): **keep** the signal and clamp to 1–10 (or 5 if still NaN).
  - Else: **strip** to null and log `validateAndClean_stripped`.

**Findings:**
- **Conceptual overlap:** Both use “evidence” to justify keeping a score. The prompt asks the model to only output non-null when there is evidence; validateAndClean uses evidence to decide whether to keep a *malformed* (out-of-range/NaN) value or drop it.
- **Not competing:** validateAndClean is a safety net for malformed LLM output. The model is supposed to send valid 1–10 or null; when it sends e.g. 15 or a string, evidence is used to “rescue” the key by clamping instead of dropping.
- **Subtlety:** A signal with evidence but invalid value is clamped; a signal with no evidence and invalid value is dropped. So evidence is treated as a strong signal of intent and reduces strictness (clamp vs drop). The prompt does not distinguish “has evidence but wrong scale” — it only says “use null if no snippet.” So the overlap is that evidence is used twice: once as an instruction to the LLM (only non-null when you have a quote) and once as a post-hoc keeper for invalid numeric values.

---

## 2. Retry vs text inference

**Retry (runOptionalRetryWhenEmpty):**
- Runs only when first pass has **zero** non-null signals and input text is non-empty.
- Second LLM call with minimal prompt: “assign 1-10 to at least 2-3 signals that have any hint.”
- Result replaces first pass only if retry returns &gt; 0 non-null; otherwise original (with EXTRACTION_EMPTY note) is kept.

**Text inference:**
- Runs on **every** extraction, after sparse guard.
- Fills only **null** signals using regex rules; never overrides existing non-null.
- No LLM; deterministic.

**Findings:**
- **Overlap in intent:** Both address “under-extraction.” Retry handles the extreme case (0 signals); text inference handles any null that matches a rule.
- **Order and interaction:** If first pass is empty, retry may produce 2–3 signals. Then sparse guard may cap again (if input is sparse). Then text inference can add more signals by filling nulls. So for “empty first pass” we can have: retry adds 2–3 → sparse might trim → text inference adds more. Retry and text inference can both add signals in the same run when retry fired.
- **Not competing:** Retry is conditional (0 signals) and LLM-based; text inference is unconditional and rule-based. They are complementary. The only redundancy is that the retry prompt asks for “at least 2-3 signals” using “inference,” and text-inference rules target similar cues (e.g. independence, directness). So for the same text, retry might fill 2–3 and text inference could fill the same or more; no conflict, but possible double coverage for some cues.

---

## 3. Sparse guard vs signal count cap

**Sparse guard (applySparseTextGuard):**
- Trigger: input is “sparse” (length &lt; 80 chars or &lt; 12 words) or “very sparse” (&lt; 50 chars or &lt; 6 words).
- If triggered and (non-null &gt; 2 or 3, or confidence &gt; 0.45): cap non-null to 2 (very sparse) or 3 (sparse), keep **first** 2 or 3 by order of `EXTRACTION_SIGNAL_KEYS`; cap confidence to 0.45; filter evidence to kept keys.

**Signal count limits (enforceSignalCountLimits):**
- If non-null &gt; 12: keep 12 by **priority** (PRIORITY_SIGNAL_KEYS first, then evidence presence, then extremity); drop rest; filter evidence to kept keys.
- If non-null &lt; 6 and not sparse and text non-empty: only add coverageNote; no fabrication.

**Findings:**
- **Both reduce count:** Sparse guard reduces by input length; signal count cap reduces when count &gt; 12. So both enforce “how many signals” but under different conditions.
- **Different keep order:** Sparse guard keeps the first 2 or 3 by **key order** (EXTRACTION_SIGNAL_KEYS). Signal count cap keeps 12 by **priority** (PRIORITY_SIGNAL_KEYS, then evidence, then extremity). So when we drop signals, “who gets kept” is defined differently in the two modules.
- **Sequential:** Sparse runs first, then text inference (can add), then signal count. So we can have: sparse caps to 3 → text inference adds e.g. 2 → 5 non-null → signal count does not cap (5 ≤ 12) but may add “only 5 signals (target min 6)”. Or: long text, 14 non-null after text inference → signal count caps to 12 with priority. So sparse is input-driven; signal count is count-driven. Overlap is only in the general idea of “cap excess signals” and “filter evidence to kept signals”; the triggers and keep logic are different.
- **Edge case:** If input is sparse and retry + text inference produce e.g. 10 non-null, sparse guard caps to 2 or 3 (by key order). Those 2–3 might not be the same as the “top 12 by priority” that signal count would keep. So for sparse input, which signals survive is determined by key order, not by priority.

---

## 4. Model confidence vs recomputed confidence

**Model confidence:**
- LLM returns `confidence` in [0, 1]. Preserved by normalizeRawExtraction (default 0.5 if missing/invalid).
- validateAndClean: if any correction (out-of-range stripped, domain fixed), multiply confidence by 0.8.
- Sparse guard: if applied, `confidence = min(data.confidence, 0.45)`.

**Recomputed confidence (applyRecomputeConfidence):**
- Runs last (after sparse, text inference, signal count).
- `confidence = computeConfidenceFromCoverage(data.signals)` (coverage × signalCountFactor); **fully overwrites** previous confidence.

**Findings:**
- **Competing in outcome:** The confidence that leaves the pipeline is **always** the recomputed one. Model confidence is never in the final output.
- **Model confidence is only used mid-pipeline:** It affects validateAndClean’s 0.8 penalty and sparse guard’s cap (0.45). So model confidence influences intermediate state but is then discarded.
- **Overlap:** Two definitions of “confidence” exist: (1) model’s self-reported 0–1, (2) coverage × signalCountFactor. Only (2) is exported. So any tuning or semantics in the prompt about “confidence” do not affect the API contract; only signal coverage and count do. This is a clear overlap: we ask the model for confidence and later replace it.

---

## 5. Alias normalization vs unknown-key drop

**normalizeKeys (extraction-normalization):**
- For each key in raw signals: if in EXTRACTION_SIGNAL_KEYS → keep; else if in KEY_ALIASES → map to official (or drop if official already present); else → **unknownSignalKeysDropped** (key not in output).
- Output `normalizedSignals` has only official keys (or aliases mapped to official).

**validateAndClean:**
- Builds `evidenceSignals` from evidence items, rewriting alias → official via KEY_ALIASES.
- Output signals: only keys in EXTRACTION_SIGNAL_KEYS; values from normalizedSignals (already normalized).
- Evidence: map each item’s signal alias → official, then **filter** to `EXTRACTION_SIGNAL_KEYS_SET.has(item.signal)`; slice(0, 14).

**Findings:**
- **Signals:** Unknown keys are dropped in **normalizeKeys** only. validateAndClean never sees them; it iterates over EXTRACTION_SIGNAL_KEYS and reads from already-normalized signals. So “unknown signal key drop” for the **signals** object lives in one place: normalizeKeys.
- **Evidence:** Unknown (and alias-only) keys are dropped in **validateAndClean** by the evidence filter (.filter(EXTRACTION_SIGNAL_KEYS_SET)). So “unknown key drop” for **evidence** is in validateAndClean. Alias keys in evidence are rewritten to official then kept or dropped by the same allowlist.
- **Overlap:** The allowlist (EXTRACTION_SIGNAL_KEYS) is applied in two places: normalizeKeys for signals, validateAndClean for evidence. Conceptually the same rule (“only official keys in output”) but applied to two different structures. Not competing; complementary. Redundancy is only that “official keys” is the single source of truth used in both.

---

## 6. Evidence filtering vs signal filtering

**Evidence filtering:**
- **validateAndClean:** Evidence items rewritten (alias → official), then filtered to `EXTRACTION_SIGNAL_KEYS_SET`, then slice(0, 14).
- **Sparse guard:** Evidence filtered to `keepKeys` (signals we kept when capping).
- **Signal count cap:** Evidence filtered to `keepKeys` (signals we kept when capping to 12).
- **Text inference:** Appends new evidence; result sliced to 14.

**Signal filtering:**
- **validateAndClean:** Output signals only for EXTRACTION_SIGNAL_KEYS; values rounded/clamped/null per rules.
- **Sparse guard:** Set signal to null for keys not in keepKeys.
- **Signal count cap:** Set signal to null for keys not in keepKeys.

**Findings:**
- **Lockstep:** Whenever a signal is dropped (sparse or signal-count), its evidence is dropped in the same step. Evidence is always a subset of “evidence for currently kept signals.” So signal filtering and evidence filtering are aligned in sparse and signal-count.
- **Multiple evidence caps:** validateAndClean slices evidence to 14; text inference slices to 14. So the “max 14 evidence items” is enforced in two places.
- **Allowlist in two places:** validateAndClean filters evidence by official keys; normalizeKeys already ensured signals only have official keys. So evidence is “filter to official keys” in validateAndClean; signals were filtered earlier by normalizeKeys. Overlap is that “evidence must refer to official keys” and “evidence must refer to signals we kept” are both enforced, in different stages (allowlist in validateAndClean; keepKeys in sparse and signal-count).
- **Summary:** No conflict between evidence and signal filtering; they are consistent. Redundancy is (1) two places that slice evidence to 14, and (2) allowlist filtering for evidence in validateAndClean while signal allowlist was already applied in normalizeKeys.

---

## Summary table

| Area | Overlap / competition | Notes |
|------|------------------------|--------|
| LLM evidence vs validateAndClean keep | Conceptual overlap | Evidence used by LLM as “only non-null if quote” and by validateAndClean as “keep malformed value if evidence present.” Complementary; no conflict. |
| Retry vs text inference | Intent overlap | Both address under-extraction; retry for 0 signals (LLM), text inference for any null (rules). Can both add signals in same run; complementary. |
| Sparse guard vs signal count cap | Both cap signals | Different triggers (input length vs count) and different keep order (key order vs priority). Sequential; overlap only in “cap + filter evidence.” |
| Model vs recomputed confidence | Competing | Final confidence is always recomputed; model confidence only used mid-pipeline then discarded. |
| Alias vs unknown-key drop | Same rule, two structures | normalizeKeys drops unknown signal keys; validateAndClean filters evidence to official keys. Same allowlist, different application. |
| Evidence vs signal filtering | Lockstep + redundancy | Evidence filtered to kept signals in sparse and signal-count; evidence allowlist and slice(0,14) in validateAndClean and text inference. Consistent; minor redundancy. |

No behavior changes were made; this document is findings only.
