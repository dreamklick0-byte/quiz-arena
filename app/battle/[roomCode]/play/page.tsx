import { normalizeRoomCode } from "@/app/battle/battleUtils";
import { BattlePlayClient } from "@/app/battle/[roomCode]/play/playClient";

type PageProps = {
  params: Promise<{ roomCode: string }>;
};

export default async function BattlePlayPage({ params }: PageProps) {
  const { roomCode } = await params;
  return <BattlePlayClient roomCode={normalizeRoomCode(roomCode)} />;
}

