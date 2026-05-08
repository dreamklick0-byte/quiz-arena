import { PracticeExamTypeQuizClient } from "@/app/components/PracticeExamTypeQuizClient";

type PageProps = {
  params: Promise<{
    subject: string;
    examType: string;
  }>;
};

export default async function PracticeQuizPage({ params }: PageProps) {
  const { subject, examType } = await params;

  return (
    <PracticeExamTypeQuizClient
      subject={subject}
      examType={examType}
    />
  );
}

