import React from 'react';

const isChunkLoadError = (error) => {
    if (!error) return false;
    const msg = String(error.message || error);
    return (
        error.name === 'ChunkLoadError' ||
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Importing a module script failed') ||
        msg.includes('error loading dynamically imported module')
    );
};

export default class ErrorBoundary extends React.Component {
    state = { error: null };

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error('ErrorBoundary caught:', error, info?.componentStack);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        this.setState({ error: null });
        window.location.href = '/';
    };

    render() {
        const { error } = this.state;
        if (!error) return this.props.children;

        const stale = isChunkLoadError(error);
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-10 max-w-md w-full text-center">
                    <div className="w-16 h-16 mx-auto mb-6 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl">
                        {stale ? '🔄' : '⚠️'}
                    </div>
                    <h1 className="text-xl font-display font-black text-primary uppercase tracking-tight mb-3">
                        {stale ? 'Update Available' : 'Something went wrong'}
                    </h1>
                    <p className="text-slate-500 font-medium text-sm mb-8">
                        {stale
                            ? 'A new version of Hidayah has been released. Please reload to continue.'
                            : 'An unexpected error occurred. Reloading usually fixes it — if it keeps happening, please contact support.'}
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={this.handleReload}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all"
                        >
                            Reload
                        </button>
                        {!stale && (
                            <button
                                onClick={this.handleGoHome}
                                className="flex-1 bg-white border border-slate-200 text-slate-600 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                            >
                                Go Home
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }
}
