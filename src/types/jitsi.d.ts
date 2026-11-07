export interface JitsiParticipant {
  id: string;
  displayName?: string;
  avatarURL?: string;
}

export interface JitsiErrorEvent {
  type: string;
  message: string;
}

export interface JitsiMeetingRoomProps {
  roomId: string;
  user: {
    displayName: string;
    email?: string;
  };
  active?: boolean;
  jwt?: string;
  onReady?: () => void;
  onParticipantJoined?: (p: { id: string; displayName: string }) => void;
  onParticipantLeft?: (p: { id: string }) => void;
  onHangup?: () => void;
  onError?: (err: Error | JitsiErrorEvent) => void;
}

export interface JitsiMeetingRoomHandle {
  leave: () => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

