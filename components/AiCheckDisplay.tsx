import React from 'react';
import type { AiCheckResult } from '../types';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

const aiCheckStyles: { [key in AiCheckResult['status']]: { title: string, icon: React.FC<any>, container: string, iconColor: string, textColor: string } } = {
    sufficient: {
        title: 'Análise da IA: Suficiente',
        icon: CheckCircle2,
        container: 'bg-teal-50 border-teal-400 text-teal-800',
        iconColor: 'text-teal-500',
        textColor: 'text-teal-800 font-bold',
    },
    partial: {
        title: 'Análise da IA: Parcial',
        icon: AlertTriangle,
        container: 'bg-amber-50 border-amber-400 text-amber-800',
        iconColor: 'text-amber-500',
        textColor: 'text-amber-800 font-bold',
    },
    insufficient: {
        title: 'Análise da IA: Insuficiente',
        icon: XCircle,
        container: 'bg-red-50 border-red-400 text-red-800',
        iconColor: 'text-red-500',
        textColor: 'text-red-800 font-bold',
    },
};

const AiCheckDisplay: React.FC<{ aiCheck?: AiCheckResult, small?: boolean }> = ({ aiCheck, small }) => {
    if (!aiCheck) return null;
    const styles = aiCheckStyles[aiCheck.status];
    if (!styles) return null;
    
    if (small) {
        return (
             <div title={`Análise da IA: ${aiCheck.feedback}`} className={`mt-2 inline-flex items-center gap-2 text-xs p-1.5 rounded-md border-l-4 ${styles.container}`}>
                <styles.icon className={`h-4 w-4 ${styles.iconColor}`} />
                <span className={`${styles.textColor}`}>{styles.title.replace('Análise da IA: ', '')}</span>
            </div>
        )
    }

    return (
        <div className={`mt-4 p-4 rounded-lg border-l-4 ${styles.container}`}>
            <div className="flex">
                <div className="flex-shrink-0">
                    <styles.icon className={`h-5 w-5 ${styles.iconColor}`} aria-hidden="true" />
                </div>
                <div className="ml-3">
                    <p className={`text-sm font-bold ${styles.textColor}`}>
                        {styles.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                        {aiCheck.feedback}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AiCheckDisplay;
