"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { VideoPeer, getLocalMedia } from "@/lib/webrtc";
import { Id } from "@/convex/_generated/dataModel";

type Props = {
  mySessionId: string;
  peerSessionId: string;
  peerName: string;
  isInitiator: boolean;
  onHangup: () => void;
};

export function VideoCall({
  mySessionId,
  peerSessionId,
  peerName,
  isInitiator,
  onHangup,
}: Props) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<VideoPeer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const handledSignals = useRef<Set<string>>(new Set());

  const [status, setStatus] = useState<"connecting" | "connected" | "ended">(
    "connecting"
  );
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendSignal = useMutation(api.signals.send);
  const consumeSignal = useMutation(api.signals.consume);
  const clearSignals = useMutation(api.signals.clearBetween);
  const setInCall = useMutation(api.presence.setInCall);
  const incomingSignals = useQuery(api.signals.incoming, {
    sessionId: mySessionId,
  });

  // Set up the peer connection on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stream = await getLocalMedia();
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const peer = new VideoPeer(stream, isInitiator, {
          onRemoteStream: (remote) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remote;
            }
          },
          onConnected: () => setStatus("connected"),
          onDisconnected: () => {
            setStatus("ended");
          },
          sendSignal: (type, payload) =>
            sendSignal({
              fromSessionId: mySessionId,
              toSessionId: peerSessionId,
              type,
              payload,
            }),
        });
        peerRef.current = peer;

        await setInCall({ sessionId: mySessionId, peerSessionId });
        await peer.start();
      } catch (e) {
        console.error(e);
        setError("לא הצלחנו לפתוח מצלמה/מיקרופון. בדוק הרשאות.");
      }
    })();

    return () => {
      cancelled = true;
      peerRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      setInCall({ sessionId: mySessionId, peerSessionId: null });
      clearSignals({ sessionA: mySessionId, sessionB: peerSessionId });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerSessionId]);

  // Apply incoming signals
  useEffect(() => {
    if (!incomingSignals || !peerRef.current) return;
    for (const s of incomingSignals) {
      const id = s._id as unknown as string;
      if (handledSignals.current.has(id)) continue;
      if (s.fromSessionId !== peerSessionId) continue;
      handledSignals.current.add(id);
      peerRef.current.handleSignal(s.type, s.payload);
      if (s.type === "hangup") {
        setStatus("ended");
      }
      // Consume so it doesn't pile up
      consumeSignal({ signalId: s._id as Id<"signals"> }).catch(() => {});
    }
  }, [incomingSignals, peerSessionId, consumeSignal]);

  function hangup() {
    sendSignal({
      fromSessionId: mySessionId,
      toSessionId: peerSessionId,
      type: "hangup",
      payload: "",
    }).catch(() => {});
    peerRef.current?.close();
    onHangup();
  }

  function toggleMute() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }

  function toggleVideo() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !videoOff;
    stream.getVideoTracks().forEach((t) => (t.enabled = !next));
    setVideoOff(next);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-10">
        <div className="bg-black/60 backdrop-blur rounded-full px-4 py-2 text-sm">
          {status === "connecting" && "מתחבר..."}
          {status === "connected" && `בשיחה עם ${peerName}`}
          {status === "ended" && "השיחה הסתיימה"}
        </div>
      </div>

      {/* Remote video - main */}
      <div className="flex-1 relative flex items-center justify-center">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="max-h-full max-w-full"
        />
        {status !== "connected" && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-pulse">📞</div>
              <div className="text-lg">
                {status === "connecting"
                  ? `מתחבר ל${peerName}...`
                  : "השיחה הסתיימה"}
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="bg-rose-900/60 border border-rose-700 rounded-2xl p-6 max-w-md text-center">
              <div className="text-2xl mb-2">⚠️</div>
              <div>{error}</div>
            </div>
          </div>
        )}
      </div>

      {/* Local video - corner */}
      <div className="absolute bottom-24 right-4 w-40 sm:w-56 aspect-video bg-zinc-900 rounded-xl overflow-hidden border-2 border-zinc-700 shadow-xl">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {videoOff && (
          <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center text-zinc-500">
            <div>📷 כבוי</div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="pb-8 pt-4 flex items-center justify-center gap-3">
        <button
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition ${
            muted
              ? "bg-rose-500 hover:bg-rose-400"
              : "bg-zinc-800 hover:bg-zinc-700"
          }`}
        >
          {muted ? "🔇" : "🎤"}
        </button>
        <button
          onClick={toggleVideo}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition ${
            videoOff
              ? "bg-rose-500 hover:bg-rose-400"
              : "bg-zinc-800 hover:bg-zinc-700"
          }`}
        >
          {videoOff ? "📷" : "📹"}
        </button>
        <button
          onClick={hangup}
          className="px-6 h-14 rounded-full bg-rose-500 hover:bg-rose-400 transition flex items-center gap-2 font-semibold text-white"
        >
          <span className="text-2xl">📞</span>
          <span>נתק</span>
        </button>
      </div>
    </div>
  );
}
