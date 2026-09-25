'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  speechRecognitionSupported,
  startFieldSpeech,
} from '@/lib/speech/field-speech';

type Copy = {
  recordButton: string;
  stopButton: string;
  listening: string;
  micDenied: string;
  unsupported: string;
  genericError: string;
};

type Props = {
  copy: Copy;
  fieldId: string;
  fieldLabel: string;
  onAppend: (spoken: string) => void;
  children: ReactNode;
};

/** Microphone toggle for one textarea. One shared recognizer serves every field. */
export function FieldSpeechButton({
  copy,
  fieldId,
  fieldLabel,
  onAppend,
  children,
}: Props) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<'denied' | 'generic' | 'unsupported' | null>(
    null,
  );
  const sessionRef = useRef<{ stop: () => void } | null>(null);
  const onAppendRef = useRef(onAppend);
  onAppendRef.current = onAppend;

  useEffect(() => {
    return () => {
      sessionRef.current?.stop();
      sessionRef.current = null;
    };
  }, []);

  function toggle() {
    if (!speechRecognitionSupported()) {
      setError('unsupported');
      return;
    }
    if (sessionRef.current) {
      sessionRef.current.stop();
      sessionRef.current = null;
      setListening(false);
      return;
    }
    setError(null);
    const session = startFieldSpeech({
      onFinal: (text) => onAppendRef.current(text),
      onEnd: () => {
        sessionRef.current = null;
        setListening(false);
      },
      onError: (code) => {
        sessionRef.current = null;
        setListening(false);
        setError(code);
      },
    });
    if (!session) {
      setError('unsupported');
      return;
    }
    sessionRef.current = session;
    setListening(true);
  }

  const message =
    error === 'denied'
      ? copy.micDenied
      : error === 'unsupported'
        ? copy.unsupported
        : error === 'generic'
          ? copy.genericError
          : null;

  return (
    <div className="w-full">
      <div className="relative w-full">
        {children}
        <span className="sr-only" id={`${fieldId}-speech-state`}>
          {listening ? copy.listening : ''}
        </span>
        <button
          type="button"
          data-testid={`${fieldId}-mic`}
          aria-pressed={listening}
          aria-label={
            listening
              ? `${copy.stopButton}: ${fieldLabel}`
              : `${copy.recordButton}: ${fieldLabel}`
          }
          onClick={toggle}
          className={`absolute bottom-1.5 end-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm ${
            listening
              ? 'border-red-600 bg-red-600 text-white'
              : 'border-zinc-300 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200'
          }`}
        >
          <MicIcon listening={listening} />
        </button>
      </div>
      {listening ? (
        <span className="mt-1 block text-xs font-medium text-red-600" role="status">
          {copy.listening}
        </span>
      ) : null}
      {message ? (
        <span className="mt-1 block text-xs text-zinc-600 dark:text-zinc-400" role="alert">
          {message}
        </span>
      ) : null}
    </div>
  );
}

function MicIcon({ listening }: { listening: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-4 w-4"
      fill={listening ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z" />
      <path d="M19 11a7 7 0 0 1-14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}
