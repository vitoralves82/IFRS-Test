import React, { useState, useMemo, useEffect } from 'react';
import type { Diagnosis, Question, Answer, Topic, AiCheckResult } from '../types';
import { ALL_QUESTIONS } from '../constants/questions';
import { Check, X, Edit, CheckCircle2, Clock, ChevronLeft, Send, Save, MessageSquare, AlertTriangle, FileCheck2, Users, TrendingUp, ShieldAlert, Gauge, GitMerge, LucideProps, XCircle, Sparkles, Loader2 } from 'lucide-react';
import Report from './Report';
import { QuestionInput, EvidenceBlock } from './Questionnaire';
import { isAnswerProvided } from '../App';
import AiCheckDisplay from './AiCheckDisplay';

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

interface ConsultantAreaProps {
  diagnoses: Diagnosis[];
  onUpdateAnswerValidation: (diagnosisId: string, questionId: string, validationStatus: 'validated' | 'refused' | null, consultantComment?: string) => void;
  onAnswerUpdate: (diagnosisId: string, questionId: string, newAnswer: Answer) => void;
  onGenerateValidatedReport: (diagnosisId: string) => Promise<void>;
  isGeneratingReport: boolean;
}

const ConsultantEditModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  question: Question;
  initialAnswer: Answer;
  onSave: (questionId: string, answer: Answer) => void;
}> = ({ isOpen, onClose, question, initialAnswer, onSave }) => {
    const [currentAnswer, setCurrentAnswer] = useState<Answer>(initialAnswer);

    useEffect(() => {
        if (isOpen) {
            setCurrentAnswer(initialAnswer);
        }
    }, [isOpen, initialAnswer]);

    if (!isOpen) return null;

    const updateAnswer = (updatedFields: Partial<Answer>) => {
        setCurrentAnswer(prev => ({ ...prev, ...updatedFields }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            alert("Tamanho máximo de 2MB excedido.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            updateAnswer({ attachment: { name: file.name, type: file.type, content: event.target?.result as string } });
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveAttachment = () => {
        const { attachment, ...rest } = currentAnswer;
        setCurrentAnswer(rest);
    };

    const handleSave = () => {
        const { validationStatus, consultantComment, aiCheck, ...restOfAnswer } = currentAnswer;
        onSave(question.id, { ...restOfAnswer, confirmed: true, validationStatus: null, consultantComment: 'Revisado pelo consultor.' });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800">Revisar Resposta ({question.id})</h2>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full" aria-label="Fechar modal"><X size={24} /></button>
                </header>
                <main className="p-5 sm:p-6 overflow-y-auto space-y-6">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <p className="text-base font-semibold text-slate-900">{question.text}</p>
                    </div>
                    <QuestionInput
                        question={question}
                        value={currentAnswer.value}
                        onChange={(value) => updateAnswer({ value })}
                    />
                    <EvidenceBlock
                        evidence={currentAnswer.evidence}
                        attachment={currentAnswer.attachment}
                        prompt={question.evidence_prompt}
                        onEvidenceChange={(evidence) => updateAnswer({ evidence })}
                        onFileChange={handleFileChange}
                        onRemoveAttachment={handleRemoveAttachment}
                    />
                </main>
                <footer className="flex-shrink-0 flex justify-end items-center gap-3 p-4 bg-slate-50 border-t border-slate-200">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg font-semibold text-white bg-teal-600 hover:bg-teal-700 flex items-center gap-2">
                        <Save size={16} /> Salvar Revisão
                    </button>
                </footer>
            </div>
        </div>
    );
};

const RefuseCommentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (comment: string) => void;
}> = ({ isOpen, onClose, onConfirm }) => {
    const [comment, setComment] = useState('');
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-slate-800">Justificativa da Recusa</h3>
                    <p className="text-sm text-slate-600 mt-1">Por favor, forneça uma breve justificativa para a recusa (opcional).</p>
                    <textarea 
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        className="w-full p-2 mt-4 border rounded-lg bg-slate-50 focus:ring-2 border-slate-300 focus:ring-teal-500"
                        rows={3}
                        placeholder="Ex: A evidência não suporta a resposta..."
                        autoFocus
                    />
                </div>
                <footer className="flex justify-end gap-3 p-4 bg-slate-50 border-t border-slate-200">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100">Cancelar</button>
                    <button onClick={() => onConfirm(comment)} className="px-4 py-2 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700">Confirmar Recusa</button>
                </footer>
            </div>
        </div>
    );
};

const ValidationWorkspace: React.FC<Omit<ConsultantAreaProps, 'diagnoses' | 'isGeneratingReport'> & {
  diagnosis: Diagnosis;
  onBack: () => void;
  isGeneratingReport: boolean;
}> = ({ diagnosis, onBack, onUpdateAnswerValidation, onAnswerUpdate, onGenerateValidatedReport, isGeneratingReport }) => {
    const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
    const [refusingQuestionId, setRefusingQuestionId] = useState<string | null>(null);
    
    const questions = ALL_QUESTIONS.filter(q => isAnswerProvided(diagnosis.answers[q.id]));
    const editingQuestion = useMemo(() => questions.find(q => q.id === editingQuestionId) || null, [editingQuestionId, questions]);
    
    const { total, validated, refused, pending } = useMemo(() => {
        const stats = { total: questions.length, validated: 0, refused: 0, pending: 0 };
        questions.forEach(q => {
            const status = diagnosis.answers[q.id]?.validationStatus;
            if (status === 'validated') stats.validated++;
            else if (status === 'refused') stats.refused++;
            else stats.pending++;
        });
        return stats;
    }, [questions, diagnosis.answers]);

    const allHandled = pending === 0;

    const handleGenerateReport = () => {
        if(window.confirm("Tem certeza que deseja finalizar a validação e gerar o relatório? Esta ação não poderá ser desfeita.")) {
            onGenerateValidatedReport(diagnosis.id);
        }
    };
    
    const formatAnswerForDisplay = (answer: Answer): React.ReactNode => {
        if (answer.value === null) return <em className="text-slate-600">Não Aplicável</em>;
        if (typeof answer.value === 'boolean') return answer.value ? 'Verdadeiro' : 'Falso';
        if (Array.isArray(answer.value)) return `${answer.value.length} opções selecionadas`;
        if (typeof answer.value === 'string' && answer.value.length > 50) return `"${answer.value.substring(0, 50)}..."`;
        return String(answer.value);
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-2 transition-colors">
                        <ChevronLeft size={18}/> Voltar para a lista
                    </button>
                    <h1 className="text-3xl font-bold text-slate-800">Validação do Diagnóstico</h1>
                    <p className="mt-1 text-slate-600">Empresa: <span className="font-semibold">{diagnosis.companyName}</span></p>
                </div>
                <button
                    onClick={handleGenerateReport}
                    disabled={!allHandled || isGeneratingReport}
                    className="px-4 py-2.5 rounded-lg font-semibold text-white bg-teal-600 hover:bg-teal-700 flex items-center justify-center gap-2 shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed"
                    title={!allHandled ? 'Valide todas as respostas pendentes para gerar o relatório' : 'Gerar Relatório Validado'}
                >
                    {isGeneratingReport ? (
                        <>
                            <Loader2 className="animate-spin mr-2" size={18}/>
                            Gerando...
                        </>
                    ) : (
                        <>
                            <Send size={18} />
                            Finalizar e Gerar Relatório
                        </>
                    )}
                </button>
            </header>
            
            {!allHandled && (
                <div className="p-4 bg-amber-50 border-l-4 border-amber-400 text-amber-800 rounded-r-lg shadow-sm">
                    <div className="flex">
                        <div className="flex-shrink-0"><AlertTriangle className="h-5 w-5 text-amber-500" /></div>
                        <div className="ml-3">
                            <p className="text-sm font-semibold">Validação pendente: {pending} resposta(s) aguardando revisão. Por favor, revise e valide ou recuse todas as respostas para gerar o relatório final.</p>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="p-4 text-left font-semibold text-slate-600 w-2/5">Pergunta</th>
                                <th className="p-4 text-left font-semibold text-slate-600">Resposta Original</th>
                                <th className="p-4 text-left font-semibold text-slate-600">Status</th>
                                <th className="p-4 text-center font-semibold text-slate-600">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {questions.map(q => {
                                const answer = diagnosis.answers[q.id];
                                if (!answer) return null;
                                return (
                                    <tr key={q.id} className="border-t border-slate-200 hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 align-top">
                                            <p className="font-semibold text-slate-800">{q.text}</p>
                                            <p className="font-mono text-xs text-slate-500 mt-1">{q.id} &bull; {q.reference}</p>
                                            <AiCheckDisplay aiCheck={answer.aiCheck} small />
                                        </td>
                                        <td className="p-4 align-top">
                                            <p className="font-semibold">{formatAnswerForDisplay(answer)}</p>
                                            <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{answer.evidence.substring(0, 100)}{answer.evidence.length > 100 ? '...' : ''}</p>
                                        </td>
                                        <td className="p-4 align-top">
                                            {answer.validationStatus === 'validated' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800"><CheckCircle2 size={14}/> Validado</span>}
                                            {answer.validationStatus === 'refused' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><X size={14}/> Recusado</span>}
                                            {!answer.validationStatus && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><Clock size={14}/> Pendente</span>}
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="flex items-center justify-center gap-2">
                                                <button title="Validar" onClick={() => onUpdateAnswerValidation(diagnosis.id, q.id, 'validated', 'Validado pelo consultor.')} className="p-2 text-slate-500 bg-slate-100 hover:bg-teal-100 hover:text-teal-700 rounded-full transition-colors"><Check size={18}/></button>
                                                <button title="Recusar" onClick={() => setRefusingQuestionId(q.id)} className="p-2 text-slate-500 bg-slate-100 hover:bg-red-100 hover:text-red-700 rounded-full transition-colors"><X size={18}/></button>
                                                <button title="Revisar" onClick={() => setEditingQuestionId(q.id)} className="p-2 text-slate-500 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 rounded-full transition-colors"><Edit size={18}/></button>
                                            </div>
                                            {answer.consultantComment && <p className="text-xs text-slate-500 italic text-center mt-2 flex items-center gap-1.5 justify-center" title={answer.consultantComment}><MessageSquare size={12}/> {answer.consultantComment}</p>}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingQuestion && (
                <ConsultantEditModal
                    isOpen={!!editingQuestion}
                    onClose={() => setEditingQuestionId(null)}
                    question={editingQuestion}
                    initialAnswer={diagnosis.answers[editingQuestion.id]}
                    onSave={(questionId, newAnswer) => onAnswerUpdate(diagnosis.id, questionId, newAnswer)}
                />
            )}
            
            {refusingQuestionId && (
                <RefuseCommentModal
                    isOpen={!!refusingQuestionId}
                    onClose={() => setRefusingQuestionId(null)}
                    onConfirm={(comment) => {
                        onUpdateAnswerValidation(diagnosis.id, refusingQuestionId!, 'refused', comment || 'Recusado pelo consultor.');
                        setRefusingQuestionId(null);
                    }}
                />
            )}
        </div>
    );
}

const ConsultantArea: React.FC<ConsultantAreaProps> = (props) => {
    const { diagnoses, isGeneratingReport } = props;
    const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis | null>(null);

    const { forValidation, validated } = useMemo(() => {
        const completed = diagnoses.filter(d => d.reportData);
        return {
            forValidation: completed.filter(d => !d.validatedReportData),
            validated: completed.filter(d => d.validatedReportData),
        }
    }, [diagnoses]);

    // This effect ensures that if the underlying diagnosis data changes (e.g., after generating a report),
    // the view updates accordingly.
    useEffect(() => {
        if(selectedDiagnosis) {
            const updatedDiagnosis = diagnoses.find(d => d.id === selectedDiagnosis.id);
            if (updatedDiagnosis) {
                setSelectedDiagnosis(updatedDiagnosis);
            }
        }
    }, [diagnoses, selectedDiagnosis]);

    if (selectedDiagnosis) {
        // If a validated report exists, show it.
        if (selectedDiagnosis.validatedReportData) {
            return (
                <div className="animate-fade-in">
                     <button onClick={() => setSelectedDiagnosis(null)} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-4 transition-colors">
                        <ChevronLeft size={18}/> Voltar para a lista de validação
                    </button>
                    <Report
                        reportData={selectedDiagnosis.validatedReportData}
                        topics={APP_TOPICS}
                        onBackToList={() => setSelectedDiagnosis(null)}
                        onReturnToEdit={() => {}}
                        activeTab="overview"
                        onTabChange={()=>{}} // Tab changes are not needed in this simplified view
                    />
                </div>
            );
        }
        // Otherwise, show the validation workspace.
        return <ValidationWorkspace diagnosis={selectedDiagnosis} onBack={() => setSelectedDiagnosis(null)} {...props} />;
    }
    
    return (
        <div className="animate-fade-in space-y-10">
            <header>
                <h1 className="text-3xl font-bold text-slate-800">Área de Validação do Consultor</h1>
                <p className="mt-2 text-slate-600">
                    Selecione um diagnóstico concluído para revisar, validar as respostas e gerar o relatório final validado.
                </p>
            </header>
            
            <section>
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Aguardando Validação ({forValidation.length})</h2>
                {forValidation.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {forValidation.map(d => (
                            <button key={d.id} onClick={() => setSelectedDiagnosis(d)} className="block bg-white text-left p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-teal-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2">
                                <h3 className="font-bold text-lg text-slate-800 truncate">{d.companyName}</h3>
                                <p className="text-sm text-slate-500 mt-1">Concluído em: {new Date(d.reportData!.generatedAt).toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'})}</p>
                                <div className="mt-4 font-semibold text-amber-700 bg-amber-100 border border-amber-200 inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-sm">
                                    <Clock size={14} />
                                    Pendente de Validação
                                </div>
                            </button>
                        ))}
                    </div>
                ) : <div className="text-center bg-white p-12 rounded-lg border-2 border-dashed border-slate-300"><p className="text-slate-500">Nenhum diagnóstico pronto para validação.</p></div>}
            </section>

            <section>
                <h2 className="text-2xl font-bold text-slate-800 mb-4 pt-6 border-t border-slate-200">Relatórios Validados ({validated.length})</h2>
                {validated.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         {validated.map(d => (
                            <button key={d.id} onClick={() => setSelectedDiagnosis(d)} className="block bg-white text-left p-5 rounded-xl border-2 border-teal-500 shadow-sm hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2">
                                <h3 className="font-bold text-lg text-slate-800 truncate">{d.companyName}</h3>
                                <p className="text-sm text-slate-500 mt-1">Validado em: {new Date(d.validatedReportData!.generatedAt).toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'})}</p>
                                <div className="mt-4 font-semibold text-teal-700 bg-teal-100 border border-teal-200 inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-sm">
                                    <CheckCircle2 size={14} />
                                    Relatório Validado
                                </div>
                            </button>
                        ))}
                    </div>
                ) : <div className="text-center bg-white p-12 rounded-lg border-2 border-dashed border-slate-300"><p className="text-slate-500">Nenhum diagnóstico validado ainda.</p></div>}
            </section>
        </div>
    );
};

export default ConsultantArea;
