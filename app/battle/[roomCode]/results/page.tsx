import { normalizeRoomCode } from "@/app/battle/battleUtils";
import { ResultsClient } from "@/app/battle/[roomCode]/results/resultsClient";

type PageProps = {
  params: Promise<{ roomCode: string }>;
};

export default async function BattleResultsPage({ params }: PageProps) {
  const { roomCode } = await params;
  return <ResultsClient roomCode={normalizeRoomCode(roomCode)} />;
}

