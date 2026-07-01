import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function PageHeader({ title, description, breadcrumb, actions }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
            <div>
                {breadcrumb && breadcrumb.length > 0 && (
                    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                        {breadcrumb.map((crumb, i) => (
                            <span key={i} className="flex items-center gap-1">
                                {i > 0 && <ChevronRight className="h-3 w-3 text-slate-600" />}
                                {crumb.to ? (
                                    <Link to={crumb.to} className="hover:text-slate-300 transition-colors">
                                        {crumb.label}
                                    </Link>
                                ) : (
                                    <span className="text-slate-400">{crumb.label}</span>
                                )}
                            </span>
                        ))}
                    </nav>
                )}
                <h1 className="text-2xl font-display font-black text-white leading-tight">{title}</h1>
                {description && (
                    <p className="text-slate-400 text-sm mt-1">{description}</p>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-3 shrink-0">
                    {actions}
                </div>
            )}
        </div>
    );
}
