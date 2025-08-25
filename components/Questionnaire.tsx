import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import type { Question, Answer, AnswersState, Attachment, AnswerValue, QuestionType, Topic, AiCheckResult } from '../types';
import { isAnswerProvided, formatAnswerForPrompt } from '../App';
import { Sparkles, Loader2 } from 'lucide-react';
import AiCheckDisplay from './AiCheckDisplay';


// --- Helper functions and constants ---
const isAnswerValueProvided = (val: AnswerValue): boolean => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string') return val.trim() !== '';
    if (Array.isArray(val)) return val.length > 0;
    return typeof val === 'boolean';
};

// --- Input Components ---

const BooleanInput: React.FC<{ value: boolean | null, onChange: (value: boolean) => void }> = ({ value, onChange }) => (
  <div className="flex space-x-2">
    <button
      type="button"
      onClick={() => onChange(true)}
      className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 border-2 ${
        value === true
          ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
          : 'bg-white text-slate-700 border-slate-300 hover:border-teal-500 hover:text-teal-600'
      }`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      Verdadeiro
    </button>
    <button
      type="button"
      onClick={() => onChange(false)}
      className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 border-2 ${
        value === false
          ? 'bg-red-600 text-white border-red-600 shadow-sm'
          : 'bg-white text-slate-700 border-slate-300 hover:border-red-500 hover:text-red-600'
      }`}
    >
       <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      Falso
    </button>
  </div>
);

const TextInput: React.FC<{ value: string, onChange: (value: string) => void }> = ({ value, onChange }) => (
    <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 border rounded-lg bg-white text-slate-800 focus:ring-2 transition border-slate-300 focus:ring-teal-500 focus:border-teal-500"
        placeholder="Digite sua resposta"
    />
);

const TextBlockInput: React.FC<{ value: string, onChange: (value: string) => void }> = ({ value, onChange }) => (
    <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full p-3 border rounded-lg bg-white text-slate-800 focus:ring-2 transition border-slate-300 focus:ring-teal-500 focus:border-teal-500"
        placeholder="Digite sua resposta detalhada"
    />
);

const SingleChoiceInput: React.FC<{ value: string | null, onChange: (value: string) => void, options: string[] }> = ({ value, onChange, options }) => (
    <div className="space-y-2">
        {options.map(option => (
            <label key={option} className="flex items-center p-3 border rounded-lg cursor-pointer transition-all hover:border-teal-500 has-[:checked]:bg-teal-50 has-[:checked]:border-teal-500">
                <input
                    type="radio"
                    name={option}
                    value={option}
                    checked={value === option}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-4 w-4 text-teal-600 border-slate-400 focus:ring-teal-500"
                />
                <span className="ml-3 text-slate-800 font-medium">{option}</span>
            </label>
        ))}
    </div>
);

const MultipleChoiceInput: React.FC<{ value: string[], onChange: (value: string[]) => void, options: string[] }> = ({ value, onChange, options }) => {
    const handleChange = (option: string, checked: boolean) => {
        const newValue = checked
            ? [...value, option]
            : value.filter(v => v !== option);
        onChange(newValue);
    };

    return (
        <div className="space-y-2">
            {options.map(option => (
                <label key={option} className="flex items-center p-3 border rounded-lg cursor-pointer transition-all hover:border-teal-500 has-[:checked]:bg-teal-50 has-[:checked]:border-teal-500">
                    <input
                        type="checkbox"
                        value={option}
                        checked={value.includes(option)}
                        onChange={(e) => handleChange(option, e.target.checked)}
                        className="h-4 w-4 text-teal-600 border-slate-400 rounded focus:ring-teal-500"
                    />
                    <span className="ml-3 text-slate-800 font-medium">{option}</span>
                </label>
            ))}
        </div>
    );
};


