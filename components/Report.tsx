import React, { useState, useMemo, useCallback } from 'react';
import type { Question, Topic, AnswersState, ReportData, AnswerValue, Answer, QuestionType, TopicCompliance, AiCheckResult } from '../types';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js';
import { Doughnut, Radar, Bar } from 'react-chartjs-2';
import AiCheckDisplay from './AiCheckDisplay';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale
);

interface ReportProps {
  reportData: ReportData;
  topics: Topic[];
  onBackToList: () => void;
  onReturnToEdit: () => void;
  activeTab: 'overview' | 'summary';
  onTabChange: (tab: 'overview' | 'summary') => void;
}

// --- Helper Functions for Response Summary ---

const getQuestionTypeLabel = (type: QuestionType): string => {
    switch (type) {
        case 'text_block': return 'Bloco de texto';
        case 'boolean': return 'Verdadeiro ou falso';
        case 'multiple_choice': return 'Múltipla escolha';
        case 'single_choice': return 'Escolha única';
        case 'text': return 'Texto';
        default: return 'N/A';
    }
};

const getSummaryAnswerText = (question: Question, answer: Answer | undefined): React.ReactNode => {
    if (!answer?.confirmed) {
        return <span className="text-slate-500 italic">Não respondido</span>;
    }

    const value = answer!.value;
    
    if (value === null) {
        return <span className="font-semibold text-slate-600">Não Aplicável</span>;
    }

    switch (question.type) {
        case 'text_block':
        case 'text':
            return <span className="font-semibold text-slate-700">Texto</span>;
        case 'boolean':
            return value ? <span className="font-semibold text-teal-700">Verdadeiro</span> : <span className="font-semibold text-red-700">Falso</span>;
        case 'multiple_choice':
            return (
                <ul className="list-none p-0 m-0 space-y-1">
                    {(value as string[]).map(opt => <li key={opt}><span className="font-mono text-teal-600 mr-1.5">X</span>{opt}</li>)}
                </ul>
            );
        case 'single_choice':
             return <span className="text-slate-800">{String(value)}</span>;
        default:
            return String(value);
    }
};


// --- UI Components for Report ---

