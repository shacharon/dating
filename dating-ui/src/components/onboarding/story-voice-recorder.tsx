'use client';

import { useEffect, useRef, useState } from 'react';
import {
  postStoryVoiceDraft,
  StoryVoiceApiError,
  type StoryVoiceDraftResponse,
} from '@/lib/api/me-story-voice-api';
import { ContentModerationApiError } from '@/lib/moderation/content-moderation-error';

const MAX_SECONDS = 120;
const MIN_SECONDS = 5;

export type StoryVoiceRecorderCopy = {
  recordPrompt: string;
  recordButton: string;
  stopButton: string;
  working: string;
  draftBadge: string;
  reRecordConfirm: string;
  tooShort: string;
  micDenied: string;
  genericError: string;
  timerLabel: (seconds: number) => string;
};

type Props = {
  copy: StoryVoiceRecorderCopy;
  fieldsDirtyForRerecord: boolean;
  onDraft: (draft: StoryVoiceDraftResponse) => void;
  onModerationError?: (err: ContentModerationApiError) => void;
};

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

export function StoryVoiceRecorder({
  copy,
  fieldsDirtyForRerecord,
  onDraft,
  onModerationError,
}: Props) {
  const [phase, setPhase] = useState<
    'idle' | 'recording' | 'working' | 'error'
  >('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (tickRef.current) clearInterval(tickRef.current);
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    tickRef.current = null;
    stopTimerRef.current = null;
  }

  function stopTracks() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    return () => {
      clearTimers();
      stopTracks();
      mediaRecorderRef.current = null;
    };
  }, []);

  async function uploadBlob(blob: Blob, durationSeconds: number) {
    setPhase('working');
    setError(null);
    try {
      const draft = await postStoryVoiceDraft(blob, durationSeconds);
      setHasDraft(true);
      onDraft(draft);
      setPhase('idle');
    } catch (e) {
      if (e instanceof ContentModerationApiError) {
        onModerationError?.(e);
        setError(copy.genericError);
      } else if (e instanceof StoryVoiceApiError) {
        setError(e.message || copy.genericError);
      } else if (e instanceof Error) {
        setError(e.message || copy.genericError);
      } else {
        setError(copy.genericError);
      }
      setPhase('error');
    }
  }

  function finishRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    clearTimers();
    recorder.stop();
  }

  async function startRecording() {
    if (phase === 'working' || phase === 'recording') return;

    if (
      (hasDraft || fieldsDirtyForRerecord) &&
      !window.confirm(copy.reRecordConfirm)
    ) {
      return;
    }

    setError(null);
    setElapsed(0);
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(copy.micDenied);
      setPhase('error');
      return;
    }

    streamRef.current = stream;
    const mimeType = pickMimeType();
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunksRef.current.push(ev.data);
    };

    recorder.onstop = () => {
      stopTracks();
      const durationSeconds = Math.max(
        0,
        Math.round((Date.now() - startedAtRef.current) / 1000),
      );
      const type = recorder.mimeType || mimeType || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type });
      mediaRecorderRef.current = null;

      if (durationSeconds < MIN_SECONDS) {
        setError(copy.tooShort);
        setPhase('error');
        return;
      }
      void uploadBlob(blob, Math.min(durationSeconds, MAX_SECONDS));
    };

    startedAtRef.current = Date.now();
    setPhase('recording');
    recorder.start(250);

    tickRef.current = setInterval(() => {
      const sec = Math.round((Date.now() - startedAtRef.current) / 1000);
      setElapsed(Math.min(sec, MAX_SECONDS));
    }, 250);

    stopTimerRef.current = setTimeout(() => {
      finishRecording();
    }, MAX_SECONDS * 1000);
  }

  return (
    <div
      className="space-y-2 rounded border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50"
      data-testid="story-voice-recorder"
    >
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        {copy.recordPrompt}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {phase === 'recording' ? (
          <button
            type="button"
            onClick={() => finishRecording()}
            className="inline-flex min-h-11 items-center rounded bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
            data-testid="story-voice-stop"
          >
            {copy.stopButton}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void startRecording()}
            disabled={phase === 'working'}
            className="inline-flex min-h-11 items-center rounded border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            data-testid="story-voice-record"
          >
            {copy.recordButton}
          </button>
        )}
        {phase === 'recording' ? (
          <span
            className="text-sm tabular-nums text-zinc-600 dark:text-zinc-400"
            aria-live="polite"
          >
            {copy.timerLabel(elapsed)}
          </span>
        ) : null}
        {phase === 'working' ? (
          <span
            className="text-sm text-zinc-600 dark:text-zinc-400"
            aria-live="polite"
          >
            {copy.working}
          </span>
        ) : null}
        {hasDraft && phase !== 'working' ? (
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {copy.draftBadge}
          </span>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