export const QuestionInput: React.FC<{ question: Question, value: AnswerValue, onChange: (value: AnswerValue) => void }> = ({ question, value, onChange }) => {
    switch (question.type) {
        case 'boolean':
            return <BooleanInput value={value as boolean | null} onChange={onChange} />;
        case 'text':
            return <TextInput value={value as string || ''} onChange={onChange} />;
        case 'text_block':
            return <TextBlockInput value={value as string || ''} onChange={onChange} />;
        case 'single_choice':
            return <SingleChoiceInput value={value as string | null} onChange={onChange} options={question.options!} />;
        case 'multiple_choice':
            return <MultipleChoiceInput value={value as string[] || []} onChange={onChange} options={question.options!} />;
        default:
            return <p>Tipo de pergunta não suportado.</p>;
    }
};

export const EvidenceBlock: React.FC<{
    evidence: string;
    attachment?: Attachment;
    prompt: string;
    onEvidenceChange: (value: string) => void;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveAttachment: () => void;
}> = ({ evidence, attachment, prompt, onEvidenceChange, onFileChange, onRemoveAttachment }) => {
    return (
        <div className="mt-6 pt-6 border-t border-slate-200">
             <h4 className="text-sm font-bold text-slate-600 mb-3">Evidência e Justificativa</h4>
             <div className="space-y-4">
                <textarea
                    value={evidence}
                    onChange={(e) => onEvidenceChange(e.target.value)}
                    placeholder={prompt}
                    rows={4}
                    className="w-full p-3 pr-4 border rounded-lg bg-slate-50 text-slate-800 focus:ring-2 transition border-slate-300 focus:ring-teal-500 focus:border-teal-500 focus:bg-white"
                />
                <div>
                    {attachment ? (
                        <div className="flex items-center justify-between p-3 bg-slate-100 border border-slate-200 rounded-lg">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 flex-shrink-0"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                                <span className="text-sm font-medium text-slate-800 truncate" title={attachment.name}>{attachment.name}</span>
                            </div>
                            <button onClick={onRemoveAttachment} className="p-1.5 text-slate-500 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors flex-shrink-0" aria-label="Remover anexo">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                        </div>
                    ) : (
                        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-slate-700 bg-white border-2 border-slate-300 hover:border-teal-500 hover:text-teal-600 transition-colors shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.59a2 2 0 0 1-2.83-2.83l.79-.79"/></svg>
                            Anexar Evidência
                            <input type="file" className="hidden" onChange={onFileChange} accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx" />
                        </label>
                    )}
                    <p className="text-xs text-slate-500 mt-2">Tipos aceitos: PDF, JPG, PNG, TXT, DOC, DOCX. Tamanho máximo: 2MB.</p>
                </div>
            </div>
        </div>
    );
};

