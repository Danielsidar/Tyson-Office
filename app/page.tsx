"use client";

import { useEffect, useState } from "react";
import { EntryScreen } from "@/components/EntryScreen";
import { Office } from "@/components/Office";

type Identity = {
  sessionId: string;
  name: string;
  avatar: string;
};

const STORAGE_KEY = "tyson-office-identity";

export default function Home() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Identity;
        if (parsed?.sessionId && parsed.name) {
          setIdentity(parsed);
        }
      }
    } catch {}
    setHydrated(true);
  }, []);

  function enter(name: string, avatar: string) {
    const sessionId =
      crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
    const id: Identity = { sessionId, name, avatar };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(id));
    setIdentity(id);
  }

  function leave() {
    sessionStorage.removeItem(STORAGE_KEY);
    setIdentity(null);
  }

  if (!hydrated) return null;

  if (!identity) {
    return <EntryScreen onEnter={enter} />;
  }

  return (
    <Office
      sessionId={identity.sessionId}
      name={identity.name}
      avatar={identity.avatar}
      onLeave={leave}
    />
  );
}
