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
let storage = null;
if (typeof firebase !== 'undefined') {
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
        storage = firebase.storage();
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
        name: "GreenRoots Cafe",
        founder: "Sarah Jenkins",
        story: "Sarah started GreenRoots with a simple conviction: food should heal the body and the earth. We source 100% locally and employ at-risk youth.",
        score: { s: 'A', e: 'A', c: 'B', soc: 'A', env: 'A' },
        location: "123 Earth Way, Eco District",
        contact: "hello@greenroots.com",
        shopfrontImg: "",
        founderImg: ""
    },
    {
        id: "biz_2",
        name: "ThreadLightly Apparel",
        founder: "Marcus Thorne",
        story: "After seeing the waste of fast fashion, Marcus created a circular clothing brand where every piece is upcycled and every worker is a stakeholder.",
        score: { s: 'B', e: 'A', c: 'A', soc: 'B', env: 'A' },
        location: "45 Sustainable Ave",
        contact: "info@threadlightly.com",
        shopfrontImg: "",
        founderImg: ""
    },
    {
        id: "biz_3",
        name: "The Empathetic Baker",
        founder: "Elena Rodriguez",
        story: "Elena believes in the power of bread to bring people together. For every loaf sold, one is donated to a local shelter.",
        score: { s: 'A', e: 'B', c: 'A', soc: 'A', env: 'A' },
        location: "800 Community Blvd",
        contact: "baker@empatheticbaker.com",
        shopfrontImg: "",
        founderImg: ""
    }
];



let MOCK_USER = JSON.parse(localStorage.getItem('bfg_user')) || null;
let MOCK_STATS = JSON.parse(localStorage.getItem('bfg_stats')) || INITIAL_STATS;
let MOCK_BUSINESSES = JSON.parse(localStorage.getItem('bfg_businesses')) || INITIAL_BUSINESSES;

// --- App State & Logic ---

