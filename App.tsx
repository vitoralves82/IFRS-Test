import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import {
  Users,
  Target,
  GitMerge,
  FileCheck2,
  TrendingUp,
  ShieldAlert,
  Gauge,
  LucideProps,
} from 'lucide-react';

import MainSidebar from './components/MainSidebar';
import Questionnaire from './components/Questionnaire';
import Sidebar from './components/Sidebar';
import WelcomeScreen from './components/WelcomeScreen';
import Report from './components/Report';
import SavedReports from './components/SavedReports';
import QuestionnaireControls from './components/QuestionnaireControls';
import ConsultantArea from './components/ConsultantArea';

import { ALL_QUESTIONS } from './constants/questions';
import type { AnswersState, Answer, Question, Topic, Diagnosis, ReportData, Folder, TopicCompliance, SubtopicCompliance, AnswerValue, QuestionnaireViewMode, QuestionType, AiCheckResult } from './types';


const TOPIC_ICONS: { [key: string]: React.FC<LucideProps> } = {
  'Requisitos Gerais': FileCheck2,
  'Governança': Users,
  'Estratégia': TrendingUp,
  'Gestão de Riscos': ShieldAlert,
  'Métricas e Metas': Gauge,
  'Fontes de Orientação e Conformidade': GitMerge,
};

const uniqueTopics = [...new Set(ALL_QUESTIONS.map(q => q.topic))];
const APP_TOPICS: Topic[] = uniqueTopics.map((topicName: string) => ({
    name: topicName,
    icon: TOPIC_ICONS[topicName] || FileCheck2,
}));

const STORAGE_KEY = 'ifrs-diagnoses-storage-v4';

type View = 'diagnosis' | 'saved_reports' | 'consultant_area';
type FilterStatus = 'all' | 'answered' | 'unanswered';


export const isAnswerProvided = (answer: Answer | undefined): boolean => {
    return !!answer?.confirmed;
};

export const formatAnswerForPrompt = (value: AnswerValue, type: QuestionType): string => {
    if (value === null) return "Não aplicável.";
    if (value === undefined) return "Não respondido.";
    switch (type) {
        case 'boolean':
            return value ? "Verdadeiro" : "Falso";
        case 'multiple_choice':
            return (value as string[]).join(', ');
        default:
            return String(value);
    }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]); // remove data url prefix
    reader.onerror = error => reject(error);
  });
};

const performAiCheck = async (question: Question, answer: Answer): Promise<AiCheckResult | null> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                status: { type: Type.STRING, description: 'Avaliação da resposta. Valores: "sufficient", "insufficient", "partial".' },
                feedback: { type: Type.STRING, description: 'Justificativa para a avaliação.' },
            },
            required: ['status', 'feedback'],
        };
        const promptText = `Você é um consultor especialista em conformidade IFRS. Sua tarefa é analisar se uma resposta e sua evidência são suficientes para atender a uma pergunta.
- Pergunta: "${question.text}"
- Resposta: "${formatAnswerForPrompt(answer.value, question.type)}"
- Evidência: "${answer.evidence}"
Avalie se a resposta atende à pergunta. Status pode ser 'sufficient', 'insufficient', ou 'partial'. Forneça a avaliação em JSON.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', contents: promptText,
            config: { responseMimeType: 'application/json', responseSchema, temperature: 0.1 }
        });
        const result = JSON.parse(response.text.trim());
        return result as AiCheckResult;
    } catch (error) {
        console.error(`Error with AI Check for question ${question.id}:`, error);
        return null;
    }
};


const App: React.FC = () => {
    const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [activeDiagnosisId, setActiveDiagnosisId] = useState<string | null>(null);
    const [view, setView] = useState<View>('saved_reports');
    const [isSending, setIsSending] = useState<boolean>(false);
    const [isAnalyzingReport, setIsAnalyzingReport] = useState<boolean>(false);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeReportTab, setActiveReportTab] = useState<'overview' | 'summary'>('overview');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const resetFilters = useCallback(() => {
        setFilterStatus('all');
        setSearchQuery('');
    }, []);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const { diagnoses: savedDiagnoses, folders: savedFolders } = JSON.parse(saved) as { diagnoses: Diagnosis[], folders: Folder[] };
                setDiagnoses(savedDiagnoses || []);
                setFolders(savedFolders || []);
            }
        } catch (e) {
            console.error("Failed to load data from storage", e);
            setDiagnoses([]);
            setFolders([]);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ diagnoses, folders }));
        } catch (e) {
            console.error("Failed to save data to storage", e);
        }
    }, [diagnoses, folders]);

    const activeDiagnosis = useMemo(() => {
        return diagnoses.find(d => d.id === activeDiagnosisId) || null;
    }, [diagnoses, activeDiagnosisId]);

    const handleNewDiagnosis = () => {
        setActiveDiagnosisId(null);
        setView('diagnosis');
        resetFilters();
    };

    const handleStart = (companyName: string) => {
        const newDiagnosis: Diagnosis = {
            id: new Date().toISOString(),
            companyName,
            answers: {},
            currentTopicName: APP_TOPICS[0].name,
            reportData: null,
            validatedReportData: null,
            viewMode: 'questionnaire',
            questionnaireViewMode: 'detailed',
            lastUpdated: new Date().toISOString(),
            folderId: null,
        };
        setDiagnoses(prev => [...prev, newDiagnosis]);
        setActiveDiagnosisId(newDiagnosis.id);
        setView('diagnosis');
        resetFilters();
    };

    const handleStartFromReport = async (companyName: string, file: File) => {
        setIsAnalyzingReport(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

            const base64Data = await fileToBase64(file);
            const filePart = { inlineData: { mimeType: file.type, data: base64Data } };
            
            const questionsForPrompt = ALL_QUESTIONS.map(({ id, text, type, options }) => ({ id, text, type, options: options || [] }));
            const textPart = { text: `Você é um assistente de IA especialista em analisar relatórios de sustentabilidade corporativa para conformidade com as normas IFRS S1 e IFRS S2. Sua tarefa é revisar meticulosamente o documento fornecido e responder a uma série de perguntas de conformidade.

