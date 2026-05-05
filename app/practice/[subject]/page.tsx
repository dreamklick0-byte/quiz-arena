import { notFound } from "next/navigation";
import { PracticeQuizClient } from "@/app/components/PracticeQuizClient";
import {
  getQuestionsForSubject,
  getSubjectMeta,
} from "@/app/data/practiceQuestions";

type PageProps = {
  params: Promise<{ subject: string }>;
};

export default async function PracticeSubjectPage({ params }: PageProps) {
  const { subject } = await params;
  const meta = getSubjectMeta(subject);
  const questions = getQuestionsForSubject(subject);

  if (!meta || !questions || questions.length < 10) {
    notFound();
  }

  return (
    <PracticeQuizClient subjectTitle={meta.title} questions={questions} />
  );
}
