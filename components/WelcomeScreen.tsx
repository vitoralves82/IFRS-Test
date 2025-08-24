
import React, { useState, useCallback } from 'react';
import { WITT_OBRIENS_LOGO_URL } from '../constants/logo';
import { FileText, UploadCloud, ArrowLeft, Loader2 } from 'lucide-react';

interface WelcomeScreenProps {
  onStart: (companyName: string) => void;
  onStartFromReport: (companyName: string, file: File) => void;
  isAnalyzing: boolean;
}

const OptionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}> = ({ icon, title, description, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex-1 p-8 rounded-xl border-2 border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-4"
  >
    {icon}
    <h3 className="mt-4 text-xl font-bold text-slate-800">{title}</h3>
    <p className="mt-2 text-slate-600 text-sm max-w-xs">{description}</p>
  </button>
);

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart, onStartFromReport, isAnalyzing }) => {
  const [mode, setMode] = useState<'options' | 'new' | 'fromReport'>('options');
  const [companyName, setCompanyName] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleStartNew = () => {
    if (companyName.trim()) {
      onStart(companyName.trim());
    }
  };
  
  const handleStartFromReport = () => {
    if (companyName.trim() && file) {
      onStartFromReport(companyName.trim(), file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        setFile(selectedFile);
      }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) {
          setFile(droppedFile);
      }
  };

  const handleBack = () => {
    setMode('options');
    setCompanyName('');
    setFile(null);
  };
  
  const renderContent = () => {
    switch (mode) {
      case 'new':
        return (
          <>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Novo Diagnóstico</h1>
            <p className="mt-4 text-slate-600">Insira o nome da empresa para iniciar um novo questionário do zero.</p>
            <div className="mt-8">
              <label htmlFor="company-name-new" className="sr-only">Nome da Empresa</label>
              <input
                id="company-name-new"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartNew()}
                placeholder="Digite o nome da sua empresa"
                className="w-full px-4 py-3 text-center border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                autoFocus
              />
            </div>
            <div className="mt-6">
              <button
                onClick={handleStartNew}
                disabled={!companyName.trim()}
                className="w-full px-8 py-3 rounded-lg font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                Iniciar Diagnóstico
              </button>
            </div>
          </>
        );
      case 'fromReport':
        return (
          <>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Basear em Relatório</h1>
            <p className="mt-4 text-slate-600">Forneça um relatório de sustentabilidade (PDF, DOCX) e nossa IA preencherá o questionário para você.</p>
            <div className="mt-8 space-y-6">
                <div>
                    <label htmlFor="company-name-report" className="sr-only">Nome da Empresa</label>
                    <input
                        id="company-name-report"
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Digite o nome da sua empresa"
                        className="w-full px-4 py-3 text-center border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                        autoFocus
                    />
                </div>
                <div 
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="relative w-full p-6 border-2 border-dashed border-slate-300 rounded-lg text-center bg-slate-50 transition-colors hover:border-teal-400 hover:bg-teal-50/50"
                >
                    <UploadCloud className="mx-auto h-10 w-10 text-slate-400" />
                    <p className="mt-2 text-sm text-slate-600">
                      {file ? (
                          <span className="font-semibold text-teal-700">{file.name}</span>
                      ) : (
                          <>Arraste e solte o arquivo aqui ou <span className="font-semibold text-teal-600">procure</span></>
                      )}
                    </p>
                    <input type="file" id="file-upload" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
                </div>
            </div>
            <div className="mt-6">
              <button
                onClick={handleStartFromReport}
                disabled={!companyName.trim() || !file || isAnalyzing}
                className="w-full px-8 py-3 rounded-lg font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5" />
                    Analisando Relatório...
                  </>
                ) : (
                  'Analisar e Iniciar'
                )}
              </button>
            </div>
          </>
        );
      case 'options':
      default:
        return (
          <>
            <img 
              src={WITT_OBRIENS_LOGO_URL} 
              alt="Witt O'Brien's Logo" 
              className="mx-auto h-20 mb-6 rounded-md"
            />
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Diagnóstico IFRS S1 & S2</h1>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto">Esta ferramenta irá guiá-lo através de uma avaliação de conformidade com as normas de divulgação de sustentabilidade da IFRS. Como você gostaria de começar?</p>
            <div className="mt-10 flex flex-col sm:flex-row items-stretch gap-6">
              <OptionCard 
                icon={<FileText size={48} className="text-teal-600" strokeWidth={1.5} />}
                title="Criar diagnóstico"
                description="Comece um novo questionário do zero e preencha manualmente."
                onClick={() => setMode('new')}
              />
              <OptionCard 
                icon={<UploadCloud size={48} className="text-teal-600" strokeWidth={1.5} />}
                title="Basear em relatório"
                description="Faça o upload de um relatório e deixe a IA preencher o questionário para você."
                onClick={() => setMode('fromReport')}
              />
            </div>
          </>
        );
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-3xl mx-auto bg-white rounded-xl shadow-xl p-8 sm:p-12 text-center border border-slate-200 relative">
        {mode !== 'options' && (
          <button onClick={handleBack} className="absolute top-4 left-4 p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors" aria-label="Voltar">
            <ArrowLeft className="h-6 w-6" />
          </button>
        )}
        {renderContent()}
      </div>
    </div>
  );
};

export default WelcomeScreen;