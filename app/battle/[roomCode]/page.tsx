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
          "linear-gradient(rgba(15,15,26,0.92), rgba(15,15,26,0.92)), url(https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1600)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <WaitingRoomClient roomCode={normalizeRoomCode(roomCode)} />
    </div>
  );
}

