import { useCallback, useEffect, useReducer } from 'react';
import {
  buildGameRound,
  calculateWordScore,
  CORRECT_TRANSITION_MS,
  DIFFICULTIES,
  MISSED_TRANSITION_MS,
  normalizeGameAnswer,
  STARTING_LIVES,
} from './gameConfig';

const initialState = {
  phase: 'ready',
  difficulty: 'normal',
  round: [],
  currentIndex: 0,
  answer: '',
  lives: STARTING_LIVES,
  score: 0,
  combo: 0,
  maxCombo: 0,
  correctCount: 0,
  wrongAttempts: 0,
  missedCount: 0,
  currentMistakes: 0,
  hintLevel: 0,
  usedHint: false,
  feedback: null,
  results: [],
  sessionId: 0,
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_DIFFICULTY':
      return state.phase === 'ready' ? { ...state, difficulty: action.value } : state;
    case 'START':
      return {
        ...initialState,
        phase: 'playing',
        difficulty: action.difficulty,
        round: action.words,
        sessionId: state.sessionId + 1,
      };
    case 'SET_ANSWER':
      return state.phase === 'playing' ? { ...state, answer: action.value.slice(0, 40) } : state;
    case 'APPEND_CHARACTER':
      return state.phase === 'playing' && state.answer.length < 40
        ? { ...state, answer: `${state.answer}${action.value.toLowerCase()}` }
        : state;
    case 'BACKSPACE':
      return state.phase === 'playing' ? { ...state, answer: state.answer.slice(0, -1) } : state;
    case 'SUBMIT': { // Validate inside the reducer so rapid Enter presses cannot resolve one word twice.
      if (state.phase !== 'playing') return state;
      const currentWord = state.round[state.currentIndex];
      const submitted = normalizeGameAnswer(state.answer);
      if (!currentWord || !submitted) return state;

      if (submitted !== normalizeGameAnswer(currentWord.word)) {
        const letterCount = (currentWord.word.match(/[a-z]/gi) || []).length;
        return {
          ...state,
          answer: '',
          combo: 0,
          wrongAttempts: state.wrongAttempts + 1,
          currentMistakes: state.currentMistakes + 1,
          hintLevel: Math.min(letterCount, Math.max(1, state.hintLevel + 1)),
          feedback: { type: 'wrong', id: Date.now() },
        };
      }

      const nextCombo = state.combo + 1;
      const earned = calculateWordScore({
        combo: nextCombo,
        difficulty: state.difficulty,
        usedHint: state.usedHint,
      });

      return {
        ...state,
        phase: 'transition',
        answer: '',
        score: state.score + earned,
        combo: nextCombo,
        maxCombo: Math.max(state.maxCombo, nextCombo),
        correctCount: state.correctCount + 1,
        feedback: { type: 'correct', points: earned, id: Date.now() },
        results: [...state.results, {
          ...currentWord,
          status: 'correct',
          needsReview: state.currentMistakes > 0 || state.usedHint,
        }],
      };
    }
    case 'MISS': {
      if (state.phase !== 'playing') return state;
      const currentWord = state.round[state.currentIndex];
      const lives = Math.max(0, state.lives - 1);
      return {
        ...state,
        phase: 'transition',
        answer: '',
        lives,
        combo: 0,
        missedCount: state.missedCount + 1,
        feedback: { type: 'missed', id: Date.now() },
        results: currentWord ? [...state.results, { ...currentWord, status: 'missed', needsReview: true }] : state.results,
      };
    }
    case 'NEXT':
      if (state.phase !== 'transition') return state;
      if (state.lives === 0 || state.currentIndex >= state.round.length - 1) {
        return { ...state, phase: 'complete' };
      }
      return {
        ...state,
        phase: 'playing',
        currentIndex: state.currentIndex + 1,
        answer: '',
        hintLevel: 0,
        usedHint: false,
        currentMistakes: 0,
        feedback: null,
      };
    case 'USE_HINT': {
      if (state.phase !== 'playing') return state;
      const currentWord = state.round[state.currentIndex];
      const letterCount = (currentWord?.word.match(/[a-z]/gi) || []).length;
      if (!letterCount || state.hintLevel >= letterCount) return state;
      return {
        ...state,
        hintLevel: Math.min(letterCount, state.hintLevel + 1),
        usedHint: true,
        score: Math.max(0, state.score - 20),
        feedback: { type: 'hint', id: Date.now() },
      };
    }
    case 'CLEAR_FEEDBACK':
      return state.phase === 'playing' ? { ...state, feedback: null } : state;
    case 'PAUSE':
      return state.phase === 'playing' ? { ...state, phase: 'paused' } : state;
    case 'RESUME':
      return state.phase === 'paused' ? { ...state, phase: 'playing' } : state;
    case 'QUIT':
      return { ...initialState, difficulty: state.difficulty, sessionId: state.sessionId };
    default:
      return state;
  }
}

export function useWordRocketGame(words) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const difficulty = DIFFICULTIES.find((item) => item.id === state.difficulty) || DIFFICULTIES[1];
  const currentWord = state.round[state.currentIndex] || null;

  useEffect(() => {
    if (state.phase !== 'transition') return undefined;
    const transitionMs = state.feedback?.type === 'correct'
      ? CORRECT_TRANSITION_MS
      : MISSED_TRANSITION_MS;
    const timer = window.setTimeout(() => dispatch({ type: 'NEXT' }), transitionMs);
    return () => window.clearTimeout(timer);
  }, [state.feedback?.id, state.feedback?.type, state.phase]);

  useEffect(() => {
    if (state.phase !== 'playing' || !['wrong', 'hint'].includes(state.feedback?.type)) return undefined;
    const timer = window.setTimeout(() => dispatch({ type: 'CLEAR_FEEDBACK' }), 1100);
    return () => window.clearTimeout(timer);
  }, [state.feedback?.id, state.feedback?.type, state.phase]);

  const start = useCallback((difficultyId = state.difficulty) => {
    const round = buildGameRound(words);
    if (round.length === 0) return;
    dispatch({ type: 'START', difficulty: difficultyId, words: round });
  }, [state.difficulty, words]);

  return {
    state,
    difficulty,
    currentWord,
    start,
    setDifficulty: (value) => dispatch({ type: 'SET_DIFFICULTY', value }),
    setAnswer: (value) => dispatch({ type: 'SET_ANSWER', value }),
    appendCharacter: (value) => dispatch({ type: 'APPEND_CHARACTER', value }),
    backspace: () => dispatch({ type: 'BACKSPACE' }),
    submit: () => dispatch({ type: 'SUBMIT' }),
    miss: () => dispatch({ type: 'MISS' }),
    useHint: () => dispatch({ type: 'USE_HINT' }),
    pause: () => dispatch({ type: 'PAUSE' }),
    resume: () => dispatch({ type: 'RESUME' }),
    quit: () => dispatch({ type: 'QUIT' }),
  };
}
