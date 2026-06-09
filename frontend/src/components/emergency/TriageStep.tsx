import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import {
  setTriageAnswer,
  setTriageRoute,
  closeEmergency,
} from '@/features/emergency/emergencySlice';
import {
  TRIAGE_QUESTIONS,
  resolveTriageRoute,
  type TriageAnswers,
} from '@/features/emergency/triage';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export function TriageStep() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { triage, triageQuestionIndex } = useAppSelector((s) => s.emergency);

  const current = TRIAGE_QUESTIONS[triageQuestionIndex];
  const progress = ((triageQuestionIndex + (current ? 0 : 1)) / TRIAGE_QUESTIONS.length) * 100;

  useEffect(() => {
    const route = resolveTriageRoute(triage);
    if (route && triageQuestionIndex >= TRIAGE_QUESTIONS.length) {
      dispatch(setTriageRoute(route));
      if (route === 'escort') {
        dispatch(closeEmergency());
        navigate('/transport/book');
      } else if (route === 'teleconsult') {
        dispatch(closeEmergency());
        navigate('/live-checkup', { state: { fromTriage: true, triage } });
      }
    }
  }, [triage, triageQuestionIndex, dispatch, navigate]);

  if (!current) {
    const route = resolveTriageRoute(triage);
    if (route === 'sos') return null;
    return (
      <div className="flex items-center justify-center flex-1 p-8">
        <p className="text-xl text-white">Preparing next step...</p>
      </div>
    );
  }

  const handleAnswer = (value: string) => {
    dispatch(setTriageAnswer({ key: current.id, value }));
    const nextAnswers = { ...triage, [current.id]: value } as TriageAnswers;
    if (triageQuestionIndex === TRIAGE_QUESTIONS.length - 1) {
      const route = resolveTriageRoute(nextAnswers);
      if (route) {
        dispatch(setTriageRoute(route));
        if (route === 'escort') {
          dispatch(closeEmergency());
          navigate('/transport/book', { state: { triage: nextAnswers } });
        } else if (route === 'teleconsult') {
          dispatch(closeEmergency());
          navigate('/live-checkup', { state: { fromTriage: true, triage: nextAnswers } });
        }
      }
    }
  };

  return (
    <div className="flex flex-col flex-1 p-6 sm:p-8 max-w-2xl mx-auto w-full">
      <div className="mb-8">
        <div className="flex justify-between text-white/90 text-lg mb-2">
          <span>Question {triageQuestionIndex + 1} of {TRIAGE_QUESTIONS.length}</span>
        </div>
        <div className="h-3 bg-red-900/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-500 ease-out rounded-full"
            style={{ width: `${Math.max(8, progress)}%` }}
          />
        </div>
      </div>

      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-10 leading-snug">
        {current.question}
      </h2>

      <div className="space-y-4 flex-1">
        {current.options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleAnswer(opt.value)}
            className={cn(
              'w-full min-h-[56px] sm:min-h-[64px] px-6 py-4 rounded-2xl text-xl font-semibold',
              'bg-white text-red-800 hover:bg-red-50 active:scale-[0.98] transition-all',
              'border-2 border-transparent focus:outline-none focus:ring-4 focus:ring-white/50'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