// --- Modal for Editing Question ---
const EditQuestionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  question: Question;
  initialAnswer: Answer;
  onAnswer: (questionId: string, answer: Answer) => void;
}> = ({ isOpen, onClose, question, initialAnswer, onAnswer }) => {
    const [currentAnswer, setCurrentAnswer] = useState(initialAnswer);
    const [isAiChecking, setIsAiChecking] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCurrentAnswer(initialAnswer);
            setIsAiChecking(false);
        }
    }, [isOpen, initialAnswer]);

    if (!isOpen) return null;

    const updateAnswer = (updatedFields: Partial<Answer>) => {
        setCurrentAnswer(prev => ({ ...prev, ...updatedFields }));
    };

    const handleAiCheck = async () => {
        setIsAiChecking(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    status: { type: Type.STRING, description: 'Avaliação da resposta. Valores: "sufficient", "insufficient", "partial".' },
                    feedback: { type: Type.STRING, description: 'Justificativa concisa para a avaliação do status.' },
                    improvementSuggestion: { type: Type.STRING, description: 'Recomendação clara e construtiva de como a resposta pode ser melhorada para atingir a conformidade total, com base no requisito da norma.' }
                },
                required: ['status', 'feedback', 'improvementSuggestion'],
            };
            const promptText = `Você é um consultor especialista em conformidade com as normas IFRS S1 e S2. Sua tarefa é analisar criticamente se uma resposta e sua evidência atendem a um requisito específico da norma.

- Requisito da Norma (${question.reference}): "${question.reference_text || 'Não especificado.'}"
- Pergunta de Conformidade: "${question.text}"
- Resposta do Usuário: "${formatAnswerForPrompt(currentAnswer.value, question.type)}"
- Evidência do Usuário: "${currentAnswer.evidence || 'Nenhuma evidência fornecida.'}"

Avalie a resposta com base nos seguintes critérios:
1.  **Status**: A resposta é 'sufficient' (atende completamente), 'partial' (atende parcialmente) ou 'insufficient' (não atende)?
2.  **Feedback**: Justifique sua avaliação de status de forma concisa.
3.  **Sugestão de Melhoria**: Forneça uma recomendação clara e construtiva. Descreva como a resposta poderia ser melhorada para atingir a conformidade total, citando o que está faltando ou o que deveria ser incluído, com base no requisito da norma.

Forneça sua avaliação em formato JSON, seguindo o esquema definido.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash', contents: promptText,
                config: { responseMimeType: 'application/json', responseSchema, temperature: 0.1 }
            });
            const result = JSON.parse(response.text.trim());
            updateAnswer({ aiCheck: result as AiCheckResult });
        } catch (error) {
            console.error("Error with AI Check:", error);
            alert("Ocorreu um erro ao verificar com a IA.");
        } finally {
            setIsAiChecking(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { alert(`O tamanho máximo é 2MB.`); e.target.value = ''; return; }
        const reader = new FileReader();
        reader.onload = (event) => updateAnswer({ attachment: { name: file.name, type: file.type, content: event.target?.result as string } });
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleRemoveAttachment = () => {
        const { attachment, ...rest } = currentAnswer;
        setCurrentAnswer(rest);
    };

    const handleSave = () => {
        onAnswer(question.id, { ...currentAnswer, confirmed: true });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 flex-shrink-0">
                    <h2 className="text-lg font-bold text-slate-800">Editar Resposta ({question.id})</h2>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors" aria-label="Fechar modal">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </header>
                <main className="p-5 sm:p-6 overflow-y-auto space-y-6">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <p className="text-base font-semibold text-slate-900">{question.text}</p>
                        <p className="mt-2 text-xs font-mono text-slate-600 bg-slate-200 inline-block px-2 py-0.5 rounded">{question.reference}</p>
                    </div>
                    <div>
                        <QuestionInput
                            question={question}
                            value={currentAnswer.value}
                            onChange={(value) => updateAnswer({ value })}
                        />
                    </div>
                    <EvidenceBlock
                        evidence={currentAnswer.evidence}
                        attachment={currentAnswer.attachment}
                        prompt={question.evidence_prompt}
                        onEvidenceChange={(evidence) => updateAnswer({ evidence })}
                        onFileChange={handleFileChange}
                        onRemoveAttachment={handleRemoveAttachment}
                    />
                    <AiCheckDisplay aiCheck={currentAnswer.aiCheck} />
                </main>
                <footer className="flex-shrink-0 flex justify-end items-center gap-3 p-4 bg-slate-50 border-t border-slate-200">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors shadow-sm">
                        Cancelar
                    </button>
                    <button onClick={handleAiCheck} disabled={isAiChecking || !isAnswerValueProvided(currentAnswer.value)} className="px-4 py-2 rounded-lg font-semibold text-teal-700 bg-teal-100 border border-teal-200 hover:bg-teal-200/60 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isAiChecking ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        Verificar com IA
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-sm">
                        Salvar Alterações
                    </button>
                </footer>
            </div>
        </div>
    );
};

// --- Summary View ---
const SummaryView: React.FC<{
  allQuestions: Question[];
  allTopics: Topic[];
  answers: AnswersState;
  onAnswer: (questionId: string, answer: Answer) => void;
}> = ({ allQuestions, allTopics, answers, onAnswer }) => {
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

    const handleEditClick = (question: Question) => {
        setEditingQuestion(question);
    };

    const editingAnswer = editingQuestion ? (answers[editingQuestion.id] ?? { value: null, evidence: '' }) : undefined;

    const getSummaryAnswerText = (question: Question, answer: Answer | undefined): React.ReactNode => {
        if (!isAnswerProvided(answer)) {
            return <span className="text-slate-500 italic">Pendente</span>;
        }
        const value = answer!.value;
        if (value === null) {
            return <span className="font-semibold text-slate-600">Não Aplicável</span>;
        }
        switch (question.type) {
            case 'boolean':
                return value ? <span className="font-semibold text-teal-700">Verdadeiro</span> : <span className="font-semibold text-red-700">Falso</span>;
            case 'single_choice':
                return <span className="text-slate-800">{String(value)}</span>;
            case 'multiple_choice':
                return <span className="text-slate-800">{(value as string[]).length} selecionado(s)</span>;
            default:
                return <span className="font-semibold text-slate-700">Preenchido</span>;
        }
    };
    
    return (
        <div className="bg-white rounded-xl shadow-lg p-0 sm:p-2 mt-2 border border-slate-200 animate-fade-in">
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                    <thead className="bg-slate-50">
                        <tr>
                            <th scope="col" className="p-4 text-left text-sm font-semibold text-slate-600">Código</th>
                            <th scope="col" className="p-4 text-left text-sm font-semibold text-slate-600 w-2/5">Elemento a Reportar</th>
                            <th scope="col" className="p-4 text-left text-sm font-semibold text-slate-600">Referência</th>
                            <th scope="col" className="p-4 text-left text-sm font-semibold text-slate-600">Resposta</th>
                            <th scope="col" className="p-4 text-left text-sm font-semibold text-slate-600">Status</th>
                            <th scope="col" className="p-4 text-left text-sm font-semibold text-slate-600">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allTopics.map(topic => {
                            const questionsInTopic = allQuestions.filter(q => q.topic === topic.name);
                            if (questionsInTopic.length === 0) {
                                return null;
                            }
                            return (
                                <React.Fragment key={topic.name}>
                                    <tr className="bg-slate-100 border-t border-b border-slate-200">
                                        <td colSpan={6} className="p-3 text-md font-bold text-slate-700">{topic.name}</td>
                                    </tr>
                                    {questionsInTopic.map((question) => {
                                        const answer = answers[question.id];
                                        const answered = isAnswerProvided(answer);
                                        return (
                                            <tr key={question.id} className="border-b border-slate-200 transition-colors hover:bg-slate-50">
                                                <td className="p-4 text-sm font-medium whitespace-nowrap text-slate-500">{question.id}</td>
                                                <td className="p-4 text-sm text-slate-800">{question.text}</td>
                                                <td className="p-4 text-sm font-mono whitespace-nowrap text-slate-600">{question.reference}</td>
                                                <td className="p-4 text-sm">{getSummaryAnswerText(question, answer)}</td>
                                                <td className="p-4 text-sm whitespace-nowrap">
                                                    {answered ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">Respondida</span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pendente</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-sm whitespace-nowrap">
                                                    <button onClick={() => handleEditClick(question)} className="flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:text-teal-800 transition-colors">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                                                        {answered ? 'Editar' : 'Responder'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {editingQuestion && editingAnswer && (
                <EditQuestionModal
                    isOpen={!!editingQuestion}
                    onClose={() => setEditingQuestion(null)}
                    question={editingQuestion}
                    initialAnswer={editingAnswer}
                    onAnswer={onAnswer}
                />
            )}
        </div>
    );
};

const QuestionCard: React.FC<{
  question: Question;
  initialAnswer: Answer;
  onAnswer: (questionId: string, answer: Answer) => void;
  isSearching: boolean;
}> = ({ question, initialAnswer, onAnswer, isSearching }) => {
    const [answer, setAnswer] = useState<Answer>(initialAnswer);
    const [isDirty, setIsDirty] = useState(false);
    const [visibleInfo, setVisibleInfo] = useState(false);
    const [isAiChecking, setIsAiChecking] = useState(false);

    useEffect(() => {
        setAnswer(initialAnswer);
        setIsDirty(false);
        setIsAiChecking(false);
    }, [initialAnswer]);
    
    const updateAnswerState = (updatedFields: Partial<Answer>) => {
        setAnswer(prev => ({ ...prev, ...updatedFields }));
        setIsDirty(true);
    };

    const handleAiCheck = async () => {
        setIsAiChecking(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    status: { type: Type.STRING, description: 'Avaliação da resposta. Valores: "sufficient", "insufficient", "partial".' },
                    feedback: { type: Type.STRING, description: 'Justificativa concisa para a avaliação do status.' },
                    improvementSuggestion: { type: Type.STRING, description: 'Recomendação clara e construtiva de como a resposta pode ser melhorada para atingir a conformidade total, com base no requisito da norma.' }
                },
                required: ['status', 'feedback', 'improvementSuggestion'],
            };
            const promptText = `Você é um consultor especialista em conformidade com as normas IFRS S1 e S2. Sua tarefa é analisar criticamente se uma resposta e sua evidência atendem a um requisito específico da norma.

