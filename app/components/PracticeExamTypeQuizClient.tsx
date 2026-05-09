'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { safeRecordDailyActivity } from '@/lib/activityRpc'

const supabase = getSupabaseClient()

type Question = {
  id: string
  subject: string
  exam_type: string
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  explanation: string
  year: number
}

type Props = { subject: string; examType: string }

export function PracticeExamTypeQuizClient({ subject, examType }: Props) {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [finished, setFinished] = useState(false)
  const [answers, setAnswers] = useState<string[]>([])

  const currentQuestionId = questions[current]?.id
  const decodedSubject = decodeURIComponent(subject)
  const decodedExamType = decodeURIComponent(examType)

  function toTitleCase(value: string) {
    const normalized = value.replace(/[_-]+/g, ' ').trim()
    return normalized
      .split(/\s+/g)
      .filter(Boolean)
      .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
  }

  function formatExamTypeLabel(value: string) {
    const v = value.trim()
    if (/^[A-Z]{2,6}$/.test(v)) return v
    return toTitleCase(v)
  }

  useEffect(() => {
    if (!finished) return;
    void safeRecordDailyActivity();
  }, [finished]);

  useEffect(() => {
    async function fetchQuestions() {
      setLoading(true)
      setError('')
      const subjectLower = subject.toLowerCase()
      const isCurrentAffairs = subjectLower === 'current_affairs'
      const decodedExamType = decodeURIComponent(examType)
      const examTypeFilter = isCurrentAffairs ? decodedExamType : decodedExamType.toUpperCase()
      const { data, error: err } = await supabase
        .from('questions')
        .select('*')
        .eq('subject', subjectLower)
        .eq('exam_type', examTypeFilter)
        .limit(50)
      if (err) {
        setError('Failed to load questions: ' + err.message)
        setLoading(false)
        return
      }
      if (!data || data.length === 0) {
        setError(`No questions found for ${subject} (${examTypeFilter}). Please add questions in the admin panel.`)
        setLoading(false)
        return
      }
      const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, Math.min(10, data.length))
      setQuestions(shuffled)
      setLoading(false)
    }
    fetchQuestions()
  }, [subject, examType])

  const handleAnswer = useCallback((answer: string) => {
    if (selected !== null) return
    setSelected(answer)
    const correct = questions[current]?.correct_answer
    const isCorrect = answer === correct
    if (isCorrect) setScore(s => s + 1)
    setAnswers(prev => [...prev, answer])
  }, [current, questions, selected])
  useEffect(() => {
    if (loading || finished || selected !== null) return
    const TIMER_SECONDS = 30
    const start = Date.now()
    const id = window.setInterval(() => {
      const elapsed = (Date.now() - start) / 1000
      const left = Math.max(0, TIMER_SECONDS - elapsed)
      setTimeLeft(left)
      if (left <= 0) {
        window.clearInterval(id)
        handleAnswer('timeout')
      }
    }, 200)
    return () => window.clearInterval(id)
  }, [loading, finished, selected, current, currentQuestionId, handleAnswer])

  useEffect(() => {
    const resetTimeout = setTimeout(() => {
      setTimeLeft(30)
      setSelected(null)
    }, 0)
    return () => clearTimeout(resetTimeout)
  }, [current])
  function nextQuestion() {
    if (current + 1 >= questions.length) {
      setFinished(true)
    } else {
      setCurrent(c => c + 1)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
        <p style={{ color: '#888' }}>Loading questions...</p>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', padding: '24px' }}>
      <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: '12px', padding: '32px', maxWidth: '500px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>😕</div>
        <h2 style={{ marginBottom: '8px' }}>Couldn&apos;t load quiz</h2>
        <p style={{ color: '#f87171', marginBottom: '24px' }}>{error}</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={() => window.location.reload()} style={{ padding: '12px 24px', background: '#7c3aed', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 700 }}>Try Again</button>
          <button onClick={() => router.back()} style={{ padding: '12px 24px', background: 'transparent', border: '1px solid #444', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>Change Exam Type</button>
        </div>
      </div>
    </div>
  )

  if (finished) {
    const percentage = Math.round((score / questions.length) * 100)
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f1a', color: 'white', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ maxWidth: '600px', width: '100%', paddingTop: '40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>{percentage >= 60 ? '🏆' : '📚'}</div>
            <h1 style={{ fontSize: '36px', fontWeight: 900, marginBottom: '8px' }}>{score}/{questions.length}</h1>
            <p style={{ fontSize: '24px', color: percentage >= 60 ? '#f59e0b' : '#888' }}>{percentage}%</p>
            <p style={{ color: '#888', marginTop: '8px' }}>{subject.toUpperCase()} • {examType.toUpperCase()}</p>
          </div>
          {percentage >= 60 && (
            <button onClick={() => router.push('/battle')} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #7c3aed, #4f1d96)', border: 'none', borderRadius: '12px', color: 'white', fontSize: '18px', fontWeight: 800, cursor: 'pointer', marginBottom: '12px' }}>
              ⚔️ Join Live Battle
            </button>
          )}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
            <button onClick={() => { setCurrent(0); setScore(0); setFinished(false); setAnswers([]); }} style={{ flex: 1, padding: '14px', background: '#1a1a2e', border: '1px solid #333', borderRadius: '12px', color: 'white', cursor: 'pointer', fontWeight: 700 }}>Try Again</button>
            <button onClick={() => router.push('/')} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #333', borderRadius: '12px', color: 'white', cursor: 'pointer' }}>Back to Home</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {questions.map((q, i) => (
              <div key={q.id} style={{ background: '#1a1a2e', borderRadius: '12px', padding: '16px', border: `1px solid ${answers[i] === q.correct_answer ? '#10b981' : '#ef4444'}` }}>
                <p style={{ marginBottom: '8px', fontSize: '14px' }}>{i + 1}. {q.question}</p>
                <p style={{ color: '#10b981', fontSize: '13px' }}>✓ Correct: {q.correct_answer} — {q[`option_${q.correct_answer.toLowerCase()}` as keyof Question]}</p>
                {q.explanation && <p style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>{q.explanation}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const q = questions[current]
  const options = [
    { key: 'A', text: q.option_a },
    { key: 'B', text: q.option_b },
    { key: 'C', text: q.option_c },
    { key: 'D', text: q.option_d },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', color: 'white', padding: '24px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingTop: '16px' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>← Back</button>
          <span style={{ color: '#7c3aed', fontWeight: 700 }}>
            {toTitleCase(decodedSubject)} • {formatExamTypeLabel(decodedExamType)}
          </span>
          <span style={{ color: '#888' }}>{current + 1}/{questions.length}</span>
        </div>

        <div style={{ background: '#1a1a2e', borderRadius: '8px', height: '6px', marginBottom: '8px' }}>
          <div style={{ height: '100%', borderRadius: '8px', background: timeLeft > 15 ? '#10b981' : timeLeft > 7 ? '#f59e0b' : '#ef4444', width: `${(timeLeft / 30) * 100}%`, transition: 'width 1s linear' }} />
        </div>
        <div style={{ textAlign: 'right', color: '#888', fontSize: '13px', marginBottom: '24px' }}>{Math.ceil(timeLeft)}s</div>

        <div style={{ background: '#1a1a2e', borderRadius: '16px', padding: '28px', marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', color: '#7c3aed', marginBottom: '12px', fontWeight: 600 }}>QUESTION {current + 1}</p>
          <p style={{ fontSize: '18px', lineHeight: '1.6', fontWeight: 600 }}>{q.question}</p>
          {q.year && <p style={{ color: '#555', fontSize: '12px', marginTop: '8px' }}>Year: {q.year}</p>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          {options.map(opt => {
            let bg = '#1a1a2e'
            let border = '1px solid #333'
            if (selected !== null) {
              if (opt.key === q.correct_answer) { bg = 'rgba(16,185,129,0.2)'; border = '1px solid #10b981' }
              else if (opt.key === selected && selected !== q.correct_answer) { bg = 'rgba(239,68,68,0.2)'; border = '1px solid #ef4444' }
            }
            return (
              <button key={opt.key} onClick={() => handleAnswer(opt.key)} disabled={selected !== null}
                style={{ padding: '16px', background: bg, border, borderRadius: '12px', color: 'white', cursor: selected !== null ? 'default' : 'pointer', textAlign: 'left', fontSize: '15px', transition: 'all 0.2s' }}>
                <span style={{ color: '#7c3aed', fontWeight: 700, marginRight: '8px' }}>{opt.key}.</span>{opt.text}
              </button>
            )
          })}
        </div>

        {selected !== null && (
          <div style={{ marginBottom: '16px' }}>
            {q.explanation && <div style={{ background: '#1a1a2e', borderRadius: '12px', padding: '16px', marginBottom: '12px', borderLeft: '3px solid #7c3aed' }}>
              <p style={{ color: '#aaa', fontSize: '14px' }}>💡 {q.explanation}</p>
            </div>}
            <button onClick={nextQuestion} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #7c3aed, #4f1d96)', border: 'none', borderRadius: '12px', color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>
              {current + 1 >= questions.length ? 'See Results 🏆' : 'Next Question →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
