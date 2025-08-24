
import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Diagnosis, Folder } from '../types';

interface MoveMenuProps {
  diagnosis: Diagnosis;
  folders: Folder[];
  onMove: (diagnosisId: string, folderId: string | null) => void;
  onClose: () => void;
}

const MoveMenu: React.FC<MoveMenuProps> = ({ diagnosis, folders, onMove, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    return (
        <div ref={menuRef} className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg border border-slate-200 z-10">
            <ul className="py-1">
                {folders.map(folder => (
                    <li key={folder.id}>
                        <button
                            onClick={() => { onMove(diagnosis.id, folder.id); onClose(); }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                            disabled={diagnosis.folderId === folder.id}
                        >
                            {folder.name}
                        </button>
                    </li>
                ))}
                {diagnosis.folderId && (
                    <>
                     {folders.length > 0 && <div className="my-1 h-px bg-slate-200" />}
                     <li>
                        <button
                            onClick={() => { onMove(diagnosis.id, null); onClose(); }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                            Remover da pasta
                        </button>
                    </li>
                    </>
                )}
            </ul>
        </div>
    );
};

interface ReportCardProps {
    d: Diagnosis;
    folders: Folder[];
    onLoad: (id: string) => void;
    onDelete: (id: string) => void;
    onMoveToFolder: (diagnosisId: string, folderId: string | null) => void;
    isBeingDragged: boolean;
    onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
}

const ReportCard: React.FC<ReportCardProps> = ({ d, folders, onLoad, onDelete, onMoveToFolder, isBeingDragged, onDragStart, onDragEnd }) => {
    const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false);

    return (
        <div 
            key={d.id} 
            draggable="true"
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className={`bg-white rounded-xl border border-slate-200 flex flex-col justify-between overflow-hidden animate-fade-in transition-all duration-200 cursor-grab active:cursor-grabbing ${isBeingDragged ? 'opacity-40 border-teal-400 shadow-none scale-95' : 'shadow-sm hover:shadow-lg hover:border-slate-300'}`}
        >
            <div className="p-5">
                <h2 className="text-lg font-bold text-slate-800 truncate">{d.companyName}</h2>
                {d.reportData ? (
                     <>
                        <p className="text-xs text-slate-500 mt-1">
                            Relatório gerado em: {new Date(d.reportData.generatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-sm text-teal-700 font-semibold">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-teal-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            Conformidade: {d.reportData.weightedCompliance.toFixed(0)}%
                        </div>
                     </>
                ) : (
                    <>
                        <p className="text-sm text-slate-500 mt-1">
                            Última atualização: {new Date(d.lastUpdated).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                        <div className="mt-4 text-sm font-semibold text-amber-600 bg-amber-100 border border-amber-200 inline-flex px-2 py-1 rounded-md">
                           Em andamento
                        </div>
                    </>
                )}
            </div>
            <div className="bg-slate-50/70 px-3 py-2 flex justify-end items-center gap-1 border-t border-slate-200">
                <div className="relative">
                    <button
                        onClick={() => setIsMoveMenuOpen(prev => !prev)}
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"
                        aria-label="Mover para pasta"
                    >
                       <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>
                    </button>
                    {isMoveMenuOpen && <MoveMenu diagnosis={d} folders={folders} onMove={onMoveToFolder} onClose={() => setIsMoveMenuOpen(false)} />}
                </div>
                <button
                    onClick={() => onDelete(d.id)}
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors"
                    aria-label="Excluir"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
                <button
                    onClick={() => onLoad(d.id)}
                    className="px-4 py-1.5 rounded-lg font-semibold text-sm text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-sm ml-2"
                >
                    {d.viewMode === 'report' ? 'Ver Relatório' : 'Continuar'}
                </button>
            </div>
        </div>
    )
}

interface SavedReportsProps {
  diagnoses: Diagnosis[];
  folders: Folder[];
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveToFolder: (diagnosisId: string, folderId: string | null) => void;
}

const SavedReports: React.FC<SavedReportsProps> = ({ diagnoses, folders, onLoad, onDelete, onNew, onCreateFolder, onDeleteFolder, onMoveToFolder }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [folderName, setFolderName] = useState('');
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const [dragOverTarget, setDragOverTarget] = useState<string | null | 'none'>('none');
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setExpandedFolders(prev => {
            const newState = {...prev};
            folders.forEach(f => {
                if (newState[f.id] === undefined) {
                    newState[f.id] = true;
                }
            });
            return newState;
        });
    }, [folders]);

    const { reportsByFolder, uncategorizedReports } = useMemo(() => {
        const sorted = [...diagnoses].sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
        const byFolder: { [key: string]: Diagnosis[] } = {};
        
        folders.forEach(folder => {
            byFolder[folder.id] = [];
        });

        const uncategorized: Diagnosis[] = [];

        sorted.forEach(d => {
            if (d.folderId && byFolder[d.folderId]) {
                byFolder[d.folderId].push(d);
            } else {
                uncategorized.push(d);
            }
        });
        
        return { reportsByFolder: byFolder, uncategorizedReports: uncategorized };
    }, [diagnoses, folders]);


    const handleCreate = () => {
        onCreateFolder(folderName);
        setFolderName('');
        setIsCreating(false);
    }

    const toggleFolderExpansion = (folderId: string) => {
        setExpandedFolders(prev => ({
            ...prev,
            [folderId]: !prev[folderId]
        }));
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, diagnosisId: string) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', diagnosisId);
        setDraggedItemId(diagnosisId);
    };

    const handleDragEnd = () => {
        setDraggedItemId(null);
        setDragOverTarget('none');
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, targetId: string | null) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (draggedItemId) {
            const diagnosis = diagnoses.find(d => d.id === draggedItemId);
            if(diagnosis && diagnosis.folderId !== targetId) {
                setDragOverTarget(targetId);
            }
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOverTarget('none');
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetFolderId: string | null) => {
        e.preventDefault();
        if (draggedItemId) {
            const diagnosis = diagnoses.find(d => d.id === draggedItemId);
            if(diagnosis && diagnosis.folderId !== targetFolderId) {
                onMoveToFolder(draggedItemId, targetFolderId);
            }
        }
        setDraggedItemId(null);
        setDragOverTarget('none');
    };
    
    return (
        <div className="animate-fade-in">
            <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Relatórios Salvos</h1>
                    <p className="mt-2 text-slate-600">
                        Clique em uma pasta para expandir/recolher e arraste relatórios para organizar.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isCreating ? (
                        <div className="flex items-center gap-2">
                             <input
                                type="text"
                                value={folderName}
                                onChange={(e) => setFolderName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                placeholder="Nome da pasta"
                                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                autoFocus
                            />
                            <button onClick={handleCreate} className="p-2 text-white bg-teal-600 rounded-lg hover:bg-teal-700"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg></button>
                            <button onClick={() => setIsCreating(false)} className="p-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
                        </div>
                    ) : (
                         <button
                            onClick={() => setIsCreating(true)}
                            className="px-4 py-2 rounded-lg font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path><line x1="12" y1="10" x2="12" y2="16"></line><line x1="9" y1="13" x2="15" y2="13"></line></svg>
                            Criar Pasta
                        </button>
                    )}
                    <button
                        onClick={onNew}
                        className="px-4 py-2 rounded-lg font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        Novo Diagnóstico
                    </button>
                </div>
            </div>

            {folders.map(folder => {
                const reportsInFolder = reportsByFolder[folder.id] || [];
                const isDropTarget = dragOverTarget === folder.id;
                const isExpanded = !!expandedFolders[folder.id];
                return (
                    <div 
                        key={folder.id} 
                        className={`mb-10 rounded-xl transition-all duration-200 ${isDropTarget ? 'bg-teal-50/80' : ''}`}
                        onDragOver={(e) => handleDragOver(e, folder.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, folder.id)}
                    >
                         <div 
                            className={`flex items-center justify-between gap-3 p-4 cursor-pointer hover:bg-slate-100/80 rounded-t-xl ${isExpanded ? 'border-b border-slate-200' : 'rounded-b-xl'}`}
                            onClick={() => toggleFolderExpansion(folder.id)}
                            role="button"
                            aria-expanded={isExpanded}
                        >
                           <div className="flex items-center gap-3">
                               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-slate-500 transition-transform transform ${isExpanded ? 'rotate-90' : ''}`}><polyline points="9 6 15 12 9 18"></polyline></svg>
                               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path></svg>
                               <h2 className="text-xl font-bold text-slate-800">{folder.name}</h2>
                           </div>
                           <button onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id); }} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-100 rounded-full transition-colors" aria-label={`Excluir pasta ${folder.name}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                           </button>
                        </div>
                        {isExpanded && (
                            <div className={`p-4 pt-4 min-h-[100px] border-2 border-dashed rounded-b-xl ${isDropTarget ? 'border-teal-400 bg-teal-50' : 'border-transparent'}`}>
                                {reportsInFolder.length > 0 ? (
                                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {reportsInFolder.map(d => 
                                            <ReportCard 
                                                key={d.id} 
                                                d={d} 
                                                folders={folders} 
                                                onLoad={onLoad} 
                                                onDelete={onDelete} 
                                                onMoveToFolder={onMoveToFolder} 
                                                isBeingDragged={draggedItemId === d.id}
                                                onDragStart={(e) => handleDragStart(e, d.id)}
                                                onDragEnd={handleDragEnd}
                                            />
                                        )}
                                   </div>
                                ) : (
                                    <div className="flex items-center justify-center text-slate-500 text-sm h-full py-8">
                                        Arraste um relatório aqui para adicioná-lo a esta pasta.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}

            <div 
                className={`mb-10 rounded-lg transition-all duration-200 ${dragOverTarget === null ? 'bg-teal-50/80' : ''}`}
                onDragOver={(e) => handleDragOver(e, null)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, null)}
            >
                {uncategorizedReports.length > 0 && (
                    <div className="pt-4">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 pt-4 border-t border-slate-200 px-4">Relatórios Avulsos</h2>
                        <div className={`p-4 pt-0 min-h-[100px] border-2 border-dashed rounded-b-lg ${dragOverTarget === null ? 'border-teal-400 bg-teal-50' : 'border-transparent'}`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {uncategorizedReports.map(d => 
                                    <ReportCard 
                                        key={d.id} 
                                        d={d} 
                                        folders={folders} 
                                        onLoad={onLoad} 
                                        onDelete={onDelete} 
                                        onMoveToFolder={onMoveToFolder}
                                        isBeingDragged={draggedItemId === d.id}
                                        onDragStart={(e) => handleDragStart(e, d.id)}
                                        onDragEnd={handleDragEnd}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                )}
                 {uncategorizedReports.length === 0 && folders.length > 0 && (
                    <div 
                        className={`pt-4 text-center text-slate-500 text-sm h-full py-8 border-2 border-dashed rounded-lg ${dragOverTarget === null ? 'border-teal-400' : 'border-transparent'}`}
                    >
                       Arraste um relatório de uma pasta aqui para desagrupá-lo.
                    </div>
                )}
            </div>
            
            {diagnoses.length === 0 && (
                 <div className="text-center bg-white p-12 rounded-lg border-2 border-dashed border-slate-300 mt-8">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 mx-auto mb-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                    <h2 className="text-xl font-semibold text-slate-700">Nenhum relatório encontrado</h2>
                    <p className="text-slate-500 mt-2 max-w-md mx-auto">
                        Comece um novo diagnóstico para avaliar a conformidade de uma empresa com as normas IFRS.
                    </p>
                    <div className="mt-6">
                        <button
                            onClick={onNew}
                            className="px-6 py-2.5 rounded-lg font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 shadow-md mx-auto"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Iniciar Primeiro Diagnóstico
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SavedReports;
