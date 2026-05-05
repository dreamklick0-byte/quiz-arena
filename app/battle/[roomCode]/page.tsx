import { normalizeRoomCode } from "@/app/battle/battleUtils";
import { WaitingRoomClient } from "@/app/battle/[roomCode]/waitingRoomClient";

type PageProps = {
  params: Promise<{ roomCode: string }>;
};

export default async function WaitingRoomPage({ params }: PageProps) {
  const { roomCode } = await params;
  return <WaitingRoomClient roomCode={normalizeRoomCode(roomCode)} />;
}

