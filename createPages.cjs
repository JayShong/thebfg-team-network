const fs = require('fs');

['Directory', 'Scanner', 'Profile', 'Dashboard', 'Admin'].forEach(name => {
    const code = `import React from 'react';

const ${name} = () => {
    return (
        <div className="glass-card">
            <h2>${name}</h2>
            <p style={{ color: 'var(--text-secondary)' }}>This view will be fully migrated in Phase 3.</p>
        </div>
    );
};

export default ${name};
`;
    fs.writeFileSync(`src/pages/${name}.jsx`, code);
});
