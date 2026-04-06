// --- Firebase Config & Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSy" + "B_k25JCJGOGqB7blXHdt5EqSQeV0gey3g",
  authDomain: "thebfgteam-9643a.firebaseapp.com",
  projectId: "thebfgteam-9643a",
  storageBucket: "thebfgteam-9643a.firebasestorage.app",
  messagingSenderId: "155869642900",
  appId: "1:155869642900:web:208498b7f5dd3ef2adf481",
  measurementId: "G-NJSLNYN6Z7"
};

let db = null;
let auth = null;
if (typeof firebase !== 'undefined') {
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
        console.log("Firebase Connected Successfully.");
    } catch(e) {
        console.warn("Firebase initialization skipped or failed:", e);
    }
}

// --- Mock Data & Persistence ---

const INITIAL_STATS = {
    consumers: 1542,
    businesses: 89,
    checkins: 24530,
    purchases: 8214
};

const INITIAL_BUSINESSES = [
    {
        id: "biz_1",
        name: "Solaris Coffee Roasters",
        founder: "Maria Lin",
        story: "Maria believes every cup of coffee should power the future. Solaris roasts 100% fair-trade beans using only solar energy.",
        type: "full",
        score: { s: 'A', e: 'A', c: 'A', soc: 'B', env: 'A' },
        location: "404 Sunshine Blvd, Eco District",
        contact: "hello@solariscoffee.example.com",
        website: "https://solariscoffee.example.com",
        shopfrontImg: "",
        founderImg: ""
    },
    {
        id: "biz_2",
        name: "Oceanic Surf Gear",
        founder: "Kai Manu",
        story: "Kai built Oceanic to protect the waves he loves. Every surfboard and rash guard is made from upcycled ocean plastics.",
        type: "full",
        score: { s: 'B', e: 'B', c: 'A', soc: 'A', env: 'A' },
        location: "15 Coastline Way, Marina Bay",
        contact: "ride@oceanicsurf.example.com",
        website: "https://oceanicsurf.example.com",
        shopfrontImg: "",
        founderImg: ""
    },
    {
        id: "biz_3",
        name: "Urban Harvest Grove",
        founder: "David Chen",
        story: "David brought agriculture to the city center. Urban Harvest provides zero-mile, pesticide-free produce to local communities.",
        type: "full",
        score: { s: 'A', e: 'A', c: 'A', soc: 'A', env: 'A' },
        location: "99 Metro Plaza, City Center",
        contact: "info@urbanharvest.example.com",
        website: "https://urbanharvest.example.com",
        shopfrontImg: "",
        founderImg: ""
    }
];



let MOCK_USER = JSON.parse(localStorage.getItem('bfg_user')) || null;
let MOCK_STATS = JSON.parse(localStorage.getItem('bfg_stats')) || INITIAL_STATS;
let MOCK_BUSINESSES = JSON.parse(localStorage.getItem('bfg_businesses')) || INITIAL_BUSINESSES;
let MOCK_ADMINS = ['jayshong@gmail.com'];

// --- App State & Logic ---

const app = {
    currentView: 'dashboard',
    scannedBusiness: null,
    adminEditingBizId: null,

    async init() {
        if (auth) {
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    try {
                        const userDoc = await db.collection('users').doc(user.uid).get();
                        if (userDoc.exists) {
                            MOCK_USER = userDoc.data();
                            MOCK_USER.email = user.email;
                            MOCK_USER.isEmailVerified = user.emailVerified;
                        } else {
                            MOCK_USER = {
                                id: user.uid,
                                name: user.displayName || 'User',
                                email: user.email,
                                gender: '',
                                city: '',
                                dob: '',
                                causes: [],
                                isEmailVerified: user.emailVerified,
                                checkins: 0,
                                purchases: 0,
                                isAdmin: false
                            };
                            await db.collection('users').doc(user.uid).set(MOCK_USER);
                        }
                    } catch (e) {
                        console.error('Error handling user auth state:', e);
                    }
                    
                    document.getElementById('main-header').style.display = 'flex';
                    document.getElementById('bottom-nav').style.display = 'flex';
                    
                    await this.fetchCloudData();
                    this.saveData();
                    this.renderStats();
                    this.renderBusinessList();
                    this.populateProfile();
                    this.navigate('dashboard');
                } else {
                    MOCK_USER = null;
                    document.getElementById('main-header').style.display = 'none';
                    document.getElementById('bottom-nav').style.display = 'none';
                    this.navigate('login');
                    this.fetchCloudData(); // fetch generic data in background
                }
            });
        } else {
            // Fallback if SDK fails
            if (!MOCK_USER) {
                document.getElementById('main-header').style.display = 'none';
                document.getElementById('bottom-nav').style.display = 'none';
                this.navigate('login');
                this.fetchCloudData();
                return;
            } else {
                document.getElementById('main-header').style.display = 'flex';
                document.getElementById('bottom-nav').style.display = 'flex';
            }
            await this.fetchCloudData();
            this.saveData();
            this.renderStats();
            this.renderBusinessList();
            this.populateProfile();
        }
    },

    async fetchCloudData() {
        if(db && firebaseConfig.apiKey !== "YOUR_API_KEY") {
            try {
                // Fetch roles
                const rolesDoc = await db.collection('system').doc('roles').get();
                if(rolesDoc.exists) MOCK_ADMINS = rolesDoc.data().adminEmails || ['jayshong@gmail.com'];
                else await db.collection('system').doc('roles').set({ adminEmails: MOCK_ADMINS });

                // Fetch stats
                const statsDoc = await db.collection('system').doc('stats').get();
                if(statsDoc.exists) MOCK_STATS = statsDoc.data();
                else await db.collection('system').doc('stats').set(MOCK_STATS); // inject default
                
                // Fetch businesses
                const bizSnapshot = await db.collection('businesses').get();
                if (!bizSnapshot.empty) {
                    MOCK_BUSINESSES = [];
                    bizSnapshot.forEach(doc => MOCK_BUSINESSES.push(doc.data()));
                } else {
                    // Seed businesses
                    MOCK_BUSINESSES.forEach(async biz => {
                        await db.collection('businesses').doc(biz.id).set(biz);
                    });
                }

                if(MOCK_USER && MOCK_USER.email) {
                    MOCK_USER.isAdmin = MOCK_ADMINS.includes(MOCK_USER.email);
                }
                if (this.currentView === 'admin') this.renderAdminList();
            } catch (e) {
                console.error("Firestore read error:", e);
                this.showToast("Failed to connect to cloud database.");
            }
        }
    },

    async forceSync() {
        const btn = document.querySelector('button[title="Sync Data"]');
        if(btn) btn.querySelector('i').classList.add('fa-spin');
        
        await this.fetchCloudData();
        this.saveData();
        this.renderStats();
        this.renderBusinessList();
        this.populateProfile();
        
        if (this.currentView === 'business-dashboard') {
            this.openBusinessDashboard();
        }
        
        if(btn) btn.querySelector('i').classList.remove('fa-spin');
        this.showToast('Data synchronized with server.');
    },

    async saveData() {
        localStorage.setItem('bfg_user', JSON.stringify(MOCK_USER));
        localStorage.setItem('bfg_stats', JSON.stringify(MOCK_STATS));
        localStorage.setItem('bfg_businesses', JSON.stringify(MOCK_BUSINESSES));

        // Push user to cloud
        if(db && MOCK_USER && firebaseConfig.apiKey !== "YOUR_API_KEY") {
            try {
                await db.collection('users').doc(MOCK_USER.id).set(MOCK_USER, {merge: true});
            } catch (e) {
                console.warn("Could not sync user to cloud:", e);
            }
        }
    },

    navigate(viewId) {
        // Hide all views
        document.querySelectorAll('.view').forEach(el => {
            el.classList.remove('active');
            el.classList.add('hidden');
        });
        
        // Show target view
        const target = document.getElementById(`view-${viewId}`);
        if(target) {
            target.classList.remove('hidden');
            target.classList.add('active');
            this.currentView = viewId;
        }
        
        if (viewId === 'admin') this.renderAdminList();

        // Update Nav
        document.querySelectorAll('.nav-item').forEach(el => {
            if(el.dataset.target === viewId) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
    },

    async login() {
        const nickname = document.getElementById('login-nickname').value.trim();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value.trim();
        const err = document.getElementById('login-error');
        const btn = document.getElementById('login-btn');

        err.classList.add('hidden');

        if (!email || !password || !nickname) {
            err.innerText = 'Please enter nickname, email, and password.';
            err.classList.remove('hidden');
            return;
        }

        if (auth) {
            btn.disabled = true;
            btn.innerText = 'Processing...';
            try {
                // Try logging in
                try {
                    await auth.signInWithEmailAndPassword(email, password);
                } catch(e) {
                    if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
                        // Create user
                        const credential = await auth.createUserWithEmailAndPassword(email, password);
                        await credential.user.updateProfile({ displayName: nickname });
                    } else {
                        throw e;
                    }
                }
                // onAuthStateChanged will handle the rest
            } catch (e) {
                err.innerText = e.message;
                err.classList.remove('hidden');
            }
            btn.disabled = false;
            btn.innerText = 'Join the Network / Login';
        } else {
            this.showToast("Auth module not loaded!");
        }
    },

    async logout() {
        if (auth) {
            await auth.signOut();
        }
        
        MOCK_USER = null;
        localStorage.removeItem('bfg_user');
        
        document.getElementById('login-nickname').value = '';
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        
        document.getElementById('main-header').style.display = 'none';
        document.getElementById('bottom-nav').style.display = 'none';
        
        this.navigate('login');
    },

    renderStats() {
        document.getElementById('stat-global-consumers').innerText = MOCK_STATS.consumers.toLocaleString();
        document.getElementById('stat-global-businesses').innerText = MOCK_STATS.businesses.toLocaleString();
        document.getElementById('stat-global-checkins').innerText = MOCK_STATS.checkins.toLocaleString();
        document.getElementById('stat-global-purchases').innerText = MOCK_STATS.purchases.toLocaleString();

        document.getElementById('stat-personal-checkins').innerText = MOCK_USER.checkins.toLocaleString();
        document.getElementById('stat-personal-purchases').innerText = MOCK_USER.purchases.toLocaleString();
    },

    renderBusinessList() {
        const container = document.getElementById('business-list');
        container.innerHTML = '';
        
        MOCK_BUSINESSES.forEach(biz => {
            const card = document.createElement('div');
            card.className = 'glass-card business-card';
            card.onclick = () => this.openBusinessDetail(biz.id);

            // Pseudo-random gradient for image placeholder
            const deg = Math.floor(Math.random() * 360);
            
            const scoreStr = typeof biz.score === 'object' && biz.score ? `${biz.score.s}${biz.score.e}${biz.score.c}${biz.score.soc}${biz.score.env}` : biz.score;
            const imgStyle = biz.shopfrontImg ? `background-image: url(${biz.shopfrontImg}); background-size: cover; background-position: center; border:none;` : `background: linear-gradient(${deg}deg, var(--accent-primary), var(--accent-secondary))`;

            const badgeHTML = biz.type === 'affiliate' 
                ? '<span class="business-score" style="color:var(--text-warning); border-color:var(--text-warning);"><i class="fa-solid fa-circle-info"></i> Affiliate Member (Not Audited)</span>' 
                : `<span class="business-score"><i class="fa-solid fa-star"></i> BFG Score: ${scoreStr}</span>`;

            card.innerHTML = `
                <div class="business-img" style="${imgStyle}"></div>
                <div class="business-info">
                    <h3>${biz.name}</h3>
                    <p><i class="fa-solid fa-user-tie"></i> ${biz.founder}</p>
                    ${badgeHTML}
                </div>
            `;
            container.appendChild(card);
        });
    },

    openBusinessDetail(bizId) {
        const biz = MOCK_BUSINESSES.find(b => b.id === bizId);
        if(!biz) return;

        const container = document.getElementById('business-detail-content');
        const scoreStr = typeof biz.score === 'object' ? `${biz.score.s}${biz.score.e}${biz.score.c}${biz.score.soc}${biz.score.env}` : biz.score;

        const heroHTML = biz.shopfrontImg ? `<img src="${biz.shopfrontImg}" class="hero-image">` : `<div class="hero-image" style="background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))"></div>`;

        const founderImgHTML = biz.founderImg ? `<img src="${biz.founderImg}" style="width:60px; height:60px; border-radius:50%; object-fit:cover; float:left; margin-right:1rem; border:2px solid var(--accent-primary);">` : '';

        // Embedded video Logic
        let videoHTML = '';
        if (biz.videoUrl) {
            let embedUrl = biz.videoUrl;
            if (embedUrl.includes('youtube.com/watch?v=')) {
                embedUrl = embedUrl.replace('youtube.com/watch?v=', 'youtube.com/embed/').split('&')[0];
            } else if (embedUrl.includes('youtu.be/')) {
                const id = embedUrl.split('youtu.be/')[1].split('?')[0];
                embedUrl = `https://www.youtube.com/embed/${id}`;
            } else if (embedUrl.includes('vimeo.com/')) {
                const id = embedUrl.split('vimeo.com/')[1].split('?')[0];
                embedUrl = `https://player.vimeo.com/video/${id}`;
            }
            videoHTML = `<div style="margin-top: 1.5rem;"><h3 style="margin-bottom:0.8rem">Founder's Video</h3><iframe width="100%" height="250" src="${embedUrl}" title="Video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius: var(--radius-md);"></iframe></div>`;
        }

        // Address iframe logic
        const encodedAddress = encodeURIComponent(biz.location);
        const mapIframe = `<iframe 
            width="100%" 
            height="250" 
            style="border:0; border-radius: var(--radius-md); margin-top: 1rem;" 
            loading="lazy" 
            allowfullscreen 
            src="https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY_HERE&q=${encodedAddress}">
        </iframe>
        <p style="font-size: 0.8rem; margin-top: 0.5rem; color: var(--text-warning);"><i class="fa-solid fa-triangle-exclamation"></i> Note: For production, replace 'YOUR_API_KEY_HERE' in app.js with a valid Google Maps API Key.</p>`;

        const qrContainer = `<div class="detail-section glass-card" style="text-align: center;">
            <h3>Scan at Counter</h3>
            <p style="font-size: 0.8rem; margin-bottom: 1rem;">Use the Scanner tab to scan this code.</p>
            <div id="qrcode-${biz.id}" style="display:inline-block; padding: 1rem; background: white; border-radius: var(--radius-md);"></div>
        </div>`;

            let scoreHTML = '';
            if (biz.type === 'affiliate') {
                scoreHTML = `<div class="business-score" style="margin-bottom: 1.5rem; display:flex; flex-direction:column; align-items:flex-start; gap:0.5rem; color: var(--text-warning); border-color: var(--text-warning);">
                    <div><i class="fa-solid fa-circle-info"></i> Affiliate Member</div>
                    <div style="font-size:0.85rem; color:var(--text-secondary); background:rgba(0,0,0,0.2); padding:0.5rem; border-radius:var(--radius-md);">
                        This business is an affiliate. While they support our mission and have been basically vetted, they reserve the right to distance from the network and have <strong>not been audited or scored</strong> across the paradigms yet.
                    </div>
                </div>`;
            } else {
                scoreHTML = `<div class="business-score" style="margin-bottom: 1.5rem; display:flex; flex-direction:column; align-items:flex-start; gap:0.5rem;">
                    <div><i class="fa-solid fa-star"></i> TheBFG.Team Score: <strong>${scoreStr}</strong></div>
                    <div style="font-size:0.75rem; color:var(--text-secondary); background:rgba(0,0,0,0.2); padding:0.5rem; border-radius:var(--radius-md); font-family:monospace;">
                        Sh:${typeof biz.score === 'object' && biz.score ? biz.score.s : '-'} | Em:${typeof biz.score === 'object' && biz.score ? biz.score.e : '-'} | Cu:${typeof biz.score === 'object' && biz.score ? biz.score.c : '-'} | So:${typeof biz.score === 'object' && biz.score ? biz.score.soc : '-'} | Env:${typeof biz.score === 'object' && biz.score ? biz.score.env : '-'}
                    </div>
                </div>`;
            }

            container.innerHTML = `
                ${heroHTML}
                <h2>${biz.name}</h2>
                ${scoreHTML}
                
                <div class="detail-section glass-card">
                <h3>Founder's Conviction</h3>
                ${founderImgHTML}
                <p><strong>${biz.founder}</strong></p>
                <p style="margin-top: 0.5rem; font-style: italic;">"${biz.story}"</p>
                <div style="clear:both;"></div>
            </div>
            
            <div class="detail-section glass-card">
                <h3>Contact & Location</h3>
                ${biz.website ? `<p><i class="fa-solid fa-globe" style="width: 20px;"></i> <a href="${biz.website}" target="_blank" style="color: var(--accent-primary); text-decoration: none;">${biz.website}</a></p>` : ''}
                <p style="margin-top: 0.5rem;"><i class="fa-solid fa-location-dot" style="width: 20px;"></i> ${biz.location}</p>
                ${mapIframe}
            </div>
            ${videoHTML}
            ${qrContainer}
        `;
        
        this.navigate('business-detail');

        // Generate QR Code dynamically
        setTimeout(() => {
            if (document.getElementById(`qrcode-${biz.id}`)) {
                new QRCode(document.getElementById(`qrcode-${biz.id}`), {
                    text: biz.id,
                    width: 128,
                    height: 128,
                    colorDark : "#000000",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.M
                });
            }
        }, 100);
    },

    populateProfile() {
        if (!MOCK_USER) return;

        // Auto-link business to user if email matches ownerEmail
        if (MOCK_USER.email) {
            const biz = MOCK_BUSINESSES.find(b => b.ownerEmail && b.ownerEmail.toLowerCase() === MOCK_USER.email.toLowerCase());
            MOCK_USER.businessId = biz ? biz.id : null;
        }

        document.getElementById('profile-name').innerText = MOCK_USER.name;
        document.getElementById('profile-email').innerHTML = MOCK_USER.email ? (MOCK_USER.email + (MOCK_USER.isEmailVerified ? ` <i class="fa-solid fa-circle-check" style="color: var(--accent-success);" title="Verified"></i>` : '')) : '';
        document.getElementById('profile-id').innerText = MOCK_USER.id;
        
        // Show admin portal button only if isAdmin is true
        const adminPortal = document.getElementById('admin-portal-container');
        if (adminPortal) {
            adminPortal.style.display = MOCK_USER.isAdmin ? 'block' : 'none';
        }

        // Show business portal if businessId exists
        const bizPortal = document.getElementById('business-portal-container');
        if (bizPortal) {
            bizPortal.style.display = MOCK_USER.businessId ? 'block' : 'none';
        }
    },

    async addAdmin() {
        if (!MOCK_USER.isAdmin) return;
        const email = document.getElementById('admin-new-email').value.trim();
        if (!email) {
            this.showToast("Please enter an email address.");
            return;
        }
        if (MOCK_ADMINS.includes(email)) {
            this.showToast("This email is already an admin.");
            return;
        }
        
        MOCK_ADMINS.push(email);
        if (db) {
            await db.collection('system').doc('roles').set({ adminEmails: MOCK_ADMINS }, { merge: true });
        }
        document.getElementById('admin-new-email').value = '';
        this.renderAdminList();
        this.showToast(`${email} has been added as an Admin.`);
    },

    async removeAdmin(email) {
        if (!MOCK_USER.isAdmin) return;
        if (email === 'jayshong@gmail.com') {
            this.showToast('Access Denied: The Master Admin cannot be removed.', true);
            return;
        }
        if (email === MOCK_USER.email) {
            this.showToast('You cannot remove yourself. Ask another admin to remove you.', true);
            return;
        }

        const index = MOCK_ADMINS.indexOf(email);
        if (index > -1) {
            MOCK_ADMINS.splice(index, 1);
            if (db) {
                await db.collection('system').doc('roles').set({ adminEmails: MOCK_ADMINS }, { merge: true });
            }
            this.renderAdminList();
            this.showToast(`${email} removed from Admins.`);
        }
    },

    renderAdminList() {
        this.renderAdminBusinessList();
        const container = document.getElementById('admin-list-container');
        if (!container) return;
        container.innerHTML = '';
        MOCK_ADMINS.forEach(email => {
            const isMaster = email === 'jayshong@gmail.com';
            container.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; background: rgba(255,255,255,0.05); padding: 0.5rem 1rem; border-radius: var(--radius-sm);">
                    <div style="display:flex; align-items:center; gap:0.5rem; word-break: break-all;">
                        <i class="fa-solid ${isMaster ? 'fa-crown text-gradient' : 'fa-user-shield'}" style="color:var(--accent-primary)"></i> ${email}
                    </div>
                    ${!isMaster ? `<button class="icon-btn" style="color:var(--text-warning); padding:0.4rem; height:auto; width:auto;" onclick="app.removeAdmin('${email}')"><i class="fa-solid fa-trash"></i></button>` : '<span style="font-size:0.8rem; color:var(--text-secondary)">Master</span>'}
                </div>
            `;
        });
    },

    // --- Settings & Demographics Logic ---
    openSettings() {
        document.getElementById('settings-nickname').value = MOCK_USER.name || '';
        document.getElementById('settings-email').value = MOCK_USER.email || '';
        document.getElementById('settings-gender').value = MOCK_USER.gender || '';
        document.getElementById('settings-city').value = MOCK_USER.city || '';
        document.getElementById('settings-dob').value = MOCK_USER.dob || '';

        // Reset checkboxes
        document.querySelectorAll('#settings-causes input[type="checkbox"]').forEach(cb => {
            cb.checked = MOCK_USER.causes && MOCK_USER.causes.includes(cb.value);
        });

        this.renderEmailVerificationStatus();
        this.navigate('settings');
    },

    saveSettings() {
        const nickname = document.getElementById('settings-nickname').value.trim();
        const email = document.getElementById('settings-email').value.trim();
        const gender = document.getElementById('settings-gender').value;
        const city = document.getElementById('settings-city').value.trim();
        const dob = document.getElementById('settings-dob').value;
        
        const causes = Array.from(document.querySelectorAll('#settings-causes input[type="checkbox"]:checked'))
            .map(cb => cb.value);

        if (!nickname || !email) {
            this.showToast('Nickname and Email are required.');
            return;
        }

        if (MOCK_USER.email !== email) {
            MOCK_USER.isEmailVerified = false; // reset verification if email changes
        }

        MOCK_USER.name = nickname;
        MOCK_USER.email = email;
        MOCK_USER.gender = gender;
        MOCK_USER.city = city;
        MOCK_USER.dob = dob;
        MOCK_USER.causes = causes;

        this.saveData();
        this.populateProfile();
        this.showToast('Profile updated successfully!');
        this.navigate('profile');
    },

    renderEmailVerificationStatus() {
        const verifyBtn = document.getElementById('btn-verify-email');
        const badge = document.getElementById('badge-verified');
        
        if (MOCK_USER.isEmailVerified) {
            verifyBtn.style.display = 'none';
            badge.style.display = 'inline-flex';
        } else {
            verifyBtn.style.display = 'inline-block';
            badge.style.display = 'none';
        }
    },

    promptVerifyEmail() {
        document.getElementById('action-modal-verify').classList.remove('hidden');
    },

    async sendRealEmailVerification() {
        if (auth && auth.currentUser) {
            try {
                await auth.currentUser.sendEmailVerification();
                document.getElementById('action-modal-verify').classList.add('hidden');
                this.showToast('Verification email sent! Please check your inbox.');
            } catch (error) {
                this.showToast('Error sending email: ' + error.message);
                document.getElementById('action-modal-verify').classList.add('hidden');
            }
        }
    },

    async sendPasswordResetFromLogin() {
        const emailInput = document.getElementById('login-email').value.trim();
        if (!emailInput) {
            this.showToast('Please enter your email address in the field above first.');
            return;
        }
        if (auth) {
            try {
                await auth.sendPasswordResetEmail(emailInput);
                this.showToast('Password reset email sent! Check your inbox.');
            } catch (error) {
                console.error("Error sending password reset:", error);
                this.showToast('Failed to send reset email. Ensure email is valid.');
            }
        } else {
            this.showToast('Authentication module not initialized.');
        }
    },

    async sendPasswordResetFromSettings() {
        if (!auth || !auth.currentUser) return;
        const email = auth.currentUser.email;
        if (confirm(`Send a password reset email to ${email}?`)) {
            try {
                await auth.sendPasswordResetEmail(email);
                this.showToast(`Password reset email sent to ${email}!`);
            } catch (error) {
                console.error("Error sending password reset:", error);
                this.showToast("Failed to send reset email.");
            }
        }
    },

    // --- Scanner Logic ---
    html5Qrcode: null,
    
    startScanner() {
        document.getElementById('scanner-actions').style.display = 'none';
        document.getElementById('reader-container').style.display = 'block';

        if (!this.html5Qrcode) {
            this.html5Qrcode = new Html5Qrcode("reader");
        }
        
        this.html5Qrcode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText, decodedResult) => {
                this.stopScanner();
                this.handleScanResult(decodedText);
            },
            (errorMessage) => {
                // handle parse failures silently
            }
        ).catch((err) => {
            this.stopScanner();
            this.showToast("Camera access denied or unavailable.");
            console.warn(err);
        });
    },

    stopScanner() {
        document.getElementById('scanner-actions').style.display = 'block';
        document.getElementById('reader-container').style.display = 'none';
        if (this.html5Qrcode && this.html5Qrcode.isScanning) {
            this.html5Qrcode.stop().catch(err => console.error("Failed to stop scanner", err));
        }
    },

    mockScanSuccess() {
        const randomBiz = MOCK_BUSINESSES[Math.floor(Math.random() * MOCK_BUSINESSES.length)];
        this.handleScanResult(randomBiz.id);
    },

    handleScanResult(bizId) {
        const biz = MOCK_BUSINESSES.find(b => b.id === bizId);
        if (biz) {
            this.scannedBusiness = biz;
            document.getElementById('modal-business-name').innerText = this.scannedBusiness.name;
            document.getElementById('purchase-form').classList.add('hidden');
            document.getElementById('modal-default-content').classList.remove('hidden');
            document.getElementById('modal-success-content').classList.add('hidden');
            document.getElementById('action-modal').classList.remove('hidden');
        } else {
            this.showToast("Invalid QR code scanned.");
        }
    },

    closeModal() {
        document.getElementById('action-modal').classList.add('hidden');
        this.scannedBusiness = null;
    },

    showSuccessModal(message) {
        document.getElementById('modal-default-content').classList.add('hidden');
        document.getElementById('modal-success-content').classList.remove('hidden');
        document.getElementById('success-message').innerText = message;
        
        setTimeout(() => {
            this.closeModal();
            this.navigate('dashboard');
        }, 2500);
    },

    async submitCheckin() {
        // Update stats
        MOCK_STATS.checkins++;
        MOCK_USER.checkins++;

        if (this.scannedBusiness) {
            this.scannedBusiness.checkinsCount = (this.scannedBusiness.checkinsCount || 0) + 1;
            if (db) {
                try {
                    await db.collection('transactions').add({
                        type: 'checkin',
                        bizId: this.scannedBusiness.id,
                        userId: MOCK_USER.id,
                        userNickname: MOCK_USER.name,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    await db.collection('businesses').doc(this.scannedBusiness.id).set({ checkinsCount: this.scannedBusiness.checkinsCount }, {merge:true});
                } catch(e) { console.warn("Checkin Log failed", e); }
            }
        }

        this.saveData();
        this.renderStats();
        
        this.showSuccessModal(`Successfully checked in to ${this.scannedBusiness.name}!`);
    },

    showPurchaseForm() {
        document.getElementById('purchase-form').classList.remove('hidden');
    },

    async submitPurchase() {
        const receipt = document.getElementById('receipt-input').value.trim();
        const amount = document.getElementById('amount-input').value.trim();
        
        if(!receipt || !amount) {
            alert('Please enter both receipt number and amount.');
            return;
        }

        if (this.scannedBusiness) {
            if (db && firebaseConfig.apiKey !== "YOUR_API_KEY") {
                try {
                    await db.collection('transactions').add({
                        type: 'purchase',
                        bizId: this.scannedBusiness.id,
                        userId: MOCK_USER.id,
                        userNickname: MOCK_USER.name,
                        receipt: receipt,
                        amount: parseFloat(amount),
                        status: 'pending',
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } catch(e) { console.warn("Purchase Log failed", e); }
            }
        }

        this.saveData();
        this.renderStats();
        
        // Reset inputs
        document.getElementById('receipt-input').value = '';
        document.getElementById('amount-input').value = '';
        
        this.showSuccessModal(`Logged purchase of $${amount} at ${this.scannedBusiness.name}!`);
    },

    showToast(message) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="fa-solid fa-check-circle"></i> ${message}`;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideDownToast 0.3s ease reverse forwards';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    },

    // --- Admin Export/Import Logic ---
    exportData() {
        const data = {
            user: MOCK_USER,
            stats: MOCK_STATS,
            businesses: MOCK_BUSINESSES
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        const anchor = document.createElement('a');
        anchor.setAttribute("href", dataStr);
        anchor.setAttribute("download", "bfg_network_backup.json");
        document.body.appendChild(anchor); 
        anchor.click();
        anchor.remove();
        this.showToast("Database exported successfully!");
    },

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.user && data.stats && data.businesses) {
                    MOCK_USER = data.user;
                    MOCK_STATS = data.stats;
                    MOCK_BUSINESSES = data.businesses;
                    this.saveData();
                    this.renderStats();
                    this.renderBusinessList();
                    this.populateProfile();
                    this.showToast("Database restored successfully!");
                    this.navigate('dashboard');
                } else {
                    this.showToast("Invalid backup file format.");
                }
            } catch (err) {
                this.showToast("Failed to parse backup file.");
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input
    },

    // --- Admin Image Processing Logic ---
    async getBase64Image(fileInputId) {
        return new Promise((resolve) => {
            const input = document.getElementById(fileInputId);
            if (!input.files || !input.files[0]) return resolve('');
            
            const file = input.files[0];
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    },

    renderAdminBusinessList() {
        const container = document.getElementById('admin-biz-table-container');
        if (!container) return;
        
        let searchTerm = '';
        const searchInput = document.getElementById('admin-biz-search');
        if (searchInput) searchTerm = searchInput.value.toLowerCase().trim();
        
        let filteredBiz = MOCK_BUSINESSES;
        if (searchTerm) {
            filteredBiz = MOCK_BUSINESSES.filter(b => 
                (b.name && b.name.toLowerCase().includes(searchTerm)) || 
                (b.founder && b.founder.toLowerCase().includes(searchTerm))
            );
        }
        
        if (filteredBiz.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding: 1rem;">No matching businesses found.</p>';
            return;
        }

        let html = '';
        filteredBiz.forEach(biz => {
            html += `<div style="display:flex; justify-content:space-between; align-items:center; background: rgba(255,255,255,0.05); padding: 0.5rem 1rem; border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.1);">
                <div>
                    <strong>${biz.name}</strong> <span style="font-size:0.8rem; color:var(--text-secondary);">- ${biz.founder} ${biz.type==='affiliate' ? '<span style="color:var(--text-warning);">(Affiliate)</span>' : ''}</span>
                </div>
                <button class="btn btn-secondary" style="padding: 0.3rem 0.8rem; font-size: 0.85rem;" onclick="app.loadAdminBizToEdit('${biz.id}')"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
            </div>`;
        });
        container.innerHTML = html;
    },

    loadAdminBizToEdit(bizId) {
        this.adminEditingBizId = bizId || null;
        
        if (bizId) {
            const formTitleElement = document.getElementById('admin-form-title');
            if(formTitleElement) formTitleElement.scrollIntoView({ behavior: 'smooth' });
        }
        
        const title = document.getElementById('admin-form-title');
        const btnText = document.getElementById('btn-add-biz-text');
        const btnIcon = document.getElementById('btn-add-biz-icon');
        const btnCancel = document.getElementById('btn-admin-cancel-edit');
        
        if (!bizId) {
            if(title) title.innerText = 'Add New Business';
            if(btnText) btnText.innerText = 'Add Business';
            if(btnIcon) btnIcon.className = 'fa-solid fa-plus';
            if(btnCancel) btnCancel.classList.add('hidden');
            
            document.getElementById('admin-biz-name').value = '';
            document.getElementById('admin-biz-founder').value = '';
            document.getElementById('admin-biz-owner-email').value = '';
            document.getElementById('admin-biz-story').value = '';
            document.getElementById('admin-biz-location').value = '';
            document.getElementById('admin-biz-contact').value = '';
            document.getElementById('admin-biz-website').value = '';
            document.getElementById('admin-biz-shopfront').value = '';
            document.getElementById('admin-biz-founder-img').value = '';
            
            const typeSelect = document.getElementById('admin-biz-type');
            if(typeSelect) {
                typeSelect.value = 'full';
                document.getElementById('score-section').style.display = 'block';
            }
        } else {
            const biz = MOCK_BUSINESSES.find(b => b.id === bizId);
            if (!biz) return;
            
            if(title) title.innerText = `Editing: ${biz.name}`;
            if(btnText) btnText.innerText = 'Save Changes';
            if(btnIcon) btnIcon.className = 'fa-solid fa-floppy-disk';
            if(btnCancel) btnCancel.classList.remove('hidden');
            
            document.getElementById('admin-biz-name').value = biz.name || '';
            document.getElementById('admin-biz-founder').value = biz.founder || '';
            document.getElementById('admin-biz-owner-email').value = biz.ownerEmail || '';
            document.getElementById('admin-biz-story').value = biz.story || '';
            document.getElementById('admin-biz-location').value = biz.location || '';
            document.getElementById('admin-biz-contact').value = biz.contact || '';
            document.getElementById('admin-biz-website').value = biz.website || '';
            document.getElementById('admin-biz-shopfront').value = biz.shopfrontImg || '';
            document.getElementById('admin-biz-founder-img').value = biz.founderImg || '';
            
            const typeSelect = document.getElementById('admin-biz-type');
            if (typeSelect) {
                typeSelect.value = biz.type || 'full';
                document.getElementById('score-section').style.display = typeSelect.value === 'affiliate' ? 'none' : 'block';
            }
            
            if (biz.score && biz.type !== 'affiliate') {
                document.getElementById('score-shareholder').value = biz.score.s || 'C';
                document.getElementById('score-employee').value = biz.score.e || 'C';
                document.getElementById('score-customer').value = biz.score.c || 'C';
                document.getElementById('score-society').value = biz.score.soc || 'C';
                document.getElementById('score-env').value = biz.score.env || 'C';
            }
        }
    },

    async addBusiness() {
        const name = document.getElementById('admin-biz-name').value.trim();
        const founder = document.getElementById('admin-biz-founder').value.trim();
        const ownerEmail = document.getElementById('admin-biz-owner-email').value.trim();
        const story = document.getElementById('admin-biz-story').value.trim();
        const location = document.getElementById('admin-biz-location').value.trim();
        const contact = document.getElementById('admin-biz-contact').value.trim();
        const website = document.getElementById('admin-biz-website').value.trim();
        const typeSelectElem = document.getElementById('admin-biz-type');
        const bizType = typeSelectElem ? typeSelectElem.value : 'full';
        
        let score = null;
        if (bizType !== 'affiliate') {
            score = {
                s: document.getElementById('score-shareholder').value,
                e: document.getElementById('score-employee').value,
                c: document.getElementById('score-customer').value,
                soc: document.getElementById('score-society').value,
                env: document.getElementById('score-env').value
            };
        }

        if (!name || !founder || !story || !location || !contact) {
            this.showToast("Please fill in basic business details.");
            return;
        }

        document.getElementById('btn-add-biz').style.display = 'none';
        document.getElementById('admin-loading').classList.remove('hidden');

        const shopfrontImg = document.getElementById('admin-biz-shopfront').value.trim();
        const founderImg = document.getElementById('admin-biz-founder-img').value.trim();

        if (this.adminEditingBizId) {
            // Update mode
            const bizIndex = MOCK_BUSINESSES.findIndex(b => b.id === this.adminEditingBizId);
            if(bizIndex !== -1) {
                MOCK_BUSINESSES[bizIndex] = {
                    ...MOCK_BUSINESSES[bizIndex],
                    name, founder, ownerEmail, story, location, contact, website, type: bizType, score, shopfrontImg, founderImg
                };
                if (db && firebaseConfig.apiKey !== "YOUR_API_KEY") {
                    try {
                        await db.collection('businesses').doc(this.adminEditingBizId).set(MOCK_BUSINESSES[bizIndex], {merge:true});
                    } catch (e) {
                        console.warn("Could not sync business update to cloud:", e);
                    }
                }
                this.saveData();
                this.renderBusinessList();
                this.showToast(`Successfully updated ${name}!`);
                this.renderAdminBusinessList();
                this.loadAdminBizToEdit(''); // clear form to Create New state
            }
            
            document.getElementById('btn-add-biz').style.display = 'block';
            document.getElementById('admin-loading').classList.add('hidden');
            return;
        }

        const newBiz = {
            id: 'biz_' + Date.now(),
            name,
            founder,
            ownerEmail,
            story,
            location,
            contact,
            website,
            type: bizType,
            score,
            shopfrontImg,
            founderImg,
            checkinsCount: 0,
            purchasesCount: 0
        };

        // Update mock state
        MOCK_BUSINESSES.push(newBiz);
        MOCK_STATS.businesses++;
        
        try {
            this.saveData();
        } catch (e) {
            // Local storage quota exceeded
            alert("Error saving your business. The images might be too large for local mock storage. Try uploading smaller images.");
            MOCK_BUSINESSES.pop();
            MOCK_STATS.businesses--;
            return;
        }
        
        this.renderBusinessList();
        this.renderStats();

        // Clear form
        document.getElementById('admin-biz-name').value = '';
        document.getElementById('admin-biz-founder').value = '';
        document.getElementById('admin-biz-story').value = '';
        document.getElementById('admin-biz-location').value = '';
        document.getElementById('admin-biz-contact').value = '';
        document.getElementById('admin-biz-website').value = '';
        document.getElementById('admin-biz-shopfront').value = '';
        document.getElementById('admin-biz-founder-img').value = '';
        if(typeSelectElem) {
            typeSelectElem.value = 'full';
            document.getElementById('score-section').style.display = 'block';
        }

        this.renderAdminBusinessList();
        this.showToast(`Successfully added ${name}!`);
        
        document.getElementById('btn-add-biz').style.display = 'block';
        document.getElementById('admin-loading').classList.add('hidden');
        
        this.navigate('directory');
    },

    // --- Business Portal Logic ---
    async openBusinessDashboard() {
        if (!MOCK_USER.businessId) return;
        const biz = MOCK_BUSINESSES.find(b => b.id === MOCK_USER.businessId);
        if (!biz) return;

        document.getElementById('biz-dash-name').innerText = biz.name;
        document.getElementById('biz-dash-checkins').innerText = (biz.checkinsCount || 0).toLocaleString();
        document.getElementById('biz-dash-purchases').innerText = (biz.purchasesCount || 0).toLocaleString();

        const list = document.getElementById('biz-transaction-list');
        list.innerHTML = '<p style="color: var(--text-secondary); text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> Fetching transactions...</p>';

        this.navigate('business-dashboard');

        if (db) {
            try {
                const querySnapshot = await db.collection('transactions')
                    .where('bizId', '==', biz.id)
                    .where('type', '==', 'purchase')
                    .orderBy('timestamp', 'desc')
                    .limit(20)
                    .get();

                if (querySnapshot.empty) {
                    list.innerHTML = '<p style="color: var(--text-secondary); padding:1rem;">No recent purchases recorded.</p>';
                } else {
                    list.innerHTML = '';
                    querySnapshot.forEach(doc => {
                        const t = doc.data();
                        const dt = t.timestamp ? t.timestamp.toDate().toLocaleString() : 'Just now';
                        const status = t.status || 'verified';
                        const statusColor = status === 'pending' ? 'var(--text-warning)' : 'var(--accent-success)';
                        const statusIcon = status === 'pending' ? '<i class="fa-solid fa-clock"></i> Pending' : '<i class="fa-solid fa-check"></i> Verified';
                        
                        list.innerHTML += `
                            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 0.8rem 0;">
                                <div>
                                    <strong>${t.userNickname}</strong> <span style="font-size:0.8rem; color:${statusColor}; margin-left:0.5rem;">${statusIcon}</span><br>
                                    <small style="color:var(--text-secondary)">Receipt: ${t.receipt} &bull; ${dt}</small>
                                </div>
                                <div style="color:${statusColor}; font-weight:bold;">
                                    $${parseFloat(t.amount).toFixed(2)}
                                </div>
                            </div>
                        `;
                    });
                }
            } catch(e) {
                console.error(e);
                list.innerHTML = '<p style="color: var(--text-warning); padding:1rem;">Error loading transactions. Make sure Firestore indexes are built.</p>';
            }
        }
    },

    openBusinessProfileEdit() {
        if (!MOCK_USER.businessId) return;
        const biz = MOCK_BUSINESSES.find(b => b.id === MOCK_USER.businessId);
        if (!biz) return;

        document.getElementById('edit-biz-name').value = biz.name || '';
        document.getElementById('edit-biz-founder').value = biz.founder || '';
        document.getElementById('edit-biz-story').value = biz.story || '';
        document.getElementById('edit-biz-contact').value = biz.contact || '';
        document.getElementById('edit-biz-website').value = biz.website || '';
        document.getElementById('edit-biz-location').value = biz.location || '';
        document.getElementById('edit-biz-shopfront').value = biz.shopfrontImg || '';
        document.getElementById('edit-biz-video').value = biz.videoUrl || '';
        
        this.navigate('business-profile-edit');
    },

    approvedReconciliationMatches: [],

    async processReconciliationCSV() {
        const fileInput = document.getElementById('reconcile-csv-upload');
        const resultsDiv = document.getElementById('reconcile-results');
        const actionsDiv = document.getElementById('reconcile-actions');
        
        if (!fileInput.files || fileInput.files.length === 0) {
            alert('Please select a CSV file first.');
            return;
        }

        if (!db) {
            resultsDiv.innerHTML = '<p class="text-warning">Firestore not connected. Cloud data required for this function.</p>';
            return;
        }

        resultsDiv.innerHTML = '<p><i class="fa-solid fa-spinner fa-spin"></i> Analyzing...</p>';
        actionsDiv.classList.add('hidden');
        this.approvedReconciliationMatches = [];

        try {
            // 1. Fetch pending transactions
            const pendingQuery = await db.collection('transactions')
                .where('bizId', '==', MOCK_USER.businessId)
                .where('type', '==', 'purchase')
                .get();
                
            const pendingTxns = [];
            pendingQuery.forEach(doc => {
                const data = doc.data();
                if (data.status === 'pending') {
                    pendingTxns.push({ id: doc.id, ...data });
                }
            });

            if (pendingTxns.length === 0) {
                resultsDiv.innerHTML = '<p style="color:var(--accent-success)">No pending transactions require reconciliation!</p>';
                return;
            }

            // 2. Read CSV File
            const reader = new FileReader();
            reader.onload = (e) => {
                const csvText = e.target.result;
                let html = '<div style="display:flex; flex-direction:column; gap:0.5rem;">';
                let matchCount = 0;

                pendingTxns.forEach(t => {
                    const amountStr = t.amount.toString();
                    const hasReceipt = csvText.includes(t.receipt);
                    const hasAmount = csvText.includes(amountStr);
                    
                    let bg = 'rgba(255,255,255,0.05)';
                    let icon = '';
                    let action = '';

                    if (hasReceipt && hasAmount) {
                        bg = 'rgba(0,200,83,0.1)';
                        icon = '<i class="fa-solid fa-check text-success"></i> Strong Match';
                        action = `<input type="checkbox" checked disabled>`;
                        this.approvedReconciliationMatches.push(t.id);
                        matchCount++;
                    } else if (hasAmount) {
                        bg = 'rgba(255,171,0,0.1)';
                        icon = '<i class="fa-solid fa-exclamation-triangle text-warning"></i> Weak Match (Amount Only)';
                        action = `<input type="checkbox" onchange="app.toggleReconciliationMatch('${t.id}', this.checked)">`;
                    } else {
                        bg = 'rgba(213,0,0,0.1)';
                        icon = '<i class="fa-solid fa-xmark" style="color:red;"></i> No Match';
                        action = `<input type="checkbox" onchange="app.toggleReconciliationMatch('${t.id}', this.checked)">`;
                    }

                    html += `
                        <div style="background:${bg}; padding: 0.8rem; border-radius: var(--radius-sm); display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <strong>${t.userNickname}</strong> - $${t.amount.toFixed(2)}<br>
                                <small>Receipt: ${t.receipt}</small><br>
                                <small>${icon}</small>
                            </div>
                            <div>${action}</div>
                        </div>
                    `;
                });
                
                html += '</div>';
                resultsDiv.innerHTML = html;
                
                if (pendingTxns.length > 0) {
                    actionsDiv.classList.remove('hidden');
                }
            };
            reader.readAsText(fileInput.files[0]);

        } catch (err) {
            console.error(err);
            resultsDiv.innerHTML = '<p class="text-warning">Error processing file or database.</p>';
        }
    },

    toggleReconciliationMatch(txnId, isChecked) {
        if (isChecked) {
            if (!this.approvedReconciliationMatches.includes(txnId)) {
                this.approvedReconciliationMatches.push(txnId);
            }
        } else {
            this.approvedReconciliationMatches = this.approvedReconciliationMatches.filter(id => id !== txnId);
        }
    },

    async finalizeReconciliation() {
        if (this.approvedReconciliationMatches.length === 0) {
            this.showToast("No matches selected to finalize.");
            return;
        }

        const btn = document.querySelector('#reconcile-actions button');
        const originalText = btn.innerText;
        btn.innerText = "Processing...";
        btn.disabled = true;

        try {
            const batch = db.batch();
            let addedPurchases = 0;
            
            for (const txnId of this.approvedReconciliationMatches) {
                const docRef = db.collection('transactions').doc(txnId);
                batch.update(docRef, { status: 'verified' });
                addedPurchases++;
            }
            
            await batch.commit();
            
            // Increment Mock Business Score
            const biz = MOCK_BUSINESSES.find(b => b.id === MOCK_USER.businessId);
            if (biz) {
                biz.purchasesCount = (biz.purchasesCount || 0) + addedPurchases;
                await db.collection('businesses').doc(biz.id).set({ purchasesCount: biz.purchasesCount }, {merge:true});
            }
            
            // To be technically accurate, the user who bought should get the points. 
            // In a real backend, a Cloud Function watches `status: verified` and increments the user's document.
            // For this frontend-mock MVP, we visually update global mock stats:
            MOCK_STATS.purchases += addedPurchases;
            this.saveData();

            this.showToast(`Successfully verified ${addedPurchases} transactions!`);
            this.openBusinessDashboard(); // refresh
        } catch (e) {
            console.error("Batch update failed:", e);
            this.showToast("Failed to sync approvals to cloud.");
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    },

    async saveBusinessProfile() {
        if (!MOCK_USER.businessId) return;
        const bizIndex = MOCK_BUSINESSES.findIndex(b => b.id === MOCK_USER.businessId);
        if (bizIndex === -1) return;

        const name = document.getElementById('edit-biz-name').value.trim();
        const founder = document.getElementById('edit-biz-founder').value.trim();
        const story = document.getElementById('edit-biz-story').value.trim();
        const contact = document.getElementById('edit-biz-contact').value.trim();
        const website = document.getElementById('edit-biz-website').value.trim();
        const location = document.getElementById('edit-biz-location').value.trim();
        const videoInputVal = document.getElementById('edit-biz-video').value.trim();

        if (!name || !founder) {
            this.showToast("Business name & founder name are required.");
            return;
        }

        const btn = document.getElementById('btn-save-biz-profile');
        const loader = document.getElementById('edit-biz-loading');
        btn.style.display = 'none';
        loader.classList.remove('hidden');

        try {
            let shopfrontUrl = MOCK_BUSINESSES[bizIndex].shopfrontImg;
            let videoUrl = videoInputVal;

            // Handle Photo URL
            const editShopUrl = document.getElementById('edit-biz-shopfront').value.trim();
            if(editShopUrl) shopfrontUrl = editShopUrl;

            MOCK_BUSINESSES[bizIndex].name = name;
            MOCK_BUSINESSES[bizIndex].founder = founder;
            MOCK_BUSINESSES[bizIndex].story = story;
            MOCK_BUSINESSES[bizIndex].contact = contact;
            MOCK_BUSINESSES[bizIndex].website = website;
            MOCK_BUSINESSES[bizIndex].location = location;
            MOCK_BUSINESSES[bizIndex].shopfrontImg = shopfrontUrl;
            MOCK_BUSINESSES[bizIndex].videoUrl = videoUrl;

            if (db) {
                await db.collection('businesses').doc(MOCK_USER.businessId).set(MOCK_BUSINESSES[bizIndex], {merge:true});
            }
            this.saveData();
            this.showToast("Business Profile Updated!");
            
            this.openBusinessDashboard(); // refresh
        } catch(e) {
            console.error(e);
            this.showToast("An error occurred during save. Re-try with a smaller image.");
        } finally {
            btn.style.display = 'block';
            loader.classList.add('hidden');
        }
    },

    async openUserHistory(type = 'checkin') {
        const title = document.getElementById('user-history-title');
        const list = document.getElementById('user-history-list');
        if (!title || !list) return;

        title.innerText = type === 'checkin' ? 'Check-in History' : 'Purchase History';
        list.innerHTML = '<p style="color: var(--text-secondary); text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> Fetching records...</p>';
        this.navigate('user-history');

        if (db) {
            try {
                const querySnapshot = await db.collection('transactions')
                    .where('userId', '==', MOCK_USER.id)
                    .where('type', '==', type)
                    .orderBy('timestamp', 'desc')
                    .limit(50)
                    .get();

                if (querySnapshot.empty) {
                    list.innerHTML = `<p style="color: var(--text-secondary); padding:2rem 1rem; text-align: center;">Contribute to the growth of empathy economy by purchasing from one of the For-Good Businesses</p>`;
                } else {
                    list.innerHTML = '';
                    querySnapshot.forEach(doc => {
                        const t = doc.data();
                        const biz = MOCK_BUSINESSES.find(b => b.id === t.bizId) || { name: 'Unknown Business' };
                        const dt = t.timestamp ? t.timestamp.toDate().toLocaleString() : 'Just now';
                        
                        let extraInfo = '';
                        let valueBlock = '';

                        if (type === 'purchase') {
                            const status = t.status || 'verified';
                            const statusColor = status === 'pending' ? 'var(--text-warning)' : 'var(--accent-success)';
                            const statusIcon = status === 'pending' ? '<i class="fa-solid fa-clock"></i> Pending ' : '<i class="fa-solid fa-check"></i> Verified ';
                            
                            extraInfo = `<small style="color:${statusColor}">${statusIcon} &bull; </small><small style="color:var(--text-secondary)">Receipt: ${t.receipt} &bull; ${dt}</small>`;
                            valueBlock = `<div style="color:${statusColor}; font-weight:bold;">$${parseFloat(t.amount).toFixed(2)}</div>`;
                        } else {
                            extraInfo = `<small style="color:var(--text-secondary)">${dt}</small>`;
                            valueBlock = `<div style="color:var(--accent-primary);"><i class="fa-solid fa-location-dot"></i></div>`;
                        }

                        list.innerHTML += `
                            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 0.8rem 0;">
                                <div>
                                    <strong>${biz.name}</strong><br>
                                    ${extraInfo}
                                </div>
                                ${valueBlock}
                            </div>
                        `;
                    });
                }
            } catch(e) {
                console.error(e);
                list.innerHTML = '<p style="color: var(--text-secondary); padding:2rem 1rem; text-align: center;">Contribute to the growth of empathy economy by purchasing from one of the For-Good Businesses</p>';
            }
        } else {
            list.innerHTML = `<p style="color: var(--text-warning); padding:1rem; text-align:center;">Cloud history unavailable in local-only demo mode.</p>`;
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
