import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { AuthRefreshError } from "@/lib/auth/auth-refresh-coordinator";
import { notifyAuthSessionRevoked } from "@/lib/auth/auth-session-revocation";
import {
  acquireMessagingSocket,
  getMessagingSocketOrigin,
  releaseMessagingSocket,
  resetMessagingSocketForTests,
} from "./messaging-socket";
import { MobileApiUrlMissingError } from "@/lib/api-base";
import { setPlatformOverrideForTests } from "@/lib/platform";

const reconnectAttemptHandlerRef = vi.hoisted(() => ({
  current: null as (() => void) | null,
}));

const disconnectHandlerRef = vi.hoisted(() => ({
  current: null as ((reason: string) => void) | null,
}));

const resolveMessagingAccessToken = vi.hoisted(() => vi.fn());

const ioMock = vi.hoisted(() =>
  vi.fn(() => {
    const socket = {
      auth: {} as Record<string, unknown>,
      connected: false,
      connect: vi.fn(function connect(this: { connected: boolean }) {
        this.connected = true;
      }),
      disconnect: vi.fn(function disconnect(this: { connected: boolean }) {
        this.connected = false;
      }),
      removeAllListeners: vi.fn(),
      on: vi.fn((event: string, fn: (...args: unknown[]) => void) => {
        if (event === "disconnect") {
          disconnectHandlerRef.current = fn as (reason: string) => void;
        }
      }),
      io: {
        on: vi.fn((event: string, fn: () => void) => {
          if (event === "reconnect_attempt") {
            reconnectAttemptHandlerRef.current = fn;
          }
        }),
        removeAllListeners: vi.fn(),
      },
    };
    return socket;
  }),
);

vi.mock("socket.io-client", () => ({
  io: ioMock,
}));

vi.mock("@/lib/auth/auth-session-revocation", () => ({
  notifyAuthSessionRevoked: vi.fn(),
}));

vi.mock("./messaging-socket-auth", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./messaging-socket-auth")>();
  return {
    ...actual,
    resolveMessagingAccessToken,
    getCachedMessagingAccessToken: vi.fn(() => "cached-jwt"),
    resetMessagingSocketAuthForTests: actual.resetMessagingSocketAuthForTests,
  };
});

describe("getMessagingSocketOrigin", () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const originalInternal = process.env.INTERNAL_API_URL;

  afterEach(() => {
    setPlatformOverrideForTests(null);
    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
    if (originalInternal === undefined) {
      delete process.env.INTERNAL_API_URL;
    } else {
      process.env.INTERNAL_API_URL = originalInternal;
    }
  });

  it("uses NEXT_PUBLIC_API_URL when set", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/";
    expect(getMessagingSocketOrigin()).toBe("https://api.example.com");
  });

  it("falls back to INTERNAL_API_URL on the server", () => {
    vi.stubGlobal("window", undefined);
    delete process.env.NEXT_PUBLIC_API_URL;
    process.env.INTERNAL_API_URL = "http://127.0.0.1:4000";
    expect(getMessagingSocketOrigin()).toBe("http://127.0.0.1:4000");
    vi.unstubAllGlobals();
  });

  it("throws MobileApiUrlMissingError for Capacitor when env is unset", () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    setPlatformOverrideForTests("capacitor");
    expect(() => getMessagingSocketOrigin()).toThrow(MobileApiUrlMissingError);
  });

  it("uses explicit URL for mobile when env is set", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://10.0.2.2:3001";
    setPlatformOverrideForTests("capacitor");
    expect(getMessagingSocketOrigin()).toBe("http://10.0.2.2:3001");
  });
});

