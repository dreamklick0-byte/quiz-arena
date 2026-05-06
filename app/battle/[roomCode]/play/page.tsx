import { normalizeRoomCode } from "@/app/battle/battleUtils";
import { BattlePlayClient } from "@/app/battle/[roomCode]/play/playClient";

type PageProps = {
  params: Promise<{ roomCode: string }>;
};

export default async function BattlePlayPage({ params }: PageProps) {
  const { roomCode } = await params;
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage:
          "linear-gradient(rgba(15,15,26,0.92), rgba(15,15,26,0.92)), url(https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=1600)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <BattlePlayClient roomCode={normalizeRoomCode(roomCode)} />
    </div>
  );
}

