import type { LucideProps } from 'lucide-react';

export interface Attachment {
  name: string;
  type: string;
  content: string; // base64 encoded data URL
}

// New type for question answer values
export type AnswerValue = string | string[] | boolean | null;

// Updated Answer interface
export interface Answer {
  value: AnswerValue;
  evidence: string;
  attachment?: Attachment;
}

export interface AnswersState {
  [key: string]: Answer;
}

// Updated Question interface
export type QuestionType = 'text_block' | 'text' | 'single_choice' | 'multiple_choice' | 'boolean';

export interface Question {
  id: string;
  topic: string;
  subtopic: string;
  text: string;
  type: QuestionType;
  options?: string[]; // For single_choice and multiple_choice
  evidence_prompt: string;
  reference: string;
  reference_text?: string;
  priority: 'imperative' | 'moderate' | 'non-priority';
}

export interface Topic {
  name: string;
  icon: React.FC<LucideProps>;
}

export interface SubtopicCompliance {
  name: string;
  compliance: number;
}

export interface TopicCompliance {
  topic: string;
  compliance: number;
  subtopics: SubtopicCompliance[];
}

export interface ReportData {
  allQuestions: Question[];
  deficiencies: Question[];
  allAnswers: AnswersState;
  companyName: string;
  answeredQuestions: number;
  totalQuestions: number;
  generatedAt: string;
  weightedCompliance: number;
  topicCompliance: TopicCompliance[];
}

export interface Folder {
  id: string;
  name: string;
}

export type QuestionnaireViewMode = 'detailed' | 'summary';

export interface Diagnosis {
    id: string;
    companyName: string;
    answers: AnswersState;
    reportData: ReportData | null;
    currentTopicName: string;
    viewMode: 'questionnaire' | 'report';
    questionnaireViewMode: QuestionnaireViewMode;
    lastUpdated: string;
    folderId: string | null;
}