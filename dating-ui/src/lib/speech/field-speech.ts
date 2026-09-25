/** Shared Web Speech session for the three story textareas. Language is Hebrew. */

export const FIELD_SPEECH_LANG = 'he-IL';

export function appendTranscript(current: string, spoken: string): string {
  const chunk = spoken.replace(/\s+/g, ' ').trim();
  if (!chunk) return current;
  const base = current.replace(/\s+$/, '');
  if (!base) return chunk;
  return `${base} ${chunk}`;
}

type SpeechResultRow = { isFinal: boolean; 0: { transcript: string } };

type SpeechResultEvent = {
  resultIndex: number;
  results: ArrayLike<SpeechResultRow>;
};

type SpeechErrorEvent = { error?: string };

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: SpeechResultEvent) => void) | null;
  onerror: ((ev: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechCtor = new () => SpeechRec;

let active: { id: number; stop: () => void } | null = null;
let seq = 0;

function speechCtor(): SpeechCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechRecognitionSupported(): boolean {
  return speechCtor() != null;
}

export type FieldSpeechHandlers = {
  onFinal: (text: string) => void;
  onEnd: () => void;
  onError: (code: 'denied' | 'generic') => void;
};

/** Starts listening. Stops any other field that is already listening. */
export function startFieldSpeech(
  handlers: FieldSpeechHandlers,
): { stop: () => void } | null {
  const Ctor = speechCtor();
  if (!Ctor) return null;
  active?.stop();

  const id = ++seq;
  const rec = new Ctor();
  rec.lang = FIELD_SPEECH_LANG;
  rec.continuous = true;
  rec.interimResults = false;

  let stoppedByUser = false;

  rec.onresult = (ev) => {
    for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
      const row = ev.results[i];
      if (row?.isFinal) handlers.onFinal(row[0].transcript);
    }
  };

  rec.onerror = (ev) => {
    const code = ev.error;
    if (code === 'aborted' || code === 'no-speech') return;
    stoppedByUser = true;
    if (active?.id === id) active = null;
    if (code === 'not-allowed' || code === 'service-not-allowed') {
      handlers.onError('denied');
    } else {
      handlers.onError('generic');
    }
  };

  rec.onend = () => {
    if (active?.id === id) active = null;
    if (!stoppedByUser) handlers.onEnd();
  };

  const stop = () => {
    if (stoppedByUser) return;
    stoppedByUser = true;
    if (active?.id === id) active = null;
    try {
      rec.stop();
    } catch {
      /* already stopped */
    }
    handlers.onEnd();
  };

  active = { id, stop };
  try {
    rec.start();
  } catch {
    active = null;
    handlers.onError('generic');
    return null;
  }
  return { stop };
}
