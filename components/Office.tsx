"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { OfficeMap } from "./OfficeMap";
import { IncomingKnockToast, OutgoingKnockToast } from "./KnockToast";
import { VideoCall } from "./VideoCall";
import { Id } from "@/convex/_generated/dataModel";

type Props = {
  sessionId: string;
  name: string;
  avatar: string;
  onLeave: () => void;
};

type CallState = {
  peerSessionId: string;
  peerName: string;
  isInitiator: boolean;
};

export function Office({ sessionId, name, avatar, onLeave }: Props) {
  const join = useMutation(api.presence.join);
  const heartbeat = useMutation(api.presence.heartbeat);
  const leave = useMutation(api.presence.leave);
  const sendKnock = useMutation(api.knocks.knock);
  const respondKnock = useMutation(api.knocks.respond);
  const removeKnock = useMutation(api.knocks.remove);

  const users = useQuery(api.presence.list) ?? [];
  const incomingKnocks = useQuery(api.knocks.incoming, { sessionId }) ?? [];
  const outgoingKnocks = useQuery(api.knocks.outgoing, { sessionId }) ?? [];

  const [pendingKnock, setPendingKnock] = useState<{
    toSessionId: string;
    toName: string;
  } | null>(null);
  const [activeCall, setActiveCall] = useState<CallState | null>(null);
  const handledOutgoing = useRef<Set<string>>(new Set());

  // Join + heartbeat lifecycle
  useEffect(() => {
    let alive = true;
    (async () => {
      await join({ sessionId, name, avatar });
    })();

    const hb = setInterval(() => {
      if (!alive) return;
      heartbeat({ sessionId }).catch(() => {});
    }, 5000);

    function handleUnload() {
      // Best-effort cleanup. If this doesn't reach the server in time
      // the row will auto-expire after the heartbeat timeout (15s) anyway.
      leave({ sessionId }).catch(() => {});
    }
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      alive = false;
      clearInterval(hb);
      window.removeEventListener("beforeunload", handleUnload);
      leave({ sessionId }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Watch for the recipient's response to our outgoing knock
  useEffect(() => {
    if (!pendingKnock) return;
    for (const k of outgoingKnocks) {
      if (k.toSessionId !== pendingKnock.toSessionId) continue;
      const id = k._id as unknown as string;
      if (handledOutgoing.current.has(id)) continue;

      if (k.status === "accepted") {
        handledOutgoing.current.add(id);
        setActiveCall({
          peerSessionId: pendingKnock.toSessionId,
          peerName: pendingKnock.toName,
          isInitiator: true,
        });
        setPendingKnock(null);
        removeKnock({ knockId: k._id as Id<"knocks"> }).catch(() => {});
      } else if (k.status === "declined") {
        handledOutgoing.current.add(id);
        setPendingKnock(null);
        removeKnock({ knockId: k._id as Id<"knocks"> }).catch(() => {});
      }
    }
  }, [outgoingKnocks, pendingKnock, removeKnock]);

  function knock(targetSessionId: string) {
    const target = users.find((u) => u.sessionId === targetSessionId);
    if (!target) return;
    if (activeCall) return;
    if (pendingKnock) return;

    setPendingKnock({ toSessionId: targetSessionId, toName: target.name });
    sendKnock({
      fromSessionId: sessionId,
      fromName: name,
      toSessionId: targetSessionId,
    }).catch(() => setPendingKnock(null));
  }

  async function acceptKnock(knockId: Id<"knocks">, fromSessionId: string, fromName: string) {
    await respondKnock({ knockId, accept: true });
    setActiveCall({
      peerSessionId: fromSessionId,
      peerName: fromName,
      isInitiator: false, // we're the answerer
    });
  }

  async function declineKnock(knockId: Id<"knocks">) {
    await respondKnock({ knockId, accept: false });
  }

  // Show only the most recent incoming knock if there are several
  const topIncoming = incomingKnocks[0];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-zinc-800 bg-zinc-950/70 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🏢</div>
            <div>
              <div className="font-semibold leading-tight">המשרד הדיגיטלי</div>
              <div className="text-xs text-zinc-400">טייסון</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1.5">
              <span className="text-lg">{avatar}</span>
              <span className="text-sm font-medium">{name}</span>
            </div>
            <button
              onClick={() => {
                leave({ sessionId }).catch(() => {});
                onLeave();
              }}
              className="text-sm text-zinc-400 hover:text-white transition"
            >
              צא
            </button>
          </div>
        </div>
      </header>

      {/* Office floor */}
      <main className="flex-1">
        <OfficeMap users={users} mySessionId={sessionId} onKnock={knock} />
      </main>

      {/* Incoming knock */}
      {topIncoming && !activeCall && (
        <IncomingKnockToast
          fromName={topIncoming.fromName}
          onAccept={() =>
            acceptKnock(
              topIncoming._id as Id<"knocks">,
              topIncoming.fromSessionId,
              topIncoming.fromName
            )
          }
          onDecline={() => declineKnock(topIncoming._id as Id<"knocks">)}
        />
      )}

      {/* Outgoing knock waiting */}
      {pendingKnock && !activeCall && (
        <OutgoingKnockToast toName={pendingKnock.toName} />
      )}

      {/* Video call */}
      {activeCall && (
        <VideoCall
          mySessionId={sessionId}
          peerSessionId={activeCall.peerSessionId}
          peerName={activeCall.peerName}
          isInitiator={activeCall.isInitiator}
          onHangup={() => setActiveCall(null)}
        />
      )}
    </div>
  );
}
