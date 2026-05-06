import { normalizeRoomCode } from "@/app/battle/battleUtils";
import { ResultsClient } from "@/app/battle/[roomCode]/results/resultsClient";

type PageProps = {
  params: Promise<{ roomCode: string }>;
};

export default async function BattleResultsPage({ params }: PageProps) {
  const { roomCode } = await params;
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage:
          "linear-gradient(rgba(15,15,26,0.90), rgba(15,15,26,0.90)), url(https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=1600)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <ResultsClient roomCode={normalizeRoomCode(roomCode)} />
    </div>
  );
}