describe("acquireMessagingSocket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reconnectAttemptHandlerRef.current = null;
    disconnectHandlerRef.current = null;
    resolveMessagingAccessToken.mockResolvedValue("ws-access-token");
    resetMessagingSocketForTests();
  });

  afterEach(() => {
    resetMessagingSocketForTests();
  });

  it("configures socket.io reconnection with exponential backoff", () => {
    acquireMessagingSocket();

    expect(ioMock).toHaveBeenCalledWith(
      expect.stringContaining("/ws/messaging"),
      expect.objectContaining({
        path: "/socket.io",
        withCredentials: true,
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1_000,
        reconnectionDelayMax: 10_000,
        randomizationFactor: 0.5,
        transports: ["polling", "websocket"],
        upgrade: true,
      }),
    );
  });

  it("applies auth token before connect on first acquire", async () => {
    const socket = acquireMessagingSocket() as {
      auth: { token?: string };
      connect: ReturnType<typeof vi.fn>;
    };

    await vi.waitFor(() => {
      expect(resolveMessagingAccessToken).toHaveBeenCalled();
      expect(socket.auth.token).toBe("ws-access-token");
      expect(socket.connect).toHaveBeenCalled();
    });
  });

  it("connects with empty auth when no token is available", async () => {
    resolveMessagingAccessToken.mockResolvedValue(null);

    const socket = acquireMessagingSocket() as {
      auth: { token?: string };
      connect: ReturnType<typeof vi.fn>;
    };

    await vi.waitFor(() => {
      expect(socket.auth.token).toBeUndefined();
      expect(socket.connect).toHaveBeenCalled();
    });
  });

  it("updates auth from cache on reconnect_attempt", async () => {
    const socket = acquireMessagingSocket() as {
      auth: { token?: string };
    };

    await vi.waitFor(() => {
      expect(reconnectAttemptHandlerRef.current).toBeTruthy();
    });

    socket.auth = {};
    reconnectAttemptHandlerRef.current!();

    expect(socket.auth.token).toBe("cached-jwt");
  });

  it("recovers from io server disconnect with refresh and reconnect", async () => {
    resolveMessagingAccessToken
      .mockResolvedValueOnce("ws-access-token")
      .mockResolvedValueOnce("ws-access-refreshed");

    const socket = acquireMessagingSocket() as {
      auth: { token?: string };
      connect: ReturnType<typeof vi.fn>;
    };

    await vi.waitFor(() => {
      expect(disconnectHandlerRef.current).toBeTruthy();
    });

    socket.connect.mockClear();
    await disconnectHandlerRef.current!("io server disconnect");

    await vi.waitFor(() => {
      expect(resolveMessagingAccessToken).toHaveBeenCalledTimes(2);
      expect(socket.auth.token).toBe("ws-access-refreshed");
      expect(socket.connect).toHaveBeenCalled();
    });
  });

  it("notifies session revoked when server disconnect recovery cannot refresh", async () => {
    vi.mocked(notifyAuthSessionRevoked).mockClear();
    resolveMessagingAccessToken
      .mockResolvedValueOnce("ws-access-token")
      .mockRejectedValueOnce(new AuthRefreshError(401));

    acquireMessagingSocket();

    await vi.waitFor(() => {
      expect(disconnectHandlerRef.current).toBeTruthy();
    });

    await disconnectHandlerRef.current!("io server disconnect");

    await vi.waitFor(() => {
      expect(notifyAuthSessionRevoked).toHaveBeenCalledTimes(1);
    });
  });

  it("reuses one socket for multiple consumers", () => {
    const first = acquireMessagingSocket();
    const second = acquireMessagingSocket();

    expect(ioMock).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it("disconnects only when the last consumer releases (debounced)", async () => {
    vi.useFakeTimers();
    const socket = acquireMessagingSocket() as {
      connected: boolean;
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    };
    socket.connected = false;
    socket.connect = vi.fn();
    socket.disconnect = vi.fn();

    acquireMessagingSocket();
    releaseMessagingSocket();
    expect(socket.disconnect).not.toHaveBeenCalled();

    releaseMessagingSocket();
    expect(socket.disconnect).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(300);
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
