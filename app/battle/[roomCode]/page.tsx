import { normalizeRoomCode } from "@/app/battle/battleUtils";
import { WaitingRoomClient } from "@/app/battle/[roomCode]/waitingRoomClient";

type PageProps = {
  params: Promise<{ roomCode: string }>;
};

export default async function WaitingRoomPage({ params }: PageProps) {
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
      <WaitingRoomClient roomCode={normalizeRoomCode(roomCode)} />
    </div>
  );
}

