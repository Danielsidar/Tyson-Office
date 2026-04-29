// Lightweight WebRTC peer wrapper that uses Convex as the signaling channel.
// One peer is the "initiator" - it creates the offer. The other one answers.

// STUN handles the easy NAT cases. TURN is the fallback when both peers are
// behind symmetric / restrictive NATs and can't reach each other directly.
// These OpenRelay TURN servers are public/free and meant for testing — fine
// for an internal team, swap for self-hosted coturn or Twilio if usage grows.
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

export type SignalSender = (
  type: "offer" | "answer" | "ice" | "hangup",
  payload: string
) => void | Promise<unknown>;

export type PeerHandlers = {
  onRemoteStream: (stream: MediaStream) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  sendSignal: SignalSender;
};

export class VideoPeer {
  pc: RTCPeerConnection;
  localStream: MediaStream;
  isInitiator: boolean;
  handlers: PeerHandlers;
  closed = false;

  constructor(
    localStream: MediaStream,
    isInitiator: boolean,
    handlers: PeerHandlers
  ) {
    this.localStream = localStream;
    this.isInitiator = isInitiator;
    this.handlers = handlers;

    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Push local audio/video tracks to the peer
    for (const track of localStream.getTracks()) {
      this.pc.addTrack(track, localStream);
    }

    // Forward remote tracks to caller
    this.pc.ontrack = (e) => {
      if (e.streams && e.streams[0]) {
        handlers.onRemoteStream(e.streams[0]);
      }
    };

    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        handlers.sendSignal("ice", JSON.stringify(e.candidate.toJSON()));
      }
    };

    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState;
      console.log("[VideoPeer] connectionState ->", state);
      if (state === "connected") handlers.onConnected?.();
      if (state === "failed" || state === "disconnected" || state === "closed") {
        handlers.onDisconnected?.();
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      console.log(
        "[VideoPeer] iceConnectionState ->",
        this.pc.iceConnectionState
      );
    };
  }

  async start() {
    if (!this.isInitiator) return;
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await this.handlers.sendSignal("offer", JSON.stringify(offer));
  }

  async handleSignal(type: string, payload: string) {
    if (this.closed) return;
    try {
      if (type === "offer") {
        await this.pc.setRemoteDescription(
          new RTCSessionDescription(JSON.parse(payload))
        );
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        await this.handlers.sendSignal("answer", JSON.stringify(answer));
      } else if (type === "answer") {
        await this.pc.setRemoteDescription(
          new RTCSessionDescription(JSON.parse(payload))
        );
      } else if (type === "ice") {
        await this.pc.addIceCandidate(new RTCIceCandidate(JSON.parse(payload)));
      } else if (type === "hangup") {
        this.close();
        this.handlers.onDisconnected?.();
      }
    } catch (err) {
      console.error("[VideoPeer] handleSignal error", err);
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.pc.getSenders().forEach((s) => s.track?.stop());
    try {
      this.pc.close();
    } catch {}
  }
}

export async function getLocalMedia(): Promise<MediaStream> {
  return await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480 },
    audio: true,
  });
}