const DoughnutChart: React.FC<{ percentage: number; label: string; color: string }> = ({ percentage, label, color }) => {
  const data = {
    datasets: [
      {
        data: [percentage, 100 - percentage],
        backgroundColor: [color, '#e2e8f0'],
        borderColor: ['#ffffff', '#ffffff'],
        borderWidth: 4,
        cutout: '80%',
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
  };

  return (
    <div className="relative w-full h-40 sm:h-44 mx-auto">
      <Doughnut data={data} options={options} />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className={`text-3xl sm:text-4xl font-bold`} style={{ color }}>
          {percentage.toFixed(0)}%
        </span>
        <span className="text-sm font-semibold text-slate-500 mt-1">
          {label}
        </span>
      </div>
    </div>
  );
};

const formatAnswerValueForDisplay = (value: AnswerValue, confirmed?: boolean): { text: string, color: string } => {
    if (value === null || value === undefined) {
        if (confirmed) {
            return { text: "Não Aplicável", color: "text-slate-600" };
        }
        return { text: "Não respondido", color: "text-slate-500" };
    }
    if (typeof value === 'boolean') return value ? { text: 'Verdadeiro', color: 'text-teal-700' } : { text: 'Falso', color: 'text-red-700' };
    if (Array.isArray(value)) {
      if (value.length === 0) return { text: "Não respondido", color: "text-slate-500" };
      return { text: value.join(', '), color: 'text-slate-800' };
    }
    if (typeof value === 'string' && value.trim() === '') return { text: "Não respondido", color: "text-slate-500" };
    return { text: String(value), color: 'text-slate-800' };
};

// --- Modals ---

const ResponseDetailModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
  answer: Answer | undefined;
}> = ({ isOpen, onClose, question, answer }) => {
    if (!isOpen || !question) return null;

    const formattedValue = formatAnswerValueForDisplay(answer?.value, answer?.confirmed);
    const isAnswerValueProvided = (ans: Answer | undefined): boolean => {
        if (!ans || ans.value === null || ans.value === undefined) return false;
        if (typeof ans.value === 'string') return ans.value.trim() !== '';
        if (Array.isArray(ans.value)) return ans.value.length > 0;
        return typeof ans.value === 'boolean';
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-800">Detalhes da Resposta</h2>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors" aria-label="Fechar modal">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </header>
                <main className="p-4 sm:p-6 overflow-y-auto space-y-6">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pergunta ({question.id})</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{question.text}</p>
                        <p className="mt-2 text-xs font-mono text-slate-600 bg-slate-200 inline-block px-2 py-0.5 rounded">{question.reference}</p>
                    </div>

                    <div>
                         <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Resposta</h3>
                         <div className="p-4 bg-white rounded-lg border border-slate-200 min-h-[6rem]">
                            {answer?.confirmed ? (
                                <div className={`text-base ${formattedValue.color} whitespace-pre-wrap`}>
                                    {Array.isArray(answer?.value) ? (
                                        <ul className="list-disc list-inside space-y-1">
                                            {answer?.value.map(item => <li key={item}>{item}</li>)}
                                        </ul>
                                    ) : (
                                        formattedValue.text
                                    )}
                                </div>
                            ) : (
                                <p className="text-slate-500 italic">Nenhuma resposta foi fornecida.</p>
                            )}
                         </div>
                    </div>

                    <div>
                         <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Justificativa e Evidências</h3>
                         <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-4">
                            {answer?.evidence ? (
                                <p className="text-slate-700 whitespace-pre-wrap">{answer.evidence}</p>
                            ) : (
                                <p className="text-slate-500 italic">Nenhuma justificativa fornecida.</p>
                            )}
                            {answer?.attachment ? (
                                <a href={answer.attachment.content} download={answer.attachment.name} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-sm text-teal-700 bg-teal-50 border-2 border-teal-200 hover:bg-teal-100 hover:border-teal-300 transition-colors shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    Baixar: {answer.attachment.name}
                                </a>
                            ) : (
                                <p className="text-slate-500 italic">Nenhum anexo fornecido.</p>
                            )}
                         </div>
                    </div>
                    {answer?.aiCheck && <AiCheckDisplay aiCheck={answer.aiCheck} />}
                </main>
            </div>
        </div>
    );
};


const ReviewModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  answers: AnswersState;
}> = ({ isOpen, onClose, questions, answers }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col animate-fade-in" role="dialog" aria-modal="true">
            <div className="bg-slate-50 h-full flex flex-col">
                <header className="flex-shrink-0 bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-20">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">Revisão de Pontos de Melhoria</h2>
                                <p className="text-slate-600 text-sm mt-1">{questions.length} ponto(s) identificado(s)</p>
                            </div>
                            <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors" aria-label="Fechar modal">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <div className="max-w-5xl mx-auto">
                        {questions.length > 0 ? (
                            <div className="space-y-6">
                                {questions.map((q) => {
                                    const answer = answers[q.id];
                                    const formattedValue = formatAnswerValueForDisplay(answer?.value, answer?.confirmed);
                                    return (
                                        <div key={q.id} className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                                            <div className="p-5">
                                                <p className="text-xs font-mono text-slate-500">{q.id} &bull; {q.reference}</p>
                                                <p className="mt-2 text-lg font-semibold text-slate-800">{q.text}</p>
                                            </div>
                                            <div className="bg-slate-50 p-5 border-t border-slate-200 space-y-4">
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-600 mb-2">Resposta Fornecida</h4>
                                                    <p className={`font-semibold ${formattedValue.color}`}>{formattedValue.text}</p>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-600 mb-2">Justificativa e Evidências</h4>
                                                    {answer?.evidence ? (
                                                        <p className="text-slate-700 whitespace-pre-wrap bg-white p-3 rounded-md border border-slate-200">{answer.evidence}</p>
                                                    ) : (
                                                        <p className="text-slate-500 italic">Nenhuma justificativa fornecida.</p>
                                                    )}
                                                     {answer?.attachment && (
                                                        <a href={answer.attachment.content} download={answer.attachment.name} className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-sm text-teal-700 bg-teal-50 border-2 border-teal-200 hover:bg-teal-100 hover:border-teal-300 transition-colors shadow-sm">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                                            Baixar: {answer.attachment.name}
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                             <div className="text-center bg-white p-12 rounded-lg border-2 border-dashed border-slate-300 mt-8">
                                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-teal-500 mx-auto mb-4"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                <h2 className="text-xl font-semibold text-slate-700">Nenhum ponto de melhoria!</h2>
                                <p className="text-slate-500 mt-2 max-w-md mx-auto">
                                    Baseado nas respostas, não foram identificadas deficiências de divulgação. Excelente trabalho!
                                </p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};


// --- Main Report Component ---

const Report: React.FC<ReportProps> = ({ reportData, topics, onBackToList, onReturnToEdit, activeTab, onTabChange }) => {
    const [isReviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
    const [complianceSlide, setComplianceSlide] = useState(0);

    const handleOpenReview = () => setReviewModalOpen(true);
    const handleCloseReview = () => setReviewModalOpen(false);

    const selectedQuestion = useMemo(() => 
        selectedQuestionId 
            ? reportData.allQuestions.find(q => q.id === selectedQuestionId) || null
            : null
    , [selectedQuestionId, reportData.allQuestions]);

    const selectedAnswer = selectedQuestion ? reportData.allAnswers[selectedQuestion.id] : undefined;

    const summaryData = useMemo(() => {
        const answered = reportData.answeredQuestions;
        const total = reportData.totalQuestions;
        const compliance = reportData.weightedCompliance;
        const deficiencies = reportData.deficiencies.length;
        const s1Compliance = reportData.s1Compliance;
        const s2Compliance = reportData.s2Compliance;

        return {
            answered,
            total,
            compliance,
            deficiencies,
            s1Compliance,
            s2Compliance,
        };
    }, [reportData]);
    
    const answeredPercentage = summaryData.total > 0 ? (summaryData.answered / summaryData.total) * 100 : 0;

    const complianceSlides = useMemo(() => [
        { percentage: summaryData.compliance, label: "Conformidade Geral", color: "#0d9488" },
        { percentage: summaryData.s1Compliance, label: "Conformidade IFRS S1", color: "#0ea5e9" },
        { percentage: summaryData.s2Compliance, label: "Conformidade IFRS S2", color: "#f97316" }
    ], [summaryData]);

    const nextSlide = useCallback(() => {
        setComplianceSlide(s => (s === complianceSlides.length - 1 ? 0 : s + 1));
    }, [complianceSlides.length]);

    const prevSlide = useCallback(() => {
        setComplianceSlide(s => (s === 0 ? complianceSlides.length - 1 : s - 1));
    }, [complianceSlides.length]);

    const radarChartData = {
        labels: reportData.topicCompliance.map(t => t.topic),
        datasets: [{
            label: 'Conformidade por Tópico',
            data: reportData.topicCompliance.map(t => t.compliance),
            backgroundColor: 'rgba(20, 184, 166, 0.2)',
            borderColor: 'rgb(13, 148, 136)',
            pointBackgroundColor: 'rgb(13, 148, 136)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgb(13, 148, 136)',
            borderWidth: 2,
        }],
    };
    
    const radarChartOptions: any = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            r: {
                angleLines: { color: '#cbd5e1' },
                grid: { color: '#e2e8f0' },
                pointLabels: {
                    font: { size: 12, weight: '500' },
                    color: '#475569'
                },
                ticks: {
                    backdropColor: 'rgba(255, 255, 255, 0.75)',
                    color: '#64748b',
                    stepSize: 25,
                    max: 100,
                    min: 0,
                    callback: (value: any) => value + '%',
                },
            },
        },
        plugins: { legend: { display: false } },
    };
    
    return (
        <div className="animate-fade-in pb-10">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">
                        Relatório de Diagnóstico
                        {reportData.isConsultantReport && <span className="text-teal-600 font-semibold text-2xl ml-3">(Validado)</span>}
                    </h1>
                    <p className="mt-1 text-slate-600">Empresa: <span className="font-semibold">{reportData.companyName}</span> | Gerado em: {new Date(reportData.generatedAt).toLocaleString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-3">
                    {!reportData.isConsultantReport && (
                        <button onClick={onReturnToEdit} className="px-4 py-2 rounded-lg font-semibold text-teal-700 bg-teal-50 border-2 border-teal-200 hover:bg-teal-100 transition-colors flex items-center gap-2 shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                            Editar Respostas
                        </button>
                    )}
                    <button onClick={onBackToList} className="px-4 py-2 rounded-lg font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors flex items-center gap-2 shadow-sm">
                       Voltar para a lista
                    </button>
                </div>
            </header>

            <div className="border-b border-slate-200 mb-8">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button
                        onClick={() => onTabChange('overview')}
                        className={`py-3 px-1 border-b-2 font-semibold text-base transition-colors ${
                            activeTab === 'overview'
                            ? 'border-teal-600 text-teal-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        Visão Geral
                    </button>
                    <button
                        onClick={() => onTabChange('summary')}
                        className={`py-3 px-1 border-b-2 font-semibold text-base transition-colors ${
                            activeTab === 'summary'
                            ? 'border-teal-600 text-teal-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        Sumário de Respostas
                    </button>
                </nav>
            </div>
            
            {activeTab === 'overview' && (
                <div className="animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-white rounded-xl shadow-lg border border-slate-200 relative">
                            <div className="overflow-hidden rounded-xl">
                                <div className="flex transition-transform ease-out duration-500" style={{ transform: `translateX(-${complianceSlide * 100}%)` }}>
                                    {complianceSlides.map((slide, index) => (
                                        <div key={index} className="w-full flex-shrink-0 p-6">
                                            <DoughnutChart percentage={slide.percentage} label={slide.label} color={slide.color} />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button onClick={prevSlide} className="absolute top-1/2 left-2 -translate-y-1/2 bg-white/70 hover:bg-white rounded-full p-1.5 shadow-md transition-all z-10" aria-label="Slide anterior">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                            </button>
                            <button onClick={nextSlide} className="absolute top-1/2 right-2 -translate-y-1/2 bg-white/70 hover:bg-white rounded-full p-1.5 shadow-md transition-all z-10" aria-label="Próximo slide">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                            </button>
                            
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                {complianceSlides.map((_, i) => (
                                    <div key={i} onClick={() => setComplianceSlide(i)} className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all ${complianceSlide === i ? 'bg-slate-700' : 'bg-slate-300 hover:bg-slate-400'}`}></div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200 flex flex-col justify-center items-center text-center">
                            <DoughnutChart percentage={answeredPercentage} label="Respostas Concedidas" color="#0ea5e9" />
                        </div>
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200 flex flex-col justify-center">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4">Resumo do Diagnóstico</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-slate-600">Perguntas Respondidas</span>
                                    <span className="font-bold text-2xl text-slate-800">{summaryData.answered}<span className="text-base text-slate-500 font-medium">/{summaryData.total}</span></span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-slate-600">Pontos de Melhoria</span>
                                    <span className="font-bold text-2xl text-red-600">{summaryData.deficiencies}</span>
                                </div>
                            </div>
                            <button onClick={handleOpenReview} className="mt-6 w-full px-4 py-2 rounded-lg font-semibold text-sm text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm disabled:bg-slate-300" disabled={summaryData.deficiencies === 0}>
                                Revisar Pontos
                            </button>
                        </div>
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200 md:col-span-2 lg:col-span-3">
                            <h3 className="text-lg font-semibold text-slate-800 mb-2">Conformidade por Tópico</h3>
                            <div className="w-full h-80">
                                <Radar data={radarChartData} options={radarChartOptions} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'summary' && (
                <div className="animate-fade-in">
                    <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mt-2 border border-slate-200">
                        <div className="overflow-x-auto -mx-6 sm:-mx-8 px-6 sm:px-8">
                            <div className="align-middle inline-block min-w-full">
                                <table className="min-w-full border-collapse">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th scope="col" className="p-4 text-left text-sm font-semibold text-slate-600">Código</th>
                                            <th scope="col" className="p-4 text-left text-sm font-semibold text-slate-600 w-2/5">Elemento a Reportar</th>
                                            <th scope="col" className="p-4 text-left text-sm font-semibold text-slate-600">Tipo</th>
                                            <th scope="col" className="p-4 text-left text-sm font-semibold text-slate-600">Referência</th>
                                            <th scope="col" className="p-4 text-left text-sm font-semibold text-slate-600">Resposta</th>
                                            <th scope="col" className="p-4 text-left text-sm font-semibold text-slate-600">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topics.map(topic => (
                                            <React.Fragment key={topic.name}>
                                                <tr className="bg-slate-100 border-t border-b border-slate-200">
                                                    <td colSpan={6} className="p-3 text-md font-bold text-slate-700">{topic.name}</td>
                                                </tr>
                                                {reportData.allQuestions.filter(q => q.topic === topic.name).map((question) => {
                                                    const answer = reportData.allAnswers[question.id];
                                                    return (
                                                        <tr key={question.id} className="border-b border-slate-200 transition-colors">
                                                            <td className="p-4 text-sm font-medium whitespace-nowrap text-slate-500">{question.id}</td>
                                                            <td className="p-4 text-sm text-slate-800">{question.text}</td>
                                                            <td className="p-4 text-sm whitespace-nowrap text-slate-600">{getQuestionTypeLabel(question.type)}</td>
                                                            <td className="p-4 text-sm font-mono whitespace-nowrap text-slate-600">{question.reference}</td>
                                                            <td className="p-4 text-sm">
                                                                {getSummaryAnswerText(question, answer)}
                                                            </td>
                                                            <td className="p-4 text-sm whitespace-nowrap">
                                                                <button 
                                                                    onClick={() => setSelectedQuestionId(question.id)} 
                                                                    className="flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:text-teal-800 transition-colors"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                                                    Detalhes
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <ResponseDetailModal 
                isOpen={!!selectedQuestion}
                onClose={() => setSelectedQuestionId(null)}
                question={selectedQuestion}
                answer={selectedAnswer}
            />

            <ReviewModal 
                isOpen={isReviewModalOpen} 
                onClose={handleCloseReview} 
                questions={reportData.deficiencies} 
                answers={reportData.allAnswers} 
            />
        </div>
    );
};

export default Report;
