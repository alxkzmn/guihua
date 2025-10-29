export type RawQuestion = {
  number: number;
  text: string;
  answers: Record<string, string>;
  correct: number;
};

export type QuizAnswer = {
  id: string;
  text: string;
};

export type QuizQuestion = {
  number: number;
  text: string;
  answers: QuizAnswer[];
  correctIndex: number;
};

export type Stats = {
  perQuestionSeen: Record<number, number>;
  perQuestionCorrect: Record<number, number>;
  totalAttempts: number;
  totalCorrect: number;
};