Instruções:
- Responda em formato JSON válido de acordo com o esquema fornecido. Não inclua nenhum texto introdutório ou formatação markdown.
- Para cada pergunta, encontre a informação mais relevante no documento.
- Se você não conseguir encontrar uma resposta para uma pergunta, omita-a da resposta JSON final.
- Para perguntas do tipo 'boolean', o 'value' deve ser uma string "true" ou "false".
- Para perguntas do tipo 'single_choice', o 'value' deve ser uma das opções fornecidas. Se nenhuma corresponder, escolha a mais apropriada das opções disponíveis.
- Para perguntas do tipo 'multiple_choice', o 'value' deve ser uma string separada por vírgulas das opções selecionadas da lista fornecida.
- Para perguntas do tipo 'text' ou 'text_block', forneça uma resposta concisa mas completa baseada no documento como o 'value'.
- O campo 'evidence' deve conter uma citação direta do documento que apoia a resposta. Se uma cotação direta não for possível, resuma a evidência. Se nenhuma evidência for encontrada, declare isso.

Aqui estão as perguntas:
${JSON.stringify(questionsForPrompt)}` };

            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    answers: {
                        type: Type.ARRAY,
                        description: "Uma matriz de perguntas respondidas.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                questionId: { type: Type.STRING, description: 'O ID da pergunta que está sendo respondida.' },
                                value: { type: Type.STRING, description: 'A resposta para a pergunta. Para booleano, "true" ou "false". Para múltipla escolha, uma lista de strings separadas por vírgulas. Para outros tipos, a resposta em texto.' },
                                evidence: { type: Type.STRING, description: 'Uma citação direta ou resumo do documento que suporta a resposta.' },
                            },
                            required: ['questionId', 'value', 'evidence'],
                        },
                    },
                },
                required: ['answers'],
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [textPart, filePart] },
                config: {
                    responseMimeType: 'application/json',
                    responseSchema,
                    temperature: 0,
                },
            });

            const resultText = response.text.trim();
            const parsedResult = JSON.parse(resultText);
            const generatedAnswers: { questionId: string; value: string; evidence: string }[] = parsedResult.answers;
            
            const newAnswers: AnswersState = {};
            generatedAnswers.forEach(genAnswer => {
                const question = ALL_QUESTIONS.find(q => q.id === genAnswer.questionId);
                if (!question) return;

                let parsedValue: AnswerValue = null;
                const valueStr = genAnswer.value.trim();

                if (valueStr !== "") {
                    switch (question.type) {
                        case 'boolean':
                            parsedValue = valueStr.toLowerCase() === 'true';
                            break;
                        case 'multiple_choice':
                            parsedValue = valueStr.split(',').map(s => s.trim()).filter(Boolean);
                            break;
                        case 'single_choice':
                        case 'text':
                        case 'text_block':
                            parsedValue = valueStr;
                            break;
                    }
                }
                
                const isValueProvided = parsedValue !== null && (Array.isArray(parsedValue) ? parsedValue.length > 0 : String(parsedValue).trim() !== '');

                if (isValueProvided) {
                     newAnswers[question.id] = {
                        value: parsedValue,
                        evidence: genAnswer.evidence,
                        confirmed: true,
                     };
                }
            });

            const newDiagnosis: Diagnosis = {
                id: new Date().toISOString(),
                companyName,
                answers: newAnswers,
                currentTopicName: APP_TOPICS[0].name,
                reportData: null,
                validatedReportData: null,
                viewMode: 'questionnaire',
                questionnaireViewMode: 'summary', // Start in summary view to review
                lastUpdated: new Date().toISOString(),
                folderId: null,
            };

            setDiagnoses(prev => [...prev, newDiagnosis]);
            setActiveDiagnosisId(newDiagnosis.id);
            setView('diagnosis');
            resetFilters();

        } catch (error) {
            console.error("Error analyzing report with Gemini:", error);
            alert("Ocorreu um erro ao analisar o relatório. Por favor, verifique o formato do arquivo e tente novamente.");
        } finally {
            setIsAnalyzingReport(false);
        }
    };
    
    const handleLoadDiagnosis = (id: string) => {
        setActiveDiagnosisId(id);
        setView('diagnosis');
        resetFilters();
    };

    const handleDeleteDiagnosis = (id: string) => {
        if (window.confirm("Tem certeza que deseja excluir este diagnóstico? Esta ação não pode ser desfeita.")) {
            setDiagnoses(prev => prev.filter(d => d.id !== id));
            if(activeDiagnosisId === id) {
                setActiveDiagnosisId(null);
                setView('saved_reports');
            }
        }
    };
    
    const updateActiveDiagnosis = (update: Partial<Diagnosis> | ((d: Diagnosis) => Diagnosis)) => {
        setDiagnoses(prev => prev.map(d => {
            if (d.id === activeDiagnosisId) {
                const updated = typeof update === 'function' ? update(d) : { ...d, ...update };
                return { ...updated, lastUpdated: new Date().toISOString() };
            }
            return d;
        }));
    };
    
    const handleAnswer = useCallback((questionId: string, answer: Answer) => {
        updateActiveDiagnosis(d => ({
            ...d,
            answers: { ...d.answers, [questionId]: answer }
        }));
    }, [activeDiagnosisId]);

    const handleSelectTopic = (topicName: string) => {
        updateActiveDiagnosis({ currentTopicName: topicName });
        // When user clicks a topic, exit search mode.
        setSearchQuery('');
    };

    const handleQuestionnaireViewModeChange = (mode: QuestionnaireViewMode) => {
        if (activeDiagnosis) {
            updateActiveDiagnosis({ questionnaireViewMode: mode });
        }
    };

    const handleSendReport = async () => {
        if (!activeDiagnosis) return;
        setIsSending(true);

        const currentAnswers = { ...activeDiagnosis.answers };

        // Explicitly identify all questions that have been answered.
        const allAnsweredQuestions = ALL_QUESTIONS.filter(q => isAnswerProvided(currentAnswers[q.id]));

        // From those, create a queue of questions that still need AI verification.
        const questionsToVerify = allAnsweredQuestions.filter(q => !currentAnswers[q.id]?.aiCheck);

        // Sequentially process each question needing verification to avoid API rate limits.
        for (const question of questionsToVerify) {
            const answer = currentAnswers[question.id];
            
            // The answer is guaranteed to exist due to the filter logic above.
            const aiCheckResult = await performAiCheck(question, answer!);
            
            if (aiCheckResult) {
                // Update the answer in our temporary state with the AI check result.
                currentAnswers[question.id] = {
                    ...answer!,
                    aiCheck: aiCheckResult,
                };
            }
            
            // A small delay between API calls for robustness.
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // With verifications complete, proceed to calculate compliance and generate the report data.
        const allQuestionsForCompliance = ALL_QUESTIONS;
        let totalPossibleScore = 0;
        let achievedScore = 0;
        let s1PossibleScore = 0;
        let s1AchievedScore = 0;
        let s2PossibleScore = 0;
        let s2AchievedScore = 0;
        
        const topicScores: { 
            [topic: string]: {
                achieved: number;
                possible: number;
                subtopics: {
                    [subtopic: string]: {
                        achieved: number;
                        possible: number;
                    }
                }
            }
        } = {};

        APP_TOPICS.forEach(t => {
            topicScores[t.name] = { achieved: 0, possible: 0, subtopics: {} };
        });
        
        const deficiencies: Question[] = [];

        allQuestionsForCompliance.forEach(q => {
            const weight = 1;
            const answer = currentAnswers[q.id];

            if (!topicScores[q.topic].subtopics[q.subtopic]) {
                topicScores[q.topic].subtopics[q.subtopic] = { achieved: 0, possible: 0 };
            }
            
            totalPossibleScore += weight;
            topicScores[q.topic].possible += weight;
            topicScores[q.topic].subtopics[q.subtopic].possible += weight;

            const isS1 = q.reference.includes('IFRS S1');
            const isS2 = q.reference.includes('IFRS S2');

            if (isS1) s1PossibleScore += weight;
            if (isS2) s2PossibleScore += weight;

            let questionScore = 0;
            const answered = isAnswerProvided(answer);

            if (answered && answer?.aiCheck) {
                switch (answer.aiCheck.status) {
                    case 'sufficient':
                        questionScore = 1.0;
                        break;
                    case 'partial':
                        questionScore = 0.5;
                        break;
                    case 'insufficient':
                    default:
                        questionScore = 0;
                        break;
                }
            }

            const questionAchievedScore = questionScore * weight;

            achievedScore += questionAchievedScore;
            topicScores[q.topic].achieved += questionAchievedScore;
            topicScores[q.topic].subtopics[q.subtopic].achieved += questionAchievedScore;
            if (isS1) s1AchievedScore += questionAchievedScore;
            if (isS2) s2AchievedScore += questionAchievedScore;

            if (questionScore < 1) {
                deficiencies.push(q);
            }
        });

        const weightedCompliance = totalPossibleScore > 0 ? (achievedScore / totalPossibleScore) * 100 : 100;
        const s1Compliance = s1PossibleScore > 0 ? (s1AchievedScore / s1PossibleScore) * 100 : 100;
        const s2Compliance = s2PossibleScore > 0 ? (s2AchievedScore / s2PossibleScore) * 100 : 100;

        const topicCompliance: TopicCompliance[] = APP_TOPICS.map(t => {
            const topicData = topicScores[t.name];
            const subtopicsCompliance: SubtopicCompliance[] = Object.entries(topicData.subtopics)
                .map(([subtopicName, subtopicData]) => ({
                    name: subtopicName,
                    compliance: subtopicData.possible > 0 
                        ? (subtopicData.achieved / subtopicData.possible) * 100 
                        : 100,
                }))
                .sort((a, b) => a.compliance - b.compliance);

            return {
                topic: t.name,
                compliance: topicData.possible > 0 
                    ? (topicData.achieved / topicData.possible) * 100 
                    : 100,
                subtopics: subtopicsCompliance,
            };
        });

        const answeredCount = allQuestionsForCompliance.filter(q => isAnswerProvided(currentAnswers[q.id])).length;

        const reportData: ReportData = {
            allQuestions: ALL_QUESTIONS,
            deficiencies,
            allAnswers: currentAnswers,
            companyName: activeDiagnosis.companyName!,
            answeredQuestions: answeredCount,
            totalQuestions: allQuestionsForCompliance.length,
            generatedAt: new Date().toISOString(),
            weightedCompliance,
            s1Compliance,
            s2Compliance,
            topicCompliance,
            isConsultantReport: false,
        };
        
        updateActiveDiagnosis({ answers: currentAnswers, reportData, viewMode: 'report' });
        setActiveReportTab('overview');
        setIsSending(false);
    };
    
    const handleBackToList = () => {
        setActiveDiagnosisId(null);
        setView('saved_reports');
    };

    const handleReturnToEdit = () => {
        if (activeDiagnosis) {
            updateActiveDiagnosis({ viewMode: 'questionnaire' });
        }
    };

    const handleCreateFolder = (name: string) => {
        if (name.trim() === '') return;
        const newFolder: Folder = {
            id: new Date().toISOString(),
            name: name.trim()
        };
        setFolders(prev => [...prev, newFolder]);
    };

    const handleDeleteFolder = (folderId: string) => {
        const isFolderEmpty = !diagnoses.some(d => d.folderId === folderId);
        if (!isFolderEmpty) {
            alert("A pasta não está vazia. Mova ou exclua os relatórios para fora dela antes de excluir a pasta.");
            return;
        }
        if (window.confirm(`Tem certeza que deseja excluir a pasta?`)) {
            setFolders(prev => prev.filter(f => f.id !== folderId));
        }
    };

    const handleMoveDiagnosisToFolder = (diagnosisId: string, folderId: string | null) => {
        setDiagnoses(prev => prev.map(d => 
            d.id === diagnosisId ? { ...d, folderId, lastUpdated: new Date().toISOString() } : d
        ));
    };

    const handleUpdateAnswerValidation = (diagnosisId: string, questionId: string, validationStatus: 'validated' | 'refused' | null, consultantComment?: string) => {
        setDiagnoses(prev => prev.map(d => {
            if (d.id === diagnosisId) {
                const newAnswers = { ...d.answers };
                if (newAnswers[questionId]) {
                    newAnswers[questionId] = {
                        ...newAnswers[questionId],
                        validationStatus,
                        consultantComment: consultantComment ?? newAnswers[questionId].consultantComment,
                    };
                }
                return { ...d, answers: newAnswers, lastUpdated: new Date().toISOString() };
            }
            return d;
        }));
    };

    const handleAnswerUpdateFromConsultant = (diagnosisId: string, questionId: string, newAnswer: Answer) => {
        setDiagnoses(prev => prev.map(d => {
            if (d.id === diagnosisId) {
                const newAnswers = { ...d.answers, [questionId]: newAnswer };
                return { ...d, answers: newAnswers, lastUpdated: new Date().toISOString() };
            }
            return d;
        }));
    };

    const handleGenerateValidatedReport = async (diagnosisId: string) => {
        setIsAnalyzingReport(true);
        try {
            const diagnosis = diagnoses.find(d => d.id === diagnosisId);
            if (!diagnosis) return;

            const currentAnswers = { ...diagnosis.answers };

            const allAnsweredQuestions = ALL_QUESTIONS.filter(q => isAnswerProvided(currentAnswers[q.id]));
            const questionsToVerify = allAnsweredQuestions.filter(q => !currentAnswers[q.id]?.aiCheck);

            for (const question of questionsToVerify) {
                const answer = currentAnswers[question.id];
                const aiCheckResult = await performAiCheck(question, answer!);
                if (aiCheckResult) {
                    currentAnswers[question.id] = {
                        ...answer!,
                        aiCheck: aiCheckResult,
                    };
                }
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            const allQuestionsForCompliance = ALL_QUESTIONS;
            let totalPossibleScore = 0;
            let achievedScore = 0;
            let s1PossibleScore = 0;
            let s1AchievedScore = 0;
            let s2PossibleScore = 0;
            let s2AchievedScore = 0;
            const deficiencies: Question[] = [];
            
            const topicScores: { 
                [topic: string]: {
                    achieved: number;
                    possible: number;
                    subtopics: {
                        [subtopic: string]: {
                            achieved: number;
                            possible: number;
                        }
                    }
                }
            } = {};

            APP_TOPICS.forEach(t => {
                topicScores[t.name] = { achieved: 0, possible: 0, subtopics: {} };
            });

            allQuestionsForCompliance.forEach(q => {
                const weight = 1;
                const answer = currentAnswers[q.id];

                if (!topicScores[q.topic].subtopics[q.subtopic]) {
                    topicScores[q.topic].subtopics[q.subtopic] = { achieved: 0, possible: 0 };
                }
                
                totalPossibleScore += weight;
                topicScores[q.topic].possible += weight;
                topicScores[q.topic].subtopics[q.subtopic].possible += weight;

                const isS1 = q.reference.includes('IFRS S1');
                const isS2 = q.reference.includes('IFRS S2');

                if (isS1) s1PossibleScore += weight;
                if (isS2) s2PossibleScore += weight;

                let questionScore = 0;
                const answered = isAnswerProvided(answer);

                if (answered && answer?.aiCheck) {
                     switch (answer.aiCheck.status) {
                        case 'sufficient':
                            questionScore = 1.0;
                            break;
                        case 'partial':
                            questionScore = 0.5;
                            break;
                        case 'insufficient':
                        default:
                            questionScore = 0;
                            break;
                    }
                }

                const questionAchievedScore = questionScore * weight;

                achievedScore += questionAchievedScore;
                topicScores[q.topic].achieved += questionAchievedScore;
                topicScores[q.topic].subtopics[q.subtopic].achieved += questionAchievedScore;
                if (isS1) s1AchievedScore += questionAchievedScore;
                if (isS2) s2AchievedScore += questionAchievedScore;
                
                if (questionScore < 1) {
                    deficiencies.push(q);
                }
            });
            
            const weightedCompliance = totalPossibleScore > 0 ? (achievedScore / totalPossibleScore) * 100 : 100;
            const s1Compliance = s1PossibleScore > 0 ? (s1AchievedScore / s1PossibleScore) * 100 : 100;
            const s2Compliance = s2PossibleScore > 0 ? (s2AchievedScore / s2PossibleScore) * 100 : 100;

            const topicCompliance: TopicCompliance[] = APP_TOPICS.map(t => {
                const topicData = topicScores[t.name];
                const subtopicsCompliance: SubtopicCompliance[] = Object.entries(topicData.subtopics)
                    .map(([subtopicName, subtopicData]) => ({
                        name: subtopicName,
                        compliance: subtopicData.possible > 0 
                            ? (subtopicData.achieved / subtopicData.possible) * 100 
                            : 100,
                    }))
                    .sort((a, b) => a.compliance - b.compliance);

                return {
                    topic: t.name,
                    compliance: topicData.possible > 0 
                        ? (topicData.achieved / topicData.possible) * 100 
                        : 100,
                    subtopics: subtopicsCompliance,
                };
            });

            const answeredCount = allQuestionsForCompliance.filter(q => isAnswerProvided(diagnosis.answers[q.id])).length;

            const validatedReport: ReportData = {
                allQuestions: allQuestionsForCompliance,
                deficiencies,
                allAnswers: currentAnswers,
                companyName: diagnosis.companyName,
                answeredQuestions: answeredCount,
                totalQuestions: allQuestionsForCompliance.length,
                generatedAt: new Date().toISOString(),
                weightedCompliance,
                s1Compliance,
                s2Compliance,
                topicCompliance,
                isConsultantReport: true,
            };

            setDiagnoses(prev => prev.map(d => 
                d.id === diagnosisId 
                    ? { ...d, answers: currentAnswers, validatedReportData: validatedReport, lastUpdated: new Date().toISOString() } 
                    : d
            ));
        } finally {
             setIsAnalyzingReport(false);
        }
    };
    
    const filteredAndSearchedQuestions = useMemo(() => {
        if (!activeDiagnosis) return [];
        return ALL_QUESTIONS
            .filter(q => {
                if (filterStatus === 'answered') return isAnswerProvided(activeDiagnosis.answers[q.id]);
                if (filterStatus === 'unanswered') return !isAnswerProvided(activeDiagnosis.answers[q.id]);
                return true; // for 'all'
            })
            .filter(q => {
                const query = searchQuery.toLowerCase().trim();
                if (!query) return true;
                return (
                    q.text.toLowerCase().includes(query) ||
                    q.subtopic.toLowerCase().includes(query) ||
                    q.topic.toLowerCase().includes(query) ||
                    q.reference.toLowerCase().includes(query)
                );
            });
    }, [activeDiagnosis, filterStatus, searchQuery]);
        
    const renderDiagnosisView = () => {
        if (!activeDiagnosis) {
            return (
                <WelcomeScreen 
                    onStart={handleStart}
                    onStartFromReport={handleStartFromReport}
                    isAnalyzing={isAnalyzingReport}
                />
            );
        }
        
        if (activeDiagnosis.viewMode === 'report' && activeDiagnosis.reportData) {
            return (
                <Report
                  reportData={activeDiagnosis.reportData}
                  topics={APP_TOPICS}
                  onBackToList={handleBackToList}
                  onReturnToEdit={handleReturnToEdit}
                  activeTab={activeReportTab}
                  onTabChange={setActiveReportTab}
                />
            );
        }
        
        const isSearching = searchQuery.trim().length > 0;
        
        const answeredQuestionsCount = ALL_QUESTIONS.filter(q => isAnswerProvided(activeDiagnosis.answers[q.id])).length;
        const progress = {
            answered: answeredQuestionsCount,
            total: ALL_QUESTIONS.length
        };
        
        const currentTopic = APP_TOPICS.find(t => t.name === activeDiagnosis.currentTopicName) || APP_TOPICS[0];
        
        // For detailed view: if searching, show all results. If not, show only for current topic.
        const questionsForDetailedView = isSearching
            ? filteredAndSearchedQuestions
            : filteredAndSearchedQuestions.filter(q => q.topic === currentTopic.name);
            
        // For summary view: always show all filtered results
        const questionsForSummaryView = filteredAndSearchedQuestions;
        
        return (
            <div className="h-full flex flex-col">
              <div className="flex-shrink-0 text-2xl font-bold text-slate-800 pb-4 border-b border-slate-200">
                Diagnóstico IFRS <span className="font-light text-slate-500">| {activeDiagnosis.companyName}</span>
              </div>
              <div className="flex-shrink-0 mt-6">
                <QuestionnaireControls
                    filterStatus={filterStatus}
                    onFilterChange={setFilterStatus}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    resultsCount={ALL_QUESTIONS.length}
                    questionnaireViewMode={activeDiagnosis.questionnaireViewMode || 'detailed'}
                    onQuestionnaireViewModeChange={handleQuestionnaireViewModeChange}
                />
              </div>
              <div className="flex gap-8 flex-1 overflow-hidden mt-6">
                  <aside className={`flex-shrink-0 h-full transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-80'}`}>
                      <Sidebar
                          topics={APP_TOPICS}
                          currentTopicName={isSearching ? '' : activeDiagnosis.currentTopicName}
                          onSelectTopic={handleSelectTopic}
                          progress={progress}
                          onSendReport={handleSendReport}
                          isSending={isSending}
                          isCollapsed={isSidebarCollapsed}
                          onToggleCollapse={() => setIsSidebarCollapsed(p => !p)}
                      />
                  </aside>
                  <main className="flex-1 h-full overflow-y-auto pr-2">
                      <Questionnaire
                          topic={currentTopic}
                          questionsForTopic={questionsForDetailedView}
                          answers={activeDiagnosis.answers}
                          onAnswer={handleAnswer}
                          questionnaireViewMode={activeDiagnosis.questionnaireViewMode || 'detailed'}
                          allQuestions={questionsForSummaryView}
                          allTopics={APP_TOPICS}
                          isSearching={isSearching}
                      />
                  </main>
              </div>
            </div>
        );
    };

    return (
        <div className="h-screen max-h-screen flex bg-slate-50 text-slate-800">
            <MainSidebar
                currentView={view}
                onSetView={setView}
                onNewDiagnosis={handleNewDiagnosis}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    {view === 'saved_reports' && (
                        <SavedReports 
                            diagnoses={diagnoses}
                            folders={folders}
                            onLoad={handleLoadDiagnosis}
                            onDelete={handleDeleteDiagnosis}
                            onNew={handleNewDiagnosis}
                            onCreateFolder={handleCreateFolder}
                            onDeleteFolder={handleDeleteFolder}
                            onMoveToFolder={handleMoveDiagnosisToFolder}
                        />
                    )}
                    {view === 'diagnosis' && renderDiagnosisView()}
                    {view === 'consultant_area' && (
                        <ConsultantArea 
                            diagnoses={diagnoses}
                            onUpdateAnswerValidation={handleUpdateAnswerValidation}
                            onAnswerUpdate={handleAnswerUpdateFromConsultant}
                            onGenerateValidatedReport={handleGenerateValidatedReport}
                            isGeneratingReport={isAnalyzingReport}
                        />
                    )}
                </main>
            </div>
        </div>
    );
};

export default App;