const app = {
    currentView: 'dashboard',
    scannedBusiness: null,

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
            } catch (e) {
                console.error("Firestore read error:", e);
                this.showToast("Failed to connect to cloud database.");
            }
        }
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
            
            const scoreStr = typeof biz.score === 'object' ? `${biz.score.s}${biz.score.e}${biz.score.c}${biz.score.soc}${biz.score.env}` : biz.score;
            const imgStyle = biz.shopfrontImg ? `background-image: url(${biz.shopfrontImg}); background-size: cover; background-position: center; border:none;` : `background: linear-gradient(${deg}deg, var(--accent-primary), var(--accent-secondary))`;

            card.innerHTML = `
                <div class="business-img" style="${imgStyle}"></div>
                <div class="business-info">
                    <h3>${biz.name}</h3>
                    <p><i class="fa-solid fa-user-tie"></i> ${biz.founder}</p>
                    <span class="business-score"><i class="fa-solid fa-star"></i> BFG Score: ${scoreStr}</span>
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

        container.innerHTML = `
            ${heroHTML}
            <h2>${biz.name}</h2>
            <div class="business-score" style="margin-bottom: 1.5rem; display:flex; flex-direction:column; align-items:flex-start; gap:0.5rem;">
                <div><i class="fa-solid fa-star"></i> TheBFG.Team Score: <strong>${scoreStr}</strong></div>
                <div style="font-size:0.75rem; color:var(--text-secondary); background:rgba(0,0,0,0.2); padding:0.5rem; border-radius:var(--radius-md); font-family:monospace;">
                    Sh:${typeof biz.score === 'object' ? biz.score.s : '-'} | Em:${typeof biz.score === 'object' ? biz.score.e : '-'} | Cu:${typeof biz.score === 'object' ? biz.score.c : '-'} | So:${typeof biz.score === 'object' ? biz.score.soc : '-'} | Env:${typeof biz.score === 'object' ? biz.score.env : '-'}
                </div>
            </div>
            
            <div class="detail-section glass-card">
                <h3>Founder's Conviction</h3>
                ${founderImgHTML}
                <p><strong>${biz.founder}</strong></p>
                <p style="margin-top: 0.5rem; font-style: italic;">"${biz.story}"</p>
                <div style="clear:both;"></div>
            </div>
            
            <div class="detail-section glass-card">
                <h3>Contact & Location</h3>
                <p><i class="fa-solid fa-envelope" style="width: 20px;"></i> ${biz.contact}</p>
                <p style="margin-top: 0.5rem;"><i class="fa-solid fa-location-dot" style="width: 20px;"></i> ${biz.location}</p>
                ${mapIframe}
            </div>
            ${biz.videoUrl ? `<div style="margin-top: 1.5rem;"><h3 style="margin-bottom:0.8rem">Founder's Message</h3><video controls style="width:100%; border-radius: var(--radius-md);"><source src="${biz.videoUrl}" type="video/mp4">Your browser doesn't support video.</video></div>` : ''}
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

    adminClickCount: 0,
    handleAdminClick() {
        this.adminClickCount++;
        if(this.adminClickCount >= 5) {
            MOCK_USER.isAdmin = !MOCK_USER.isAdmin;
            this.saveData();
            this.populateProfile();
            this.showToast(MOCK_USER.isAdmin ? "Admin mode Enabled" : "Admin mode Disabled");
            this.adminClickCount = 0;
        }
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

        // Update stats
        MOCK_STATS.purchases++;
        MOCK_USER.purchases++;

        if (this.scannedBusiness) {
            this.scannedBusiness.purchasesCount = (this.scannedBusiness.purchasesCount || 0) + 1;
            if (db) {
                try {
                    await db.collection('transactions').add({
                        type: 'purchase',
                        bizId: this.scannedBusiness.id,
                        userId: MOCK_USER.id,
                        userNickname: MOCK_USER.name,
                        receipt: receipt,
                        amount: parseFloat(amount),
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    await db.collection('businesses').doc(this.scannedBusiness.id).set({ purchasesCount: this.scannedBusiness.purchasesCount }, {merge:true});
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

    async addBusiness() {
        const name = document.getElementById('admin-biz-name').value.trim();
        const founder = document.getElementById('admin-biz-founder').value.trim();
        const ownerEmail = document.getElementById('admin-biz-owner-email').value.trim();
        const story = document.getElementById('admin-biz-story').value.trim();
        const location = document.getElementById('admin-biz-location').value.trim();
        const contact = document.getElementById('admin-biz-contact').value.trim();
        
        const score = {
            s: document.getElementById('score-shareholder').value,
            e: document.getElementById('score-employee').value,
            c: document.getElementById('score-customer').value,
            soc: document.getElementById('score-society').value,
            env: document.getElementById('score-env').value
        };

        if (!name || !founder || !story || !location || !contact) {
            this.showToast("Please fill in basic business details.");
            return;
        }

        document.getElementById('btn-add-biz').style.display = 'none';
        document.getElementById('admin-loading').classList.remove('hidden');

        const shopfrontImg = await this.getBase64Image('admin-biz-shopfront');
        const founderImg = await this.getBase64Image('admin-biz-founder-img');

        const newBiz = {
            id: 'biz_' + Date.now(),
            name,
            founder,
            ownerEmail,
            story,
            location,
            contact,
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
        document.getElementById('admin-biz-shopfront').value = '';
        document.getElementById('admin-biz-founder-img').value = '';

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
                        list.innerHTML += `
                            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 0.8rem 0;">
                                <div>
                                    <strong>${t.userNickname}</strong><br>
                                    <small style="color:var(--text-secondary)">Receipt: ${t.receipt} &bull; ${dt}</small>
                                </div>
                                <div style="color:var(--accent-success); font-weight:bold;">
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
        document.getElementById('edit-biz-location').value = biz.location || '';
        
        this.navigate('business-profile-edit');
    },

    async uploadMediaToStorage(fileInputElementId, pathPrefix) {
        const input = document.getElementById(fileInputElementId);
        if (!input.files || !input.files[0]) return null;
        const file = input.files[0];
        
        if (!storage) {
            this.showToast('Storage module not loaded! Cannot upload media.');
            throw new Error('No storage');
        }

        const ext = file.name.split('.').pop();
        const ref = storage.ref().child(`businesses/${pathPrefix}_${Date.now()}.${ext}`);
        await ref.put(file);
        return await ref.getDownloadURL();
    },

    async saveBusinessProfile() {
        if (!MOCK_USER.businessId) return;
        const bizIndex = MOCK_BUSINESSES.findIndex(b => b.id === MOCK_USER.businessId);
        if (bizIndex === -1) return;

        const name = document.getElementById('edit-biz-name').value.trim();
        const founder = document.getElementById('edit-biz-founder').value.trim();
        const story = document.getElementById('edit-biz-story').value.trim();
        const contact = document.getElementById('edit-biz-contact').value.trim();
        const location = document.getElementById('edit-biz-location').value.trim();

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
            let videoUrl = MOCK_BUSINESSES[bizIndex].videoUrl || '';

            // Handle Photo
            const newPhotoUrl = await this.uploadMediaToStorage('edit-biz-shopfront', `shopfront_${MOCK_USER.businessId}`).catch(e=>null);
            if(newPhotoUrl) shopfrontUrl = newPhotoUrl;

            // Handle Video
            const newVideoUrl = await this.uploadMediaToStorage('edit-biz-video', `video_${MOCK_USER.businessId}`).catch(e=>null);
            if(newVideoUrl) videoUrl = newVideoUrl;

            MOCK_BUSINESSES[bizIndex].name = name;
            MOCK_BUSINESSES[bizIndex].founder = founder;
            MOCK_BUSINESSES[bizIndex].story = story;
            MOCK_BUSINESSES[bizIndex].contact = contact;
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
            this.showToast("An error occurred during save.");
        } finally {
            btn.style.display = 'block';
            loader.classList.add('hidden');
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
