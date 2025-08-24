import React from 'react';
import { PlusSquare, Archive, LucideProps, Briefcase } from 'lucide-react';
import { WITT_OBRIENS_LOGO_URL } from '../constants/logo';

type View = 'diagnosis' | 'saved_reports' | 'consultant_area';

interface MainSidebarProps {
  currentView: View;
  onSetView: (view: View) => void;
  onNewDiagnosis: () => void;
}

interface NavItemProps {
  icon: React.FC<LucideProps>;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex flex-col items-center justify-center p-3 rounded-lg transition-colors group ${
            isActive ? 'bg-teal-700' : 'hover:bg-teal-800'
        }`}
        aria-current={isActive ? 'page' : undefined}
    >
        <Icon className={`h-6 w-6 mb-1 transition-colors ${isActive ? 'text-white' : 'text-teal-200 group-hover:text-white'}`} strokeWidth={2} />
        <span className={`text-xs font-semibold text-center transition-colors ${isActive ? 'text-white' : 'text-teal-100 group-hover:text-white'}`}>
            {label}
        </span>
    </button>
);


const MainSidebar: React.FC<MainSidebarProps> = ({ currentView, onSetView, onNewDiagnosis }) => {
  return (
    <aside className="w-24 bg-teal-900 text-white flex flex-col shadow-lg z-30">
        <div className="w-full h-24 p-3 flex items-center justify-center">
            <img
                src={WITT_OBRIENS_LOGO_URL}
                alt="Witt O'Brien's Logo"
                className="max-h-full max-w-full object-contain rounded-md"
            />
        </div>

        <nav className="w-full flex flex-col space-y-2 p-3 mt-4">
             <NavItem
                icon={PlusSquare}
                label="Novo"
                isActive={currentView === 'diagnosis'}
                onClick={onNewDiagnosis}
            />
            <NavItem
                icon={Archive}
                label="Relatórios"
                isActive={currentView === 'saved_reports'}
                onClick={() => onSetView('saved_reports')}
            />
            <NavItem
                icon={Briefcase}
                label="Validação"
                isActive={currentView === 'consultant_area'}
                onClick={() => onSetView('consultant_area')}
            />
        </nav>
    </aside>
  );
};

export default MainSidebar;