- Requisito da Norma (${question.reference}): "${question.reference_text || 'Não especificado.'}"
- Pergunta de Conformidade: "${question.text}"
- Resposta do Usuário: "${formatAnswerForPrompt(answer.value, question.type)}"
- Evidência do Usuário: "${answer.evidence || 'Nenhuma evidência fornecida.'}"

Avalie a resposta com base nos seguintes critérios:
1.  **Status**: A resposta é 'sufficient' (atende completamente), 'partial' (atende parcialmente) ou 'insufficient' (não atende)?
2.  **Feedback**: Justifique sua avaliação de status de forma concisa.
3.  **Sugestão de Melhoria**: Forneça uma recomendação clara e construtiva. Descreva como a resposta poderia ser melhorada para atingir a conformidade total, citando o que está faltando ou o que deveria ser incluído, com base no requisito da norma.

Forneça sua avaliação em formato JSON, seguindo o esquema definido.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash', contents: promptText,
                config: { responseMimeType: 'application/json', responseSchema, temperature: 0.1 }
            });
            const result = JSON.parse(response.text.trim());
            updateAnswerState({ aiCheck: result as AiCheckResult });
        } catch (error) {
            console.error("Error with AI Check:", error);
            alert("Ocorreu um erro ao verificar com a IA.");
        } finally {
            setIsAiChecking(false);
        }
    };

    const handleConfirm = () => {
        onAnswer(question.id, { ...answer, confirmed: true });
        setIsDirty(false);
    };

    const toggleInfo = () => {
        setVisibleInfo(prev => !prev);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) { alert(`O tamanho máximo é 2MB.`); e.target.value = ''; return; }

        const reader = new FileReader();
        reader.onload = (event) => updateAnswerState({ attachment: { name: file.name, type: file.type, content: event.target?.result as string } });
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleRemoveAttachment = () => {
        const { attachment, ...rest } = answer;
        updateAnswerState(rest);
    };

    return (
        <div className="relative bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-fade-in transition-all duration-300 hover:shadow-md hover:border-slate-300">
            {isSearching && (
                <div className="absolute top-3 left-4 text-xs font-bold text-teal-800 bg-teal-100 px-2.5 py-1 rounded-full border border-teal-200">
                    {question.topic}
                </div>
            )}
            <h3 className={`text-base font-semibold text-slate-800 leading-relaxed ${isSearching ? 'pt-8 sm:pt-0' : ''}`}>
                {question.text}
            </h3>
            
            <div className="mt-3 flex items-center gap-x-2">
                <p className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                {question.reference}
                </p>
                {question.reference_text && (
                <button
                    onClick={toggleInfo}
                    className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 focus:ring-offset-white transition-colors"
                    aria-label="Saiba mais sobre a referência"
                    aria-expanded={visibleInfo}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                </button>
                )}
            </div>
            
            {visibleInfo && question.reference_text && (
                <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-inner animate-fade-in">
                    <div className="text-sm text-slate-700 font-medium leading-relaxed">
                        {question.reference_text.split('---').map((part, index, arr) => {
                            const trimmedPart = part.trim();
                            const titleMatch = trimmedPart.match(/^(IFRS S\d[^:]+):\s*/);
                            
                            let title = '';
                            let body = '';
                            
                            if (titleMatch) {
                                title = titleMatch[1].replace(/§/g, 'Paragraph ');
                                body = trimmedPart.substring(titleMatch[0].length);
                            } else {
                                if (index === 0) {
                                    title = question.reference
                                        .replace(/§/g, 'Paragraph ')
                                        .replace(/\.([\d\w-]+)/g, ', Paragraph $1')
                                        .replace(/, /g, ' & ');
                                }
                                body = trimmedPart.replace(/^([A-Z]?\d+)\s*/, '');
                            }

                            return (
                               <div key={index}>
                                    {title && <p className="font-bold text-slate-900 mb-1">{title}</p>}
                                    <p className="whitespace-pre-wrap leading-relaxed">{body}</p>
                                    {index < arr.length - 1 && <hr className="my-3 border-slate-300" />}
                               </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="mt-5">
                <QuestionInput
                    question={question}
                    value={answer.value}
                    onChange={(value) => updateAnswerState({ value })}
                />
            </div>
            
            <EvidenceBlock
                evidence={answer.evidence}
                attachment={answer.attachment}
                prompt={question.evidence_prompt}
                onEvidenceChange={(evidence) => updateAnswerState({ evidence })}
                onFileChange={handleFileChange}
                onRemoveAttachment={handleRemoveAttachment}
            />

            <AiCheckDisplay aiCheck={answer.aiCheck} />
            
            <div className="mt-6 pt-6 border-t border-slate-200 flex flex-wrap justify-end items-center gap-3">
                 <button
                    onClick={handleAiCheck}
                    disabled={isAiChecking || !isAnswerValueProvided(answer.value)}
                    className="px-4 py-2 rounded-lg font-semibold text-teal-700 bg-teal-100 border border-teal-200 hover:bg-teal-200/60 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isAiChecking ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    Verificar com IA
                </button>
                <button
                    onClick={handleConfirm}
                    disabled={!isDirty && initialAnswer.confirmed}
                    className="px-6 py-2 rounded-lg font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                >
                    {initialAnswer.confirmed ? 'Atualizar' : 'Confirmar'}
                </button>
            </div>
        </div>
    );
};


interface QuestionnaireProps {
  topic: Topic;
  questionsForTopic: Question[];
  answers: AnswersState;
  onAnswer: (questionId: string, answer: Answer) => void;
  questionnaireViewMode: 'detailed' | 'summary';
  allQuestions: Question[];
  allTopics: Topic[];
  isSearching: boolean;
}

const Questionnaire: React.FC<QuestionnaireProps> = ({ 
    topic, 
    questionsForTopic, 
    answers, 
    onAnswer,
    questionnaireViewMode,
    allQuestions,
    allTopics,
    isSearching,
}) => {

  if (questionnaireViewMode === 'summary') {
    return (
        <SummaryView
            allQuestions={allQuestions}
            allTopics={allTopics}
            answers={answers}
            onAnswer={onAnswer}
        />
    );
  }

  // Detailed View Logic
  if (questionsForTopic.length === 0) {
    return (
        <div className="w-full bg-white rounded-xl shadow-lg p-8 flex flex-col items-center justify-center text-center h-full border border-slate-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 mb-4">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="11" y1="8" x2="11" y2="14" />
            </svg>
            <h2 className="text-2xl font-bold text-slate-800">{isSearching ? 'Nenhum resultado para a busca' : 'Nenhuma pergunta encontrada'}</h2>
            <p className="mt-2 max-w-md mx-auto text-slate-600">
                 {isSearching
                    ? "Tente refinar sua busca ou alterar os filtros para encontrar o que procura."
                    : "Não há perguntas que correspondam aos seus critérios de filtros neste tópico. Tente selecionar outro tópico ou limpar a busca."}
            </p>
        </div>
    );
  }

  return (
    <div className="w-full">
      <div className="space-y-6">
        {questionsForTopic.map((question) => (
            <QuestionCard
                key={question.id}
                question={question}
                initialAnswer={answers[question.id] ?? { value: null, evidence: '' }}
                onAnswer={onAnswer}
                isSearching={isSearching}
            />
        ))}
      </div>
    </div>
  );
};

export default Questionnaire;