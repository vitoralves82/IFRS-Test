import React from 'react';
import { LayoutList, Table2 } from 'lucide-react';

type FilterStatus = 'all' | 'answered' | 'unanswered';
type QuestionnaireViewMode = 'detailed' | 'summary';

interface QuestionnaireControlsProps {
  filterStatus: FilterStatus;
  onFilterChange: (status: FilterStatus) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  resultsCount: number;
  questionnaireViewMode: QuestionnaireViewMode;
  onQuestionnaireViewModeChange: (mode: QuestionnaireViewMode) => void;
}

const FilterButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
      isActive
        ? 'bg-teal-600 text-white shadow-sm'
        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300'
    }`}
  >
    {label}
  </button>
);

const QuestionnaireControls: React.FC<QuestionnaireControlsProps> = ({
  filterStatus,
  onFilterChange,
  searchQuery,
  onSearchChange,
  resultsCount,
  questionnaireViewMode,
  onQuestionnaireViewModeChange
}) => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
        <div className="flex items-center gap-2 p-1 bg-slate-200/60 rounded-full">
          <FilterButton label="Todas" isActive={filterStatus === 'all'} onClick={() => onFilterChange('all')} />
          <FilterButton label="Respondidas" isActive={filterStatus === 'answered'} onClick={() => onFilterChange('answered')} />
          <FilterButton label="Não Respondidas" isActive={filterStatus === 'unanswered'} onClick={() => onFilterChange('unanswered')} />
        </div>
        <div className="h-6 w-px bg-slate-300 hidden md:block"></div>
        <div className="relative flex w-full max-w-xs sm:w-auto items-center bg-slate-200/70 p-1 rounded-full">
            <span
                className="absolute top-1 left-1 h-[calc(100%-0.5rem)] w-[calc(50%-0.25rem)] bg-white rounded-full shadow-md transition-transform duration-300 ease-in-out"
                style={{
                    transform: questionnaireViewMode === 'summary' ? 'translateX(100%)' : 'translateX(0)',
                }}
            />
            <button
                onClick={() => onQuestionnaireViewModeChange('detailed')}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-semibold transition-colors rounded-full focus:outline-none ${
                    questionnaireViewMode === 'detailed' ? 'text-teal-700' : 'text-slate-600'
                }`}
                aria-pressed={questionnaireViewMode === 'detailed'}
            >
                <LayoutList className="w-4 h-4" />
                Detalhado
            </button>
            <button
                onClick={() => onQuestionnaireViewModeChange('summary')}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-semibold transition-colors rounded-full focus:outline-none ${
                    questionnaireViewMode === 'summary' ? 'text-teal-700' : 'text-slate-600'
                }`}
                aria-pressed={questionnaireViewMode === 'summary'}
            >
                <Table2 className="w-4 h-4" />
                Resumo
            </button>
        </div>
      </div>

      <div className="relative w-full md:w-auto">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={`Pesquisar em ${resultsCount} perguntas...`}
          className="w-full sm:w-72 pl-10 pr-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
        />
      </div>
    </div>
  );
};

export default QuestionnaireControls;