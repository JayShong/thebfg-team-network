import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service here
        console.error("Critical Platform Error Captured:", error, errorInfo);
        
        // Log to local storage for debug tracking
        const logs = JSON.parse(localStorage.getItem('bfg_error_logs') || '[]');
        logs.push({
            timestamp: new Date().toISOString(),
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack
        });
        localStorage.setItem('bfg_error_logs', JSON.stringify(logs.slice(-5)));
    }

    handleRepair = () => {
        // The "Panic Button" logic
        console.warn("Initiating Platform Self-Repair...");
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ 
                    height: '100vh', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    padding: '2rem',
                    textAlign: 'center',
                    background: '#0f172a',
                    color: 'white',
                    fontFamily: 'system-ui, sans-serif'
                }}>
                    <div className="glass-card" style={{ maxWidth: '400px', border: '1px solid rgba(255,255,255,0.1)', padding: '2rem', borderRadius: '24px' }}>
                        <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '3rem', color: '#ffb84d', marginBottom: '1.5rem' }}></i>
                        <h2 style={{ margin: '0 0 1rem' }}>Something didn't pull right.</h2>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                            The platform encountered an unexpected state. This usually happens after a major network update.
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button 
                                onClick={() => window.location.reload()} 
                                style={{ 
                                    background: 'var(--accent-primary, #8b5cf6)', 
                                    color: 'white', 
                                    border: 'none', 
                                    padding: '0.8rem', 
                                    borderRadius: '12px', 
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                Try Reloading
                            </button>
                            <button 
                                onClick={this.handleRepair} 
                                style={{ 
                                    background: 'rgba(255,255,255,0.05)', 
                                    color: 'white', 
                                    border: '1px solid rgba(255,255,255,0.1)', 
                                    padding: '0.8rem', 
                                    borderRadius: '12px', 
                                    fontSize: '0.85rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <i className="fa-solid fa-wrench"></i> Run Self-Repair
                            </button>
                        </div>

                        {process.env.NODE_ENV === 'development' && (
                            <div style={{ marginTop: '2rem', textAlign: 'left', fontSize: '0.7rem', color: '#ef4444', overflowX: 'auto' }}>
                                <pre>{this.state.error?.toString()}</pre>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children; 
    }
}

export default ErrorBoundary;
