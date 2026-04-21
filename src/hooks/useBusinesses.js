import { useState, useEffect } from 'react';
import { db } from '../services/firebase';

export const useBusinesses = () => {
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let unsubscribe;
        try {
            // Subscribe to real-time updates for the base directories.
            unsubscribe = db.collection('businesses').onSnapshot(
                (snapshot) => {
                    const loaded = [];
                    snapshot.forEach((doc) => {
                        let data = doc.data();
                        data.id = doc.id;
                        loaded.push(data);
                    });
                    setBusinesses(loaded);
                    setLoading(false);
                },
                (err) => {
                    console.error("Error fetching businesses:", err);
                    setError(err);
                    setLoading(false);
                }
            );
        } catch (err) {
            console.error("Setup error retrieving businesses:", err);
            setError(err);
            setLoading(false);
        }
        
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);

    return { businesses, loading, error };
};

export default useBusinesses;
