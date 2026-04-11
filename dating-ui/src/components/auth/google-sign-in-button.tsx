"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const GSI_SRC = "https://accounts.google.com/gsi/client";

type Props = {
  clientId: string;
  onCredential: (idToken: string) => void;
  disabled?: boolean;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (r: { credential: string }) => void;
          }) => void;
          renderButton: (
            el: HTMLElement,
            config: Record<string, string | undefined>,
          ) => void;
          cancel: () => void;
        };
      };
    };
  }
}

/**
 * Official Google Sign-In (GIS) button. Passes id token to parent only — no localStorage.
 */
export function GoogleSignInButton({
  clientId,
  onCredential,
  disabled,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredRef = useRef(onCredential);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    onCredRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientId.trim() || disabled) return;
    let cancelled = false;

    function mountButton() {
      if (cancelled || !containerRef.current || !window.google?.accounts?.id) {
        return;
      }
      const el = containerRef.current;
      el.replaceChildren();
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (res) => {
            if (res.credential) onCredRef.current(res.credential);
          },
        });
        window.google.accounts.id.renderButton(el, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
        });
      } catch {
        setError("Could not initialize Google Sign-In.");
      }
    }

    function ensureScriptThenRender() {
      const existing = document.querySelector(
        `script[src="${GSI_SRC}"]`,
      ) as HTMLScriptElement | null;

      const done = () => {
        if (!cancelled) mountButton();
      };

      if (existing?.dataset.loaded === "1") {
        queueMicrotask(done);
        return;
      }

      const s = existing ?? document.createElement("script");
      s.src = GSI_SRC;
      s.async = true;
      s.defer = true;
      s.onload = () => {
        s.dataset.loaded = "1";
        done();
      };
      s.onerror = () => {
        if (!cancelled) setError("Failed to load Google Sign-In.");
      };
      if (!existing) {
        document.head.appendChild(s);
      } else if (window.google?.accounts?.id) {
        existing.dataset.loaded = "1";
        queueMicrotask(done);
      } else {
        existing.addEventListener(
          "load",
          () => {
            existing.dataset.loaded = "1";
            done();
          },
          { once: true },
        );
      }
    }

    queueMicrotask(() => setError(null));
    ensureScriptThenRender();

    return () => {
      cancelled = true;
      try {
        window.google?.accounts?.id.cancel();
      } catch {
        /* ignore */
      }
    };
  }, [clientId, disabled]);

  if (!clientId.trim()) {
    return (
      <p className="text-sm text-amber-800 dark:text-amber-200">
        Set{" "}
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
          NEXT_PUBLIC_GOOGLE_CLIENT_ID
        </code>{" "}
        in{" "}
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">.env.local</code>
        .
      </p>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  return (
    <div
      ref={containerRef}
      className={disabled ? "pointer-events-none opacity-50" : undefined}
    />
  );
}
