
import React from 'react';
import type { Topic } from '../types';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';

interface SidebarProps {
  topics: Topic[];
  currentTopicName: string;
  onSelectTopic: (topicName: string) => void;
  progress: {
    answered: number;
    total: number;
  };
  onSendReport: () => void;
  isSending: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ topics, currentTopicName, onSelectTopic, progress, onSendReport, isSending, isCollapsed, onToggleCollapse }) => {
    const percentage = progress.total > 0 ? (progress.answered / progress.total) * 100 : 0;

  return (
    <div className="w-full bg-white rounded-xl shadow-lg p-4 flex flex-col border border-slate-200 h-full">
      <div className={`flex flex-col h-full overflow-hidden`}>
        <div className={`flex items-center mb-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <h2 className={`text-lg font-semibold text-slate-900 transition-all duration-200 ${isCollapsed ? 'sr-only' : ''}`}>Categorias</h2>
            <button
                onClick={onToggleCollapse}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
            >
                {isCollapsed ? <ChevronsRight size={18} className="text-slate-600" /> : <ChevronsLeft size={18} className="text-slate-600" />}
            </button>
        </div>

        <nav className="flex-1 space-y-1">
          {topics.map((topic) => {
            const Icon = topic.icon;
            const isActive = topic.name === currentTopicName;
            return (
              <button
                key={topic.name}
                onClick={() => onSelectTopic(topic.name)}
                title={isCollapsed ? topic.name : ''}
                className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-colors text-left ${isCollapsed ? 'justify-center p-3' : 'px-3 py-2.5'} ${
                  isActive
                    ? 'bg-teal-100 text-teal-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-teal-700' : 'text-slate-500'}`} />
                <span className={`whitespace-nowrap ${isCollapsed ? 'sr-only' : ''}`}>{topic.name}</span>
              </button>
            );
          })}
        </nav>
        <div className="mt-4 pt-4 border-t border-slate-200">
          <h3 className={`text-sm font-semibold text-slate-900 px-2 mb-2 transition-all duration-200 ${isCollapsed ? 'sr-only' : ''}`}>Progresso Geral</h3>
          <div className={`${isCollapsed ? '' : 'px-2'}`}>
              <div className={`flex justify-between text-xs text-slate-500 mb-1 ${isCollapsed ? 'sr-only' : ''}`}>
                  <span>{progress.answered} de {progress.total}</span>
                  <span>{Math.round(percentage)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                      className="bg-teal-600 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${percentage}%` }}
                  ></div>
              </div>
              {isCollapsed && (
                  <p className="text-center text-xs font-semibold mt-2 text-slate-600">{Math.round(percentage)}%</p>
              )}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200">
            <button
              onClick={onSendReport}
              disabled={isSending}
              title={isCollapsed ? 'Gerar Relatório' : ''}
              className={`w-full rounded-lg font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed ${isCollapsed ? 'p-3' : 'px-4 py-2.5'}`}
            >
              {isSending ? (
                  <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className={`${isCollapsed ? 'sr-only' : ''}`}>Gerando Relatório...</span>
                  </>
              ) : (
                  <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      <span className={`${isCollapsed ? 'sr-only' : ''}`}>Gerar Relatório</span>
                  </>
              )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
