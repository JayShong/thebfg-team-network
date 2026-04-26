import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
        // Also scroll the app-container if it has overflow
        const appContainer = document.getElementById('app-container');
        if (appContainer) appContainer.scrollTo(0, 0);
    }, [pathname]);

    return null;
};

export default ScrollToTop;
