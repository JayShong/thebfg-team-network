import { useEffect, useRef } from 'react';

/**
 * A safe wrapper for Firestore onSnapshot that handles tab resumption (Visibility API).
 * Prevents 400 Bad Request errors caused by stale background connections.
 */
const useSafeSnapshot = (query, onNext, onError, deps = []) => {
    const unsubscribeRef = useRef(null);

    useEffect(() => {
        const subscribe = () => {
            if (unsubscribeRef.current) unsubscribeRef.current();
            unsubscribeRef.current = query.onSnapshot(onNext, (err) => {
                if (onError) onError(err);
                else console.warn("SafeSnapshot error:", err);
            });
        };

        // Initial subscription
        subscribe();

        // Resumption Guard
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                subscribe();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (unsubscribeRef.current) unsubscribeRef.current();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [...deps]);
};

export default useSafeSnapshot;
