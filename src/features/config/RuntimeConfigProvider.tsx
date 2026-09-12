import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getPublicRuntimeConfig,
  type PublicRuntimeConfig,
} from "../../services/config/runtimeConfig";

type RuntimeConfigContextValue = {
  config: PublicRuntimeConfig | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const RuntimeConfigContext =
  createContext<RuntimeConfigContextValue | null>(
    null,
  );

export function RuntimeConfigProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [config, setConfig] =
    useState<PublicRuntimeConfig | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  async function load(
    forceRefresh = false,
  ) {
    try {
      setLoading(true);
      setError(null);

      const value =
        await getPublicRuntimeConfig(
          forceRefresh,
        );

      setConfig(value);
    } catch (loadError) {
      console.error(
        "Unable to load ViewBid runtime configuration:",
        loadError,
      );

      setError(
        "Unable to load runtime configuration.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const value = useMemo(
    () => ({
      config,
      loading,
      error,
      refresh: async () => {
        await load(true);
      },
    }),
    [
      config,
      loading,
      error,
    ],
  );

  return (
    <RuntimeConfigContext.Provider
      value={value}
    >
      {children}
    </RuntimeConfigContext.Provider>
  );
}

export function useRuntimeConfig() {
  const value =
    useContext(RuntimeConfigContext);

  if (!value) {
    throw new Error(
      "useRuntimeConfig must be used inside RuntimeConfigProvider",
    );
  }

  return value;
}
