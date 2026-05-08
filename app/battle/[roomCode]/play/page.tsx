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
          "linear-gradient(to bottom right, #4a00e0, #8e2de2)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <BattlePlayClient roomCode={normalizeRoomCode(roomCode)} />
    </div>
  );
}

