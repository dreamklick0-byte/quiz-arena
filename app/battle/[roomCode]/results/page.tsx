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
          "linear-gradient(to bottom right, #4a00e0, #8e2de2)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <ResultsClient roomCode={normalizeRoomCode(roomCode)} />
    </div>
  );
}

