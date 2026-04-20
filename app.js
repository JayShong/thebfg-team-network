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
const APP_VERSION = "0.91";

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

// --- Data & Persistence ---

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
        sector: "F&B",
        score: { s: 'A', e: 'A', c: 'A', soc: 'B', env: 'A' },
        location: "404 Sunshine Blvd, Eco District",
        contact: "hello@solariscoffee.example.com",
        website: "https://solariscoffee.example.com",
        shopfrontImg: "",
        founderImg: "",
        createdAt: "2024-01-01T00:00:00.000Z",
        validUntil: "2025-01-01T00:00:00.000Z",
        createdBy: "jayshong@gmail.com"
    },
    {
        id: "biz_2",
        name: "Oceanic Surf Gear",
        founder: "Kai Manu",
        story: "Kai built Oceanic to protect the waves he loves. Every surfboard and rash guard is made from upcycled ocean plastics.",
        type: "full",
        sector: "Retail",
        score: { s: 'B', e: 'B', c: 'A', soc: 'A', env: 'A' },
        location: "15 Coastline Way, Marina Bay",
        contact: "ride@oceanicsurf.example.com",
        website: "https://oceanicsurf.example.com",
        shopfrontImg: "",
        founderImg: "",
        createdAt: "2024-01-01T00:00:00.000Z",
        validUntil: "2025-01-01T00:00:00.000Z",
        createdBy: "jayshong@gmail.com"
    },
    {
        id: "biz_3",
        name: "Urban Harvest Grove",
        founder: "David Chen",
        story: "David brought agriculture to the city center. Urban Harvest provides zero-mile, pesticide-free produce to local communities.",
        type: "full",
        sector: "Agriculture",
        score: { s: 'A', e: 'A', c: 'A', soc: 'A', env: 'A' },
        location: "99 Metro Plaza, City Center",
        contact: "info@urbanharvest.example.com",
        website: "https://urbanharvest.example.com",
        shopfrontImg: "",
        founderImg: "",
        createdAt: "2024-01-01T00:00:00.000Z",
        validUntil: "2025-01-01T00:00:00.000Z",
        createdBy: "jayshong@gmail.com"
    }
];



let currentUser = JSON.parse(localStorage.getItem('bfg_user')) || null;
if (currentUser && !currentUser.activityLog) currentUser.activityLog = [];
let networkStats = JSON.parse(localStorage.getItem('bfg_stats')) || INITIAL_STATS;
let businesses = JSON.parse(localStorage.getItem('bfg_businesses')) || INITIAL_BUSINESSES;
const SUPER_ADMIN_EMAIL = 'jayshong@gmail.com';
let PLATFORM_INITIATIVES = JSON.parse(localStorage.getItem('bfg_initiatives')) || [];
let PLATFORM_PRIVILEGES = JSON.parse(localStorage.getItem('bfg_privileges')) || [];
let adminEmails = ['jayshong@gmail.com'];
let auditorEmails = ['jayshong@gmail.com'];

// --- Season System ---
const CURRENT_SEASON = {
    id: 'season_1',
    name: 'Season 1: Genesis',
    startDate: '2026-04-01T00:00:00.000Z',
    endDate: '2026-09-30T23:59:59.000Z',
    description: 'The founding season of the Conviction Network.'
};

const BADGE_CATEGORIES = {
    'Seen':     { label: 'Seen',     icon: 'fa-binoculars',        color: '#3B82F6', description: 'Making for-good businesses discoverable.' },
    'Verified': { label: 'Verified', icon: 'fa-shield-halved',     color: '#10B981', description: 'Normalising audited impact as a benchmark.' },
    'Valued':   { label: 'Valued',   icon: 'fa-hand-holding-heart', color: '#F59E0B', description: 'Making founders feel noticed and appreciated.' }
};

const BADGES_CONFIG = [
    // ===================== SEEN (Visibility) =====================
    { 
        id: 'seen_first_step', title: 'The First Step', category: 'Seen', icon: 'fa-shoe-prints',
        tier: null, tierGroup: null, seasonal: false,
        description: 'Recorded your very first check-in.',
        why: 'Every journey begins with a single choice. This badge marks the moment you entered the empathy economy.',
        how: 'Automatically earned the first time you check-in to any Conviction Network business.',
        actionText: 'Scan QR to Check-in', actionTarget: 'scanner'
    },
    { 
        id: 'seen_explorer', title: 'The Explorer', category: 'Seen', icon: 'fa-compass',
        tier: null, tierGroup: null, seasonal: false,
        description: 'Checked into 3 unique for-good businesses.',
        why: 'Discovery is the first step to making businesses visible. The more diverse your visits, the wider the network becomes.',
        how: 'Earned by checking in at 3 completely different business profiles.',
        actionText: 'Find New Businesses', actionTarget: 'directory'
    },
    { 
        id: 'seen_pathfinder', title: 'The Pathfinder', category: 'Seen', icon: 'fa-route',
        tier: null, tierGroup: null, seasonal: false,
        description: 'Checked into 7 unique for-good businesses.',
        why: 'You are actively mapping the empathy economy. Every new door you open makes that business more visible to others.',
        how: 'Earned by checking in at 7 completely different business profiles.',
        actionText: 'Discover More', actionTarget: 'directory'
    },
    { 
        id: 'seen_cartographer', title: 'The Cartographer', category: 'Seen', icon: 'fa-map',
        tier: null, tierGroup: null, seasonal: false,
        description: 'Checked into 15 unique for-good businesses.',
        why: 'You are drawing the map of the empathy economy. Founders across the city know they are being seen.',
        how: 'Earned by checking in at 15 completely different business profiles.',
        actionText: 'Keep Exploring', actionTarget: 'directory'
    },
    { 
        id: 'seen_nomad', title: 'Neighborhood Nomad', category: 'Seen', icon: 'fa-map-location-dot',
        tier: null, tierGroup: null, seasonal: false,
        description: 'Visited businesses in 3 different locations.',
        why: 'Crossing district lines to support for-good businesses is the physical effort that makes the network real.',
        how: 'Earned by checking in at businesses located in 3 distinct areas.',
        actionText: 'Explore Map', actionTarget: 'directory'
    },
    { 
        id: 'seen_wanderer', title: 'State Wanderer', category: 'Seen', icon: 'fa-earth-asia',
        tier: null, tierGroup: null, seasonal: false,
        description: 'Supported businesses in 2 or more states.',
        why: 'When the empathy economy crosses state borders, it becomes a national movement.',
        how: 'Earned by checking in at businesses in at least 2 different states.',
        actionText: 'Go Further', actionTarget: 'directory'
    },
    { 
        id: 'seen_pioneer', title: 'The Pioneer', category: 'Seen', icon: 'fa-flag',
        tier: null, tierGroup: null, seasonal: false,
        description: 'One of the first to visit a newly listed business.',
        why: 'New businesses are fragile. Being among the first visitors gives founders the confidence that they are seen.',
        how: 'Earned by checking in within 30 days of a business being added to the network.',
        actionText: 'Find New Listings', actionTarget: 'directory'
    },
    { 
        id: 'seen_sector_specialist', title: 'Sector Specialist', category: 'Seen', icon: 'fa-layer-group',
        tier: null, tierGroup: null, seasonal: false,
        description: 'Supported businesses across 3 different industries.',
        why: 'A diverse empathy economy is a resilient economy. Supporting multiple sectors builds a broad foundation.',
        how: 'Earned by checking in at businesses in 3+ different sectors (e.g. F&B, Retail, Services).',
        actionText: 'Diversify', actionTarget: 'directory'
    },
    { 
        id: 'seen_night_owl', title: 'Night Owl', category: 'Seen', icon: 'fa-moon',
        tier: null, tierGroup: null, seasonal: true,
        description: 'Checked in after 8 PM.',
        why: 'Evening support keeps businesses alive beyond the daytime rush. You showed up when others went home.',
        how: 'Earned by recording a check-in after 8:00 PM local time.',
        actionText: 'Visit Tonight', actionTarget: 'scanner'
    },
    { 
        id: 'seen_early_bird', title: 'Early Bird', category: 'Seen', icon: 'fa-sun',
        tier: null, tierGroup: null, seasonal: true,
        description: 'Checked in before 9 AM.',
        why: 'Starting the day with an empathetic choice sets the tone. You are part of the morning crew that keeps founders going.',
        how: 'Earned by recording a check-in before 9:00 AM local time.',
        actionText: 'Visit Tomorrow', actionTarget: 'scanner'
    },

    // ===================== VERIFIED (Verification) =====================
    { 
        id: 'verified_eco_warrior', title: 'Eco-Warrior', category: 'Verified', icon: 'fa-leaf',
        tier: null, tierGroup: null, seasonal: false,
        description: 'Visited 3 businesses with an Environment "A" score.',
        why: 'By choosing verified green businesses, you signal that environmental commitment is worth paying for.',
        how: 'Earned by checking in at 3 different businesses with an Environment paradigm score of "A".',
        actionText: 'Find Green Businesses', actionTarget: 'directory'
    },
    { 
        id: 'verified_eco_champion', title: 'Eco-Champion', category: 'Verified', icon: 'fa-seedling',
        tier: null, tierGroup: null, seasonal: false,
        description: 'Visited 7 businesses with an Environment "A" score.',
        why: 'Deep environmental commitment, repeated across many businesses, builds the trust infrastructure for green GDP.',
        how: 'Earned by checking in at 7 different businesses with an Environment paradigm score of "A".',
        actionText: 'Go Deeper', actionTarget: 'directory'
    },
    { 
        id: 'verified_social_hero', title: 'Social Hero', category: 'Verified', icon: 'fa-users',
        tier: null, tierGroup: null, seasonal: false,
        description: 'Visited 3 businesses with a Social "A" score.',
        why: 'Social equity is the backbone of a fair economy. Your support validates businesses that invest in people.',
        how: 'Earned by checking in at 3 different businesses with a Social paradigm score of "A".',
        actionText: 'Support Social Impact', actionTarget: 'directory'
    },
    { 
        id: 'verified_social_sentinel', title: 'Social Sentinel', category: 'Verified', icon: 'fa-shield-heart',
        tier: null, tierGroup: null, seasonal: false,
        description: 'Visited 7 businesses with a Social "A" score.',
        why: 'Sustained support for socially excellent businesses drives systemic change, not just good feelings.',
        how: 'Earned by checking in at 7 different businesses with a Social paradigm score of "A".',
        actionText: 'Defend the Standard', actionTarget: 'directory'
    },
    { 
        id: 'verified_purist', title: 'The Purist', category: 'Verified', icon: 'fa-gem',
        tier: null, tierGroup: null, seasonal: false,
        description: 'Visited a business with a perfect AAAAA score.',
        why: 'Total commitment to the BFG paradigm is rare. By visiting, you prove that perfection is worth the journey.',
        how: 'Earned by checking in at any business with a perfect AAAAA paradigm score.',
        actionText: 'Find Top Rated', actionTarget: 'directory'
    },
    { 
        id: 'verified_idealist', title: 'The Idealist', category: 'Verified', icon: 'fa-star',
        tier: null, tierGroup: null, seasonal: false,
        description: 'Visited 3 businesses with a perfect AAAAA score.',
        why: 'You are building a portfolio of perfection. This signals to the market that the highest standard of impact is valued.',
        how: 'Earned by checking in at 3 different businesses with a perfect AAAAA paradigm score.',
        actionText: 'Chase Perfection', actionTarget: 'directory'
    },
    { 
        id: 'verified_initiative_ally', title: 'Initiative Ally', category: 'Verified', icon: 'fa-bullhorn',
        tier: null, tierGroup: null, seasonal: true,
        description: 'Participated in a platform initiative.',
        why: 'Initiatives are how the network moves together. Your participation amplifies collective impact.',
        how: 'Earned by actively participating in at least 1 Conviction Network initiative.',
        actionText: 'View Initiatives', actionTarget: 'directory'
    },
    { 
        id: 'verified_zero_waste', title: 'Zero Waste Partner', category: 'Verified', icon: 'fa-recycle',
        tier: null, tierGroup: null, seasonal: false,
        description: 'Checked in 5 times at businesses with waste reduction programs.',
        why: 'Waste diversion is measurable impact. Repeat visits to waste-conscious businesses sustain their mission.',
        how: 'Earned by recording 5 check-ins at businesses with high Environment paradigm scores.',
        actionText: 'Support Zero Waste', actionTarget: 'directory'
    },

    // ===================== VALUED (Appreciation) =====================
    { 
        id: 'valued_weekend', title: 'Weekend Philanthropist', category: 'Valued', icon: 'fa-calendar-check',
        tier: null, tierGroup: null, seasonal: true,
        description: 'Showed up on your time off.',
        why: 'Choosing to support a for-good business on your day off tells the founder: "You matter enough for my free time."',
        how: 'Earned by recording a check-in or purchase on any Saturday or Sunday.',
        actionText: 'Visit This Weekend', actionTarget: 'scanner'
    },
    { 
        id: 'valued_weekend_regular', title: 'Weekend Regular', category: 'Valued', icon: 'fa-calendar-week',
        tier: null, tierGroup: null, seasonal: true,
        description: 'Showed up on 4 separate weekends.',
        why: 'One weekend is a nice gesture. Four weekends is a relationship. Founders notice who comes back.',
        how: 'Earned by recording activity on 4 distinct weekend days (Saturdays or Sundays).',
        actionText: 'Keep Coming', actionTarget: 'scanner'
    },
    { 
        id: 'valued_weekly_pulse', title: 'The Weekly Pulse', category: 'Valued', icon: 'fa-heart-pulse',
        tier: null, tierGroup: null, seasonal: true,
        description: 'Recorded 4 or more activities in a single week.',
        why: 'When you visit 4 times in one week, the empathy economy has a heartbeat. You are the pulse.',
        how: 'Earned by logging 4+ check-ins or purchases within a single calendar week (Mon-Sun).',
        actionText: 'Build Momentum', actionTarget: 'scanner'
    },
    { 
        id: 'valued_streak_bronze', title: 'Empathy Streak', category: 'Valued', icon: 'fa-fire',
        tier: 'Bronze', tierGroup: 'empathy_streak', seasonal: true,
        description: '2 consecutive weeks of activity.',
        why: 'Consistency is how habits form. Two weeks of showing up means the empathy economy is becoming part of your life.',
        how: 'Earned by recording at least 1 activity per week for 2 consecutive weeks.',
        actionText: 'Keep the Streak', actionTarget: 'scanner'
    },
    { 
        id: 'valued_streak_silver', title: 'Empathy Streak', category: 'Valued', icon: 'fa-fire',
        tier: 'Silver', tierGroup: 'empathy_streak', seasonal: true,
        description: '4 consecutive weeks of activity.',
        why: 'A month of unbroken support. Founders are starting to rely on people like you.',
        how: 'Earned by recording at least 1 activity per week for 4 consecutive weeks.',
        actionText: 'Keep the Streak', actionTarget: 'scanner'
    },
    { 
        id: 'valued_streak_gold', title: 'Empathy Streak', category: 'Valued', icon: 'fa-fire',
        tier: 'Gold', tierGroup: 'empathy_streak', seasonal: true,
        description: '8 consecutive weeks of activity.',
        why: 'Two months of unbroken commitment. You are the foundation the empathy economy is built on.',
        how: 'Earned by recording at least 1 activity per week for 8 consecutive weeks.',
        actionText: 'Keep the Streak', actionTarget: 'scanner'
    },
    { 
        id: 'valued_local_legend', title: 'Local Legend', category: 'Valued', icon: 'fa-store',
        tier: null, tierGroup: 'local_loyalty', seasonal: false,
        description: '5 visits to the same business.',
        why: 'When the barista knows your name, the empathy economy has a face. You are making one founder feel truly seen.',
        how: 'Earned by recording 5 check-ins at a single business.',
        actionText: 'Visit Your Local', actionTarget: 'directory'
    },
    { 
        id: 'valued_local_anchor', title: 'Local Anchor', category: 'Valued', icon: 'fa-anchor',
        tier: null, tierGroup: 'local_loyalty', seasonal: false,
        description: '15 visits to the same business.',
        why: 'You are the anchor that keeps a small business grounded. They know you, and they count on you.',
        how: 'Earned by recording 15 check-ins at a single business.',
        actionText: 'Deepen Your Bond', actionTarget: 'directory'
    },
    { 
        id: 'valued_local_family', title: 'Local Family', category: 'Valued', icon: 'fa-house-heart',
        tier: null, tierGroup: 'local_loyalty', seasonal: false,
        description: '30 visits to the same business.',
        why: 'You are not a customer anymore. You are family. This is what being valued truly means.',
        how: 'Earned by recording 30 check-ins at a single business.',
        actionText: 'You Are Home', actionTarget: 'directory'
    },
    { 
        id: 'valued_consummate', title: 'Consummate Supporter', category: 'Valued', icon: 'fa-basket-shopping',
        tier: null, tierGroup: null, seasonal: false,
        description: 'Recorded 10 separate purchases.',
        why: 'Every purchase is a vote. Ten votes says you are committed to keeping the empathy economy alive.',
        how: 'Earned by logging 10 valid purchase receipts across any Conviction Network business.',
        actionText: 'Log a Purchase', actionTarget: 'scanner'
    },
    { 
        id: 'valued_community_builder', title: 'Community Builder', category: 'Valued', icon: 'fa-people-group',
        tier: null, tierGroup: null, seasonal: false,
        description: 'Helped expand the network.',
        why: 'The network is only as strong as its nodes. You are actively expanding the reach of empathetic commerce.',
        how: 'Earned by successfully referring a friend or executing a Group Check-in.',
        actionText: 'Invite a Friend', actionTarget: 'directory'
    },
    { 
        id: 'valued_the_bridge', title: 'The Bridge', category: 'Valued', icon: 'fa-bridge',
        tier: null, tierGroup: null, seasonal: false,
        description: 'Referred 3 people to the network.',
        why: 'You are the bridge between the old economy and the empathy economy. Three connections and growing.',
        how: 'Earned by successfully referring 3 new members to the Conviction Network.',
        actionText: 'Grow the Network', actionTarget: 'directory'
    },
    { 
        id: 'valued_monday_motivator', title: 'Monday Motivator', category: 'Valued', icon: 'fa-mug-hot',
        tier: null, tierGroup: null, seasonal: true,
        description: 'Made a check-in on a Monday.',
        why: 'Mondays are hard. Choosing empathy on the hardest day of the week is a statement of intent.',
        how: 'Earned by recording a check-in on any Monday.',
        actionText: 'Start the Week Right', actionTarget: 'scanner'
    },
    { 
        id: 'valued_the_returnee', title: 'The Returnee', category: 'Valued', icon: 'fa-rotate-left',
        tier: null, tierGroup: null, seasonal: false,
        description: 'Came back after 30+ days away.',
        why: 'Life gets busy. Coming back after a break shows that the empathy economy is still part of who you are.',
        how: 'Earned by recording an activity after 30 or more days of inactivity.',
        actionText: 'Welcome Back', actionTarget: 'scanner'
    }
];

// --- App State & Logic ---

const app = {
    currentView: 'dashboard',
    scannedBusiness: null,
    adminEditingBizId: null,
    tutorialStep: 0,
    tutorialSteps: [
        {
            title: "Step 1: Locate the Standee",
            icon: "fa-qrcode",
            text: "Look for the physical theBFG.team standee next to the cashier or counter. Scan the QR code to start.",
            color: "#3B82F6",
            image: "assets/tutorial/scanner.png?v=2"
        },
        {
            title: "Step 2: Selection",
            icon: "fa-location-dot",
            text: "Support them by checking In. If you have bought anything, log the purchase.",
            color: "#10B981",
            image: "assets/tutorial/recognition.png?v=6"
        },
        {
            title: "Step 3: Log a Purchase",
            icon: "fa-receipt",
            text: "When logging a purchase, enter the Receipt ID and the Total Amount (RM) from your bill.",
            color: "#F59E0B",
            image: "assets/tutorial/purchase.png?v=6"
        },
        {
            title: "Step 4: Success!",
            icon: "fa-certificate",
            text: "A successful registration results in a green confirmation card. Your activity is now securely recorded in our database.",
            color: "#8B5CF6",
            image: "assets/tutorial/success.png?v=6"
        }
    ],

    async init() {
        // --- Firebase App Check ---
        if (typeof firebase !== 'undefined' && firebase.appCheck) {
            try {
                const appCheck = firebase.appCheck();
                // reCAPTCHA v3 site key for TheBFG.Team
                appCheck.activate(
                    new firebase.appCheck.ReCaptchaV3Provider('6LfLHL8sAAAAAJjW7YlO5Nj4jlx9kYW-cNYTOzeb'),
                    true // isTokenAutoRefreshEnabled
                );
                console.log("Firebase App Check Activated.");
            } catch (e) {
                console.warn("App Check activation failed:", e);
            }
        }

        if (auth) {
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    try {
                        const userDoc = await db.collection('users').doc(user.uid).get();
                        if (userDoc.exists) {
                            currentUser = userDoc.data();
                            currentUser.email = user.email;
                            currentUser.isEmailVerified = user.emailVerified;
                            currentUser.isGuest = false;
                            if (!currentUser.activityLog) currentUser.activityLog = [];
                        } else {
                            currentUser = {
                                id: user.uid,
                                name: user.displayName || 'Explorer',
                                email: user.email,
                                gender: '',
                                city: '',
                                dob: '',
                                causes: [],
                                isEmailVerified: user.emailVerified,
                                checkins: 0,
                                purchases: 0,
                                isAdmin: false,
                                isGuest: false,
                                badges: {},
                                visitedBizIds: [],
                                activityLog: []
                            };
                            await db.collection('users').doc(user.uid).set(currentUser);
                        }
                    } catch (e) {
                        console.error('Error handling user auth state:', e);
                    }
                    
                    document.getElementById('main-header').style.display = 'flex';
                    document.getElementById('bottom-nav').style.display = 'flex';
                    
                    await this.fetchCloudData();
                    this.saveData();
                    this.updateNewsreel();
                    this.renderStats();
                    this.renderBusinessList();
                    this.renderInitiatives();
                    this.renderPrivileges();
                    this.populateProfile();
                    this.navigate('dashboard');
                } else {
                    // Check if Guest Mode is Persisted
                    const isGuestMode = localStorage.getItem('bfg_guest_mode') === 'true';
                    if (isGuestMode) {
                        currentUser = {
                            id: 'guest',
                            name: 'Guest Explorer',
                            isGuest: true,
                            checkins: 0,
                            purchases: 0,
                            badges: {},
                            activityLog: []
                        };
                        document.getElementById('main-header').style.display = 'flex';
                        document.getElementById('bottom-nav').style.display = 'flex';
                        await this.fetchCloudData();
                        this.updateNewsreel();
                        this.renderStats();
                        this.renderBusinessList();
                        this.renderInitiatives();
                        this.renderPrivileges();
                        this.populateProfile();
                        this.navigate('dashboard');
                    } else {
                        currentUser = null;
                        document.getElementById('main-header').style.display = 'none';
                        document.getElementById('bottom-nav').style.display = 'none';
                        this.updateNewsreel(); // will hide it
                        this.navigate('login');
                        this.fetchCloudData(); // fetch generic data in background
                    }
                }
            });
        } else {
            // Fallback if SDK fails
            if (!currentUser) {
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
            this.renderInitiatives();
            this.renderPrivileges();
            this.populateProfile();
        }

        // Pre-fill remembered email
        const rememberedEmail = localStorage.getItem('bfg_remembered_email');
        if (rememberedEmail) {
            const emailInput = document.getElementById('login-email');
            const rememberCheck = document.getElementById('login-remember');
            if (emailInput) emailInput.value = rememberedEmail;
            if (rememberCheck) rememberCheck.checked = true;
        }
    },

    async fetchCloudData() {
        if(db && firebaseConfig.apiKey !== "YOUR_API_KEY") {
            try {
                // Fetch roles
                const rolesDoc = await db.collection('system').doc('roles').get();
                if(rolesDoc.exists) {
                    const rolesData = rolesDoc.data();
                    adminEmails = rolesData.adminEmails || [SUPER_ADMIN_EMAIL];
                    auditorEmails = rolesData.auditorEmails || [SUPER_ADMIN_EMAIL];
                    // Ensure super admin is always in all role lists
                    if (!adminEmails.includes(SUPER_ADMIN_EMAIL)) adminEmails.unshift(SUPER_ADMIN_EMAIL);
                    if (!auditorEmails.includes(SUPER_ADMIN_EMAIL)) auditorEmails.unshift(SUPER_ADMIN_EMAIL);
                } else {
                    await db.collection('system').doc('roles').set({
                        adminEmails: adminEmails,
                        auditorEmails: auditorEmails
                    });
                }

                // Fetch stats
                const statsDoc = await db.collection('system').doc('stats').get();
                if(statsDoc.exists) networkStats = statsDoc.data();
                else await db.collection('system').doc('stats').set(networkStats); // inject default
                
                // Fetch businesses
                const bizSnapshot = await db.collection('businesses').get();
                if (!bizSnapshot.empty) {
                    businesses = [];
                    bizSnapshot.forEach(doc => businesses.push(doc.data()));
                } else {
                    // Seed businesses
                    businesses.forEach(async biz => {
                        await db.collection('businesses').doc(biz.id).set(biz);
                    });
                }
                
                // Fetch initiatives
                const initSnapshot = await db.collection('initiatives').get();
                if (!initSnapshot.empty) {
                    PLATFORM_INITIATIVES = [];
                    initSnapshot.forEach(doc => {
                        let data = doc.data();
                        data.id = doc.id;
                        PLATFORM_INITIATIVES.push(data);
                    });
                } else if (currentUser && currentUser.isSuperAdmin) {
                    // Seed Eat2Give Default Initiative if DB is completely empty.
                    const initial = {
                        title: 'Eat2Give',
                        narrative: 'Eat2Give partnered with local restaurants to donate RM5 per meal directly to The Society for the Severely Mentally Handicapped (SSMH) in Malaysia, allowing our Conviction Network to effortlessly support great causes.',
                        mechanism: 'Order participating items from partnered menus.\nProve it by scanning the Eat2Give badge in the CheckD Wallet.\nThe Merchant Donates RM5 directly to charity without costing the user extra!',
                        url: 'https://www.checkd.io/eat2give',
                        status: 'past',
                        photos: []
                    };
                    const docRef = await db.collection('initiatives').add(initial);
                    initial.id = docRef.id;
                    PLATFORM_INITIATIVES.push(initial);
                }

                // Fetch privileges
                const privSnapshot = await db.collection('privileges').get();
                if (!privSnapshot.empty) {
                    PLATFORM_PRIVILEGES = [];
                    privSnapshot.forEach(doc => {
                        let data = doc.data();
                        data.id = doc.id;
                        PLATFORM_PRIVILEGES.push(data);
                    });
                } else if (currentUser && currentUser.isSuperAdmin) {
                    // Seed a default privilege
                    const initialPriv = {
                        title: 'Early Access',
                        description: 'Be the first to join upcoming initiatives and special community events.',
                        requiredTier: 'Silver',
                        status: 'active',
                        icon: 'fa-star'
                    };
                    const docRef = await db.collection('privileges').add(initialPriv);
                    initialPriv.id = docRef.id;
                    PLATFORM_PRIVILEGES.push(initialPriv);
                }


                if(currentUser && currentUser.email) {
                    currentUser.isSuperAdmin = currentUser.email === SUPER_ADMIN_EMAIL;
                    currentUser.isAdmin = adminEmails.includes(currentUser.email);
                    currentUser.isAuditor = auditorEmails.includes(currentUser.email);
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
        this.renderInitiatives();
        this.renderPrivileges();
        this.populateProfile();
        
        if (this.currentView === 'business-dashboard') {
            this.openBusinessDashboard();
        }
        
        if(btn) btn.querySelector('i').classList.remove('fa-spin');
        this.showToast('Data synchronized with server.');
    },

    async saveData() {
        localStorage.setItem('bfg_user', JSON.stringify(currentUser));
        localStorage.setItem('bfg_stats', JSON.stringify(networkStats));
        localStorage.setItem('bfg_businesses', JSON.stringify(businesses));
        localStorage.setItem('bfg_initiatives', JSON.stringify(PLATFORM_INITIATIVES));
        localStorage.setItem('bfg_privileges', JSON.stringify(PLATFORM_PRIVILEGES));

        // Push user to cloud
        if(db && currentUser && firebaseConfig.apiKey !== "YOUR_API_KEY") {
            try {
                await db.collection('users').doc(currentUser.id).set(currentUser, {merge: true});
            } catch (e) {
                console.warn("Could not sync user to cloud:", e);
            }
        }
    },

    navigate(viewId) {
        // Guest restrictions
        if (currentUser && currentUser.isGuest) {
            const forbidden = ['scanner', 'privileges', 'settings'];
            if (forbidden.includes(viewId)) {
                this.openGuestGate();
                return;
            }
        }

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
        if (viewId === 'audit-hub') this.renderAuditHub();

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
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value.trim();
        const err = document.getElementById('login-error');
        const btn = document.getElementById('login-btn');

        err.classList.add('hidden');

        if (!email || !password) {
            err.innerText = 'Please enter your email and password.';
            err.classList.remove('hidden');
            return;
        }

        if (auth) {
            // "Remember Me" logic
            const remember = document.getElementById('login-remember').checked;
            if (remember) {
                localStorage.setItem('bfg_remembered_email', email);
            } else {
                localStorage.removeItem('bfg_remembered_email');
            }

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
                        await credential.user.updateProfile({ displayName: 'Explorer' });
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
            btn.innerText = 'Join the Conviction Network / Login';
        } else {
            this.showToast("Auth module not loaded!");
        }
    },

    async logout() {
        if (auth) {
            await auth.signOut();
        }
        
        currentUser = null;
        localStorage.removeItem('bfg_user');
        
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        
        document.getElementById('main-header').style.display = 'none';
        document.getElementById('bottom-nav').style.display = 'none';
        
        this.navigate('login');
    },

    // --- Guest Mode Logic ---
    continueAsGuest() {
        localStorage.setItem('bfg_guest_mode', 'true');
        // Force state manually to speed up transition
        currentUser = {
            id: 'guest',
            name: 'Guest Explorer',
            isGuest: true,
            checkins: 0,
            purchases: 0,
            badges: {},
            activityLog: []
        };
        document.getElementById('main-header').style.display = 'flex';
        document.getElementById('bottom-nav').style.display = 'flex';
        this.fetchCloudData();
        this.renderStats();
        this.renderBusinessList();
        this.renderInitiatives();
        this.renderPrivileges();
        this.populateProfile();
        this.updateNewsreel();
        this.navigate('dashboard');
        this.showToast('Exploring as Guest. Discover for-good businesses!');
    },

    openGuestGate() {
        document.getElementById('modal-guest-gate').classList.remove('hidden');
    },

    closeGuestGate() {
        document.getElementById('modal-guest-gate').classList.add('hidden');
    },

    exitGuestMode() {
        localStorage.removeItem('bfg_guest_mode');
        this.closeGuestGate();
        this.logout();
    },

    updateNewsreel() {
        const reel = document.getElementById('newsreel');
        if (!reel) return;

        if (!currentUser) {
            reel.classList.add('hidden');
            return;
        }

        reel.classList.remove('hidden');
        let message = "";

        // Reset onclick
        reel.onclick = null;
        reel.style.cursor = "default";

        if (currentUser.isGuest) {
            message = "🔍 Exploring Mode: Join the Network to earn status & privileges.";
            reel.style.cursor = "pointer";
            reel.onclick = () => this.exitGuestMode();
        } else if (currentUser.name === 'Explorer') {
            message = "Introduce yourself to the network with a nickname.";
            reel.style.cursor = "pointer";
            reel.onclick = () => this.navigate('settings');
        } else {
            message = `✨ Welcome back, ${currentUser.name}! Your support strengthens the Empathy Economy.`;
        }

        reel.innerText = message;
    },

    renderStats() {
        document.getElementById('stat-global-consumers').innerText = networkStats.consumers.toLocaleString();
        document.getElementById('stat-global-businesses').innerText = networkStats.businesses.toLocaleString();
        document.getElementById('stat-global-checkins').innerText = networkStats.checkins.toLocaleString();
        document.getElementById('stat-global-purchases').innerText = networkStats.purchases.toLocaleString();

        // National business penetration baseline using GDP
        // DOSM Nominal GDP for Malaysia 2023 (~RM 1.82 Trillion)
        const NOMINAL_GDP_MY_RM = 1820000000000;
        
        let totalConvictionNetworkRevenue = 0;
        businesses.forEach(biz => {
            if (biz.status !== 'expired' && biz.yearlyAssessments) {
                let latestRev = 0;
                Object.values(biz.yearlyAssessments).forEach(ya => {
                    if (ya.revenue) {
                        const rev = Number(ya.revenue.toString().replace(/,/g, ''));
                        if (!isNaN(rev)) latestRev = Math.max(latestRev, rev);
                    }
                });
                totalConvictionNetworkRevenue += latestRev;
            }
        });

        const penetration = (totalConvictionNetworkRevenue / NOMINAL_GDP_MY_RM) * 100;
        document.getElementById('stat-global-penetration').innerText = penetration.toFixed(10) + '%';

        if (currentUser) {
            document.getElementById('stat-personal-checkins').innerText = currentUser.checkins.toLocaleString();
            document.getElementById('stat-personal-purchases').innerText = currentUser.purchases.toLocaleString();
        }
    },

    evaluateBadges(user) {
        if (!user || (!user.checkins && !user.purchases && (!user.badges || Object.keys(user.badges).length === 0))) return;

        if (!user.badges) user.badges = {};
        if (!user.visitedBizIds) user.visitedBizIds = [];
        if (!user.activityLog) user.activityLog = [];

        let newlyUnlocked = [];

        const checkUnlock = (id, condition) => {
            if (!user.badges[id]?.unlocked && condition) {
                user.badges[id] = { unlocked: true, date: new Date().toISOString(), season: CURRENT_SEASON.id };
                newlyUnlocked.push(BADGES_CONFIG.find(b => b.id === id));
            }
        };

        const totalActivities = (user.checkins || 0) + (user.purchases || 0);

        // ====== SEEN BADGES ======
        checkUnlock('seen_first_step', totalActivities >= 1);
        checkUnlock('seen_explorer', user.visitedBizIds.length >= 3);
        checkUnlock('seen_pathfinder', user.visitedBizIds.length >= 7);
        checkUnlock('seen_cartographer', user.visitedBizIds.length >= 15);

        // Analysis pass over activityLog
        const ecoBizIds = new Set();
        const socialBizIds = new Set();
        const perfectBizIds = new Set();
        const locations = new Set();
        const sectors = new Set();
        const bizCheckinCounts = {};
        let hasWeekend = false;
        let weekendDays = new Set(); // unique weekend dates
        let hasMonday = false;
        let hasNightOwl = false;
        let hasEarlyBird = false;
        let envCheckinCount = 0;
        const weeklyActivityMap = {}; // 'YYYY-WW' => count

        user.activityLog.forEach(log => {
            const biz = businesses.find(b => b.id === log.bizId);
            const logDate = new Date(log.timestamp);
            const dayOfWeek = logDate.getDay();
            const hour = logDate.getHours();

            // Score-based analysis
            if (biz && biz.score && typeof biz.score === 'object') {
                if (biz.score.env === 'A') { ecoBizIds.add(log.bizId); envCheckinCount++; }
                if (biz.score.soc === 'A') socialBizIds.add(log.bizId);
                if (biz.score.s === 'A' && biz.score.e === 'A' && biz.score.c === 'A' && biz.score.soc === 'A' && biz.score.env === 'A') {
                    perfectBizIds.add(log.bizId);
                }
            }

            // Location & sector
            if (log.location) locations.add(log.location);
            if (biz && biz.sector) sectors.add(biz.sector);

            // Time-based
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                hasWeekend = true;
                weekendDays.add(logDate.toISOString().slice(0, 10));
            }
            if (dayOfWeek === 1) hasMonday = true;
            if (hour >= 20) hasNightOwl = true;
            if (hour < 9) hasEarlyBird = true;

            // Checkin counts per biz
            if (log.type === 'checkin') {
                bizCheckinCounts[log.bizId] = (bizCheckinCounts[log.bizId] || 0) + 1;
            }

            // Pioneer: check if business was added within 30 days of this checkin
            if (biz && biz.createdAt) {
                const bizCreated = new Date(biz.createdAt);
                const diffDays = (logDate - bizCreated) / (1000 * 60 * 60 * 24);
                if (diffDays >= 0 && diffDays <= 30) {
                    checkUnlock('seen_pioneer', true);
                }
            }

            // Weekly activity tracking
            const startOfYear = new Date(logDate.getFullYear(), 0, 1);
            const weekNum = Math.ceil(((logDate - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
            const weekKey = `${logDate.getFullYear()}-W${weekNum}`;
            weeklyActivityMap[weekKey] = (weeklyActivityMap[weekKey] || 0) + 1;
        });

        // Seen badges
        checkUnlock('seen_nomad', locations.size >= 3);
        checkUnlock('seen_sector_specialist', sectors.size >= 3);
        checkUnlock('seen_night_owl', hasNightOwl);
        checkUnlock('seen_early_bird', hasEarlyBird);
        // State Wanderer - stub: check if 2+ distinct "state-like" locations (simplified)
        // For now, won't auto-trigger — needs state field on businesses

        // ====== VERIFIED BADGES ======
        checkUnlock('verified_eco_warrior', ecoBizIds.size >= 3);
        checkUnlock('verified_eco_champion', ecoBizIds.size >= 7);
        checkUnlock('verified_social_hero', socialBizIds.size >= 3);
        checkUnlock('verified_social_sentinel', socialBizIds.size >= 7);
        checkUnlock('verified_purist', perfectBizIds.size > 0);
        checkUnlock('verified_idealist', perfectBizIds.size >= 3);
        checkUnlock('verified_zero_waste', envCheckinCount >= 5);
        // Initiative Ally - contextual, triggered elsewhere

        // ====== VALUED BADGES ======
        checkUnlock('valued_weekend', hasWeekend);
        checkUnlock('valued_weekend_regular', weekendDays.size >= 4);
        checkUnlock('valued_monday_motivator', hasMonday);
        checkUnlock('valued_consummate', (user.purchases || 0) >= 10);

        // Local loyalty family
        const maxBizVisits = Math.max(0, ...Object.values(bizCheckinCounts));
        checkUnlock('valued_local_legend', maxBizVisits >= 5);
        checkUnlock('valued_local_anchor', maxBizVisits >= 15);
        checkUnlock('valued_local_family', maxBizVisits >= 30);

        // Weekly Pulse: any single week with 4+ activities
        const hasWeeklyPulse = Object.values(weeklyActivityMap).some(count => count >= 4);
        checkUnlock('valued_weekly_pulse', hasWeeklyPulse);

        // Empathy Streak: consecutive weeks with activity
        const sortedWeeks = Object.keys(weeklyActivityMap).sort();
        let maxConsecutiveWeeks = 0;
        let currentStreak = 1;
        for (let i = 1; i < sortedWeeks.length; i++) {
            const [curYear, curWeek] = sortedWeeks[i].split('-W').map(Number);
            const [prevYear, prevWeek] = sortedWeeks[i-1].split('-W').map(Number);
            if ((curYear === prevYear && curWeek === prevWeek + 1) || (curYear === prevYear + 1 && prevWeek >= 52 && curWeek === 1)) {
                currentStreak++;
            } else {
                currentStreak = 1;
            }
            maxConsecutiveWeeks = Math.max(maxConsecutiveWeeks, currentStreak);
        }
        if (sortedWeeks.length === 1) maxConsecutiveWeeks = 1;
        checkUnlock('valued_streak_bronze', maxConsecutiveWeeks >= 2);
        checkUnlock('valued_streak_silver', maxConsecutiveWeeks >= 4);
        checkUnlock('valued_streak_gold', maxConsecutiveWeeks >= 8);

        // The Returnee: activity after 30+ days of inactivity
        if (user.activityLog.length >= 2) {
            const sortedByDate = [...user.activityLog].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            for (let i = 1; i < sortedByDate.length; i++) {
                const daysBetween = (new Date(sortedByDate[i].timestamp) - new Date(sortedByDate[i-1].timestamp)) / (1000 * 60 * 60 * 24);
                if (daysBetween >= 30) {
                    checkUnlock('valued_the_returnee', true);
                    break;
                }
            }
        }

        // Community Builder / The Bridge - triggered via explicit admin/referral action

        if (newlyUnlocked.length > 0) {
            newlyUnlocked.forEach(b => {
                const tierLabel = b.tier ? ` (${b.tier})` : '';
                this.showToast(`🏆 Badge unlocked: ${b.title}${tierLabel}!`);
            });
            this.saveData();
            if (this.currentView === 'privileges') this.renderPrivileges();
        }
    },

    getUserTier(user) {
        if (!user || (!user.badges && !user.checkins)) {
            return { name: 'Blue', badgeCount: 0, nextThreshold: 5, progress: 0, isMax: false, missingCats: [], totalNext: 5, categoryCounts: { 'Seen': 0, 'Verified': 0, 'Valued': 0 } };
        }
        
        const unlockedCount = user.badges ? Object.values(user.badges).filter(b => b.unlocked).length : 0;
        const categoryCounts = { 'Seen': 0, 'Verified': 0, 'Valued': 0 };
        BADGES_CONFIG.forEach(b => {
            if (user.badges && user.badges[b.id]?.unlocked) {
                categoryCounts[b.category] = (categoryCounts[b.category] || 0) + 1;
            }
        });

        let name = 'Blue';
        let baseCount = 0;
        let nextThreshold = 5;
        let isMax = false;
        let missingCats = [];

        // Categorical Mastery Requirements
        const hasSilver = unlockedCount >= 5 && categoryCounts['Seen'] >= 3;
        const hasGold = hasSilver && unlockedCount >= 12 && categoryCounts['Valued'] >= 5;
        const hasPlatinum = hasGold && unlockedCount >= 20 && categoryCounts['Verified'] >= 5;

        if (hasPlatinum) {
            name = 'Platinum';
            baseCount = 20;
            nextThreshold = 20;
            isMax = true;
        } else if (hasGold) {
            name = 'Gold';
            baseCount = 12;
            nextThreshold = 20;
            if (unlockedCount >= 20 && categoryCounts['Verified'] < 5) missingCats.push('Verified');
        } else if (hasSilver) {
            name = 'Silver';
            baseCount = 5;
            nextThreshold = 12;
            if (unlockedCount >= 12 && categoryCounts['Valued'] < 5) missingCats.push('Valued');
        } else {
            name = 'Blue';
            baseCount = 0;
            nextThreshold = 5;
            if (unlockedCount >= 5 && categoryCounts['Seen'] < 3) missingCats.push('Seen');
        }

        let progress = isMax ? 100 : ((unlockedCount - baseCount) / (Math.max(1, nextThreshold - baseCount))) * 100;
        if (!isMax && unlockedCount >= nextThreshold && missingCats.length > 0) progress = 95;

        return { name, badgeCount: unlockedCount, nextThreshold, progress, isMax, totalNext: nextThreshold, missingCats, categoryCounts };
    },

    renderPrivileges() {
        const listContainer = document.getElementById('privileges-list-container');
        const tierCardContainer = document.getElementById('privileges-tier-card');
        const badgeGalleryContainer = document.getElementById('badge-gallery-container');
        
        if (!listContainer || !tierCardContainer || !badgeGalleryContainer) return;

        const tierInfo = this.getUserTier(currentUser);
        const tName = tierInfo.name.toLowerCase();
        
        // Update Showcase Card
        tierCardContainer.className = `glass-card tier-card tier-${tName}`;
        let ptsText = tierInfo.isMax ? `${tierInfo.badgeCount} Badges Unlocked` : `${tierInfo.badgeCount} / ${tierInfo.totalNext} Badges`;
        
        let targetTierName = 'Silver';
        if (tierInfo.name === 'Gold') targetTierName = 'Platinum';
        else if (tierInfo.name === 'Silver') targetTierName = 'Gold';
        else if (tierInfo.name === 'Blue') targetTierName = 'Silver';

        let msgText = tierInfo.isMax ? `You have reached the highest tier!` : `Unlock ${tierInfo.totalNext - tierInfo.badgeCount} more badges to reach ${targetTierName}`;
        
        if (!tierInfo.isMax && tierInfo.missingCats && tierInfo.missingCats.length > 0) {
            const countDiff = Math.max(0, tierInfo.totalNext - tierInfo.badgeCount);
            if (countDiff > 0) {
                msgText = `Unlock ${countDiff} more badges AND mastery in <strong>${tierInfo.missingCats.join(', ')}</strong> to reach ${targetTierName}.`;
            } else {
                msgText = `Badge count met! Complete <strong>${tierInfo.missingCats.join(', ')}</strong> requirements to reach ${targetTierName}.`;
            }
        }

        // Season end
        const seasonEnd = new Date(CURRENT_SEASON.endDate);
        const daysLeft = Math.max(0, Math.ceil((seasonEnd - new Date()) / (1000 * 60 * 60 * 24)));

        tierCardContainer.innerHTML = `
            <div style="position: relative; z-index: 2;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
                    <p style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.7; margin:0;">Current Tier</p>
                    <span style="font-size: 0.65rem; background: rgba(255,255,255,0.15); padding: 0.2rem 0.6rem; border-radius: 1rem; letter-spacing: 0.5px;">
                        <i class="fa-solid fa-clock"></i> ${CURRENT_SEASON.name} · ${daysLeft} days left
                    </span>
                </div>
                <h2>${tierInfo.name} Status</h2>
                <div style="font-size: 1.5rem; font-weight: bold; margin: 1rem 0;">
                    <i class="fa-solid fa-gem"></i>
                </div>
                <p style="font-weight: 500;">${ptsText}</p>
                <div style="display: flex; gap: 0.5rem; justify-content: center; margin: 0.5rem 0;">
                    <span style="font-size: 0.65rem; background: ${BADGE_CATEGORIES['Seen'].color}33; color: ${BADGE_CATEGORIES['Seen'].color}; padding: 0.15rem 0.5rem; border-radius: 1rem;"><i class="fa-solid ${BADGE_CATEGORIES['Seen'].icon}"></i> ${tierInfo.categoryCounts['Seen'] || 0} Seen</span>
                    <span style="font-size: 0.65rem; background: ${BADGE_CATEGORIES['Verified'].color}33; color: ${BADGE_CATEGORIES['Verified'].color}; padding: 0.15rem 0.5rem; border-radius: 1rem;"><i class="fa-solid ${BADGE_CATEGORIES['Verified'].icon}"></i> ${tierInfo.categoryCounts['Verified'] || 0} Verified</span>
                    <span style="font-size: 0.65rem; background: ${BADGE_CATEGORIES['Valued'].color}33; color: ${BADGE_CATEGORIES['Valued'].color}; padding: 0.15rem 0.5rem; border-radius: 1rem;"><i class="fa-solid ${BADGE_CATEGORIES['Valued'].icon}"></i> ${tierInfo.categoryCounts['Valued'] || 0} Valued</span>
                </div>
                <div class="tier-progress-bg">
                    <div class="tier-progress-fill" style="width: ${tierInfo.progress}%;"></div>
                </div>
                <p style="font-size: 0.8rem; margin-top: 0.8rem; opacity: 0.9;">${msgText}</p>
            </div>
        `;

        // Render Badge Gallery grouped by category
        badgeGalleryContainer.innerHTML = '';
        const categoryOrder = ['Seen', 'Verified', 'Valued'];
        categoryOrder.forEach(catKey => {
            const catInfo = BADGE_CATEGORIES[catKey];
            const catBadges = BADGES_CONFIG.filter(b => b.category === catKey);
            const unlockedInCat = catBadges.filter(b => currentUser.badges && currentUser.badges[b.id]?.unlocked).length;

            let sectionHTML = `
                <div class="badge-category-section" style="margin-bottom: 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.8rem; padding-bottom: 0.5rem; border-bottom: 2px solid ${catInfo.color}33;">
                        <i class="fa-solid ${catInfo.icon}" style="color: ${catInfo.color}; font-size: 1.1rem;"></i>
                        <div style="flex:1;">
                            <h4 style="margin: 0; font-size: 1rem; color: ${catInfo.color};">${catInfo.label}</h4>
                            <p style="text-align: center; font-size: 0.7rem; color: var(--text-secondary); margin-top: 1rem; opacity: 0.6;">Version 0.91</p>
                            <p style="margin: 0; font-size: 0.7rem; color: var(--text-secondary);">${catInfo.description}</p>
                        </div>
                        <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">${unlockedInCat}/${catBadges.length}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 0.75rem;">
            `;

            catBadges.forEach(b => {
                const isUnlocked = currentUser.badges && currentUser.badges[b.id] && currentUser.badges[b.id].unlocked;
                const stateClass = isUnlocked ? 'unlocked' : 'locked';
                const tierLabel = b.tier ? `<span style="font-size: 0.55rem; display: inline-block; margin-top: 0.2rem; padding: 0.1rem 0.4rem; border-radius: 1rem; background: rgba(255,255,255,0.1); color: var(--text-secondary);">${b.tier}</span>` : '';
                
                sectionHTML += `
                    <div class="badge-item ${stateClass}" style="cursor: pointer; padding: 0.8rem 0.5rem;" onclick="app.openBadgeModal('${b.id}')" title="${b.title}">
                        <div class="badge-icon-container" style="width: 50px; height: 50px; font-size: 1.2rem;">
                            <i class="fa-solid ${b.icon}"></i>
                        </div>
                        <h4 style="font-size: 0.75rem; line-height: 1.2;">${b.title}</h4>
                        ${tierLabel}
                    </div>
                `;
            });

            sectionHTML += `</div></div>`;
            badgeGalleryContainer.innerHTML += sectionHTML;
        });


        // Render Rewards List
        listContainer.innerHTML = '';
        const tierOrder = { 'Blue': 1, 'Silver': 2, 'Gold': 3, 'Platinum': 4 };
        const userTierLevel = tierOrder[tierInfo.name] || 1;

        const activePrivs = PLATFORM_PRIVILEGES.filter(p => p.status !== 'hidden').sort((a, b) => {
            const ta = tierOrder[a.requiredTier] || 0;
            const tb = tierOrder[b.requiredTier] || 0;
            return ta - tb;
        });

        if (activePrivs.length === 0) {
            listContainer.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding:2rem;">No privileges available at the moment. Keep building your momentum!</p>';
            return;
        }

        activePrivs.forEach(priv => {
            const reqLevel = tierOrder[priv.requiredTier] || 1;
            const isUnlocked = userTierLevel >= reqLevel;
            const lockClass = isUnlocked ? '' : 'locked';
            
            let tierColorText = 'var(--text-secondary)';
            if (priv.requiredTier === 'Silver') tierColorText = '#c0c0c0';
            if (priv.requiredTier === 'Gold') tierColorText = '#ffd700';
            if (priv.requiredTier === 'Platinum') tierColorText = '#E5E4E2';

            listContainer.innerHTML += `
                <div class="privilege-card ${lockClass}">
                    <div class="privilege-icon">
                        <i class="fa-solid ${priv.icon || 'fa-star'}" style="color: ${isUnlocked ? tierColorText : 'inherit'};"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <h4 style="margin: 0; font-size: 1.1rem;">${priv.title}</h4>
                            ${isUnlocked ? '<span style="font-size: 0.7rem; color: var(--accent-success); border: 1px solid var(--accent-success); padding: 0.2rem 0.5rem; border-radius: 1rem;"><i class="fa-solid fa-unlock"></i> Unlocked</span>' : `<span style="font-size: 0.7rem; color: var(--text-secondary); border: 1px solid rgba(255,255,255,0.2); padding: 0.2rem 0.5rem; border-radius: 1rem;"><i class="fa-solid fa-lock"></i> Requires ${priv.requiredTier}</span>`}
                        </div>
                        <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.4rem; line-height: 1.4;">
                            ${priv.description}
                        </p>
                    </div>
                </div>
            `;
        });
    },

    openBadgeModal(badgeId) {
        const b = BADGES_CONFIG.find(x => x.id === badgeId);
        if(!b) return;

        document.getElementById('badge-modal-title').innerText = b.title;
        document.getElementById('badge-modal-category').innerText = b.category + ' Badge';
        document.getElementById('badge-modal-icon').className = 'fa-solid ' + b.icon;
        document.getElementById('badge-modal-description').innerText = b.description;
        document.getElementById('badge-modal-why').innerText = b.why || 'Exploration pending.';
        document.getElementById('badge-modal-how').innerText = b.how || 'Details to be revealed.';

        const isUnlocked = currentUser && currentUser.badges && currentUser.badges[b.id] && currentUser.badges[b.id].unlocked;
        
        const iContainer = document.getElementById('badge-modal-icon-container');
        const actionContainer = document.getElementById('badge-modal-action-container');
        const actionBtn = document.getElementById('badge-modal-action-btn');

        if (isUnlocked) {
            iContainer.style.background = 'linear-gradient(135deg, var(--accent-primary), #FF8C00)';
            iContainer.style.color = '#FFF';
            iContainer.style.borderColor = '#FFD700';
            
            document.getElementById('badge-modal-acquired-container').style.display = 'block';
            actionContainer.style.display = 'none';

            const dateStr = currentUser.badges[b.id].date;
            document.getElementById('badge-modal-date').innerText = dateStr ? new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown';
        } else {
            iContainer.style.background = 'rgba(0,0,0,0.5)';
            iContainer.style.color = 'var(--text-secondary)';
            iContainer.style.borderColor = 'rgba(255,255,255,0.1)';
            
            document.getElementById('badge-modal-acquired-container').style.display = 'none';
            
            if (b.actionText && b.actionTarget) {
                actionContainer.style.display = 'block';
                actionBtn.innerText = b.actionText;
                actionBtn.onclick = () => {
                    this.closeBadgeModal();
                    this.navigate(b.actionTarget);
                };
            } else {
                actionContainer.style.display = 'none';
            }
        }

        document.getElementById('badge-modal').classList.remove('hidden');
    },

    closeBadgeModal() {
        document.getElementById('badge-modal').classList.add('hidden');
    },

    renderBusinessList() {
        const container = document.getElementById('business-list');
        container.innerHTML = '';
        
        // Sort: active businesses first, expired at bottom
        const sorted = [...businesses].sort((a, b) => {
            const aExp = a.status === 'expired' ? 1 : 0;
            const bExp = b.status === 'expired' ? 1 : 0;
            return aExp - bExp;
        });

        sorted.forEach(biz => {
            const isExpired = biz.status === 'expired';
            const card = document.createElement('div');
            card.className = 'glass-card business-card' + (isExpired ? ' biz-expired' : '');
            card.onclick = () => this.openBusinessDetail(biz.id);

            // Pseudo-random gradient for image placeholder
            const deg = Math.floor(Math.random() * 360);
            
            const scoreStr = typeof biz.score === 'object' && biz.score ? `${biz.score.s}${biz.score.e}${biz.score.c}${biz.score.soc}${biz.score.env}` : biz.score;
            const imgStyle = biz.shopfrontImg ? `background-image: url(${biz.shopfrontImg}); background-size: cover; background-position: center; border:none;` : `background: linear-gradient(${deg}deg, var(--accent-primary), var(--accent-secondary))`;

            let badgeHTML = biz.type === 'affiliate' 
                ? '<span class="business-score" style="color:var(--text-warning); border-color:var(--text-warning);"><i class="fa-solid fa-circle-info"></i> Affiliate Member (Not Audited)</span>' 
                : `<span class="business-score"><i class="fa-solid fa-star"></i> BFG Score: ${scoreStr}</span>`;

            if (isExpired) {
                badgeHTML = `<span class="business-score" style="color:#F44336; border-color:#F44336;"><i class="fa-solid fa-ban"></i> ${biz.expiryReason || 'Expired'}</span>`;
            }

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
        const biz = businesses.find(b => b.id === bizId);
        if(!biz) return;

        const container = document.getElementById('business-detail-content');
        const scoreStr = typeof biz.score === 'object' && biz.score ? `${biz.score.s}${biz.score.e}${biz.score.c}${biz.score.soc}${biz.score.env}` : biz.score;

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

        const isOwnerOrAdmin = currentUser && (currentUser.isSuperAdmin || currentUser.isAdmin || currentUser.businessId === biz.id);
        const downloadAction = isOwnerOrAdmin ? `<button class="btn btn-secondary mt-3" onclick="app.downloadQRStandee('${biz.id}')"><i class="fa-solid fa-download"></i> Download A5 Standee</button>` : '';

        // QR Code Handling for Guests
        let qrContainer = '';
        if (currentUser && currentUser.isGuest) {
            qrContainer = `<div class="detail-section glass-card" style="text-align: center; border: 1px dashed var(--accent-primary); background: rgba(139, 92, 246, 0.05);">
                <i class="fa-solid fa-qrcode" style="font-size: 2.5rem; color: var(--text-secondary); opacity: 0.5; margin-bottom: 1rem;"></i>
                <h3>Scan to Support</h3>
                <p style="font-size: 0.85rem; margin-bottom: 1.5rem; color: var(--text-secondary);">Join the network to check-in at this business and earn empathy badges.</p>
                <button class="btn btn-primary feature-gradient" style="border:none;" onclick="app.exitGuestMode()">
                    <i class="fa-solid fa-user-plus"></i> Create Free Account
                </button>
            </div>`;
        } else {
            qrContainer = `<div class="detail-section glass-card" style="text-align: center;">
                <h3>Scan at Counter</h3>
                <p style="font-size: 0.8rem; margin-bottom: 1rem;">Use the Scanner tab to scan this code.</p>
                <div id="qrcode-${biz.id}" style="display:inline-block; padding: 1rem; background: white; border-radius: var(--radius-md);"></div>
                <div>${downloadAction}</div>
            </div>`;
        }

            let scoreHTML = '';
            if (biz.type === 'affiliate') {
                scoreHTML = `<div style="margin-bottom: 1.5rem; display:flex; flex-direction:column; align-items:flex-start; gap:0.75rem; background: rgba(139, 92, 246, 0.1); padding: 1.25rem; border-radius: var(--radius-lg); border: 1px solid rgba(139, 92, 246, 0.2); width: 100%;">
                    <div style="display:flex; align-items:center; gap:0.5rem; color: #c4b5fd; font-weight: 700; font-size: 1.1rem;">
                        <i class="fa-solid fa-circle-info"></i> Affiliate Member
                    </div>
                    <div style="font-size:1rem; color:rgba(255,255,255,0.8); line-height: 1.5; font-style: italic;">
                        "Affiliates support our Purpose and have been visited by the team. They have yet to apply to become a full member and receive their score. Persuade them to join by giving them check-ins!"
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

            // Build YA Data display
            let yaHTML = '';
            const yaData = biz.yearlyAssessments || {};
            const yaYears = Object.keys(yaData).sort();
            if (yaYears.length > 0) {
                let yaRows = '';
                yaYears.forEach(year => {
                    const ya = yaData[year];
                    yaRows += `
                        <div style="background:rgba(255,255,255,0.05); padding:0.8rem; border-radius:var(--radius-sm); margin-bottom:0.5rem;">
                            <div style="font-weight:600; margin-bottom:0.5rem; color:var(--accent-primary);">
                                <i class="fa-solid fa-calendar"></i> ${year}
                            </div>
                            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:0.5rem;">
                                <div style="text-align:center;">
                                    <div style="font-size:1rem; font-weight:bold; color:var(--text-primary);">${ya.revenue ? 'RM ' + Number(ya.revenue).toLocaleString() : '-'}</div>
                                    <div style="font-size:0.7rem; color:var(--text-secondary);">Revenue</div>
                                </div>
                                <div style="text-align:center;">
                                    <div style="font-size:1rem; font-weight:bold; color:var(--accent-success);">${ya.wasteKg ? Number(ya.wasteKg).toLocaleString() + ' kg' : '-'}</div>
                                    <div style="font-size:0.7rem; color:var(--text-secondary);">Waste Diverted</div>
                                </div>
                                <div style="text-align:center;">
                                    <div style="font-size:1rem; font-weight:bold; color:#4CAF50;">${ya.treesPlanted ? Number(ya.treesPlanted).toLocaleString() : '-'}</div>
                                    <div style="font-size:0.7rem; color:var(--text-secondary);">Trees Planted</div>
                                </div>
                            </div>
                        </div>
                    `;
                });
                yaHTML = `
                    <div class="detail-section glass-card" style="background: linear-gradient(145deg, rgba(76, 175, 80, 0.1), rgba(0, 0, 0, 0.4));">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.8rem;">
                            <h3 style="margin:0;"><i class="fa-solid fa-chart-line"></i> Yearly Assessments</h3>
                            <span style="font-size:0.6rem; background:rgba(76,175,80,0.3); padding:0.2rem 0.5rem; border-radius:1rem; color:#81C784;">AUDITED</span>
                        </div>
                        ${yaRows}
                    </div>
                `;
            }

            // Expired banner
            const expiredBannerHTML = biz.status === 'expired' ? `
                <div class="biz-expired-banner">
                    <div class="expired-icon"><i class="fa-solid fa-ban"></i></div>
                    <h3 style="color:#F44336; margin-bottom:0.3rem;">This Business Has Expired</h3>
                    <p style="font-size:0.85rem; color:var(--text-secondary);">${biz.expiryReason || 'No reason provided'}</p>
                    ${biz.expiryDate ? `<p style="font-size:0.75rem; color:var(--text-secondary); margin-top:0.3rem;">Expiry Date: ${new Date(biz.expiryDate).toLocaleDateString('en-MY', {year:'numeric', month:'long', day:'numeric'})}</p>` : ''}
                </div>
            ` : '';

            container.innerHTML = `
                ${heroHTML}
                ${expiredBannerHTML}
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
            
            <!-- ISO53001 Impact Section -->
            ${(biz.impactStatement || biz.impactWaste || biz.impactJobs) ? `
                <div class="detail-section glass-card" style="background: linear-gradient(145deg, rgba(239, 108, 0, 0.1), rgba(0, 0, 0, 0.4));">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.8rem;">
                        <h3 style="margin:0;">ISO53001 Impact</h3>
                        <span style="font-size:0.6rem; background:rgba(255,255,255,0.2); padding:0.2rem 0.5rem; border-radius:1rem;">AUDITED</span>
                    </div>
                    <p style="font-size:0.9rem; font-style:italic;">"${biz.impactStatement || 'The social and environmental commitments of this business are currently under audit.'}"</p>
                    
                    <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                        ${biz.impactWaste ? `
                            <div style="flex:1; background:rgba(255,255,255,0.05); padding:0.6rem; border-radius:var(--radius-sm); text-align:center;">
                                <div style="font-size:1.1rem; font-weight:bold; color:var(--accent-success);">${biz.impactWaste}kg</div>
                                <div style="font-size:0.7rem; color:var(--text-secondary);">Waste Diverted</div>
                            </div>
                        ` : ''}
                        ${biz.impactJobs ? `
                            <div style="flex:1; background:rgba(255,255,255,0.05); padding:0.6rem; border-radius:var(--radius-sm); text-align:center;">
                                <div style="font-size:1.1rem; font-weight:bold; color:var(--accent-primary);">${biz.impactJobs}</div>
                                <div style="font-size:0.7rem; color:var(--text-secondary);">Ethical Jobs</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}

            ${yaHTML}

            ${qrContainer}

            ${this._renderAuditLogHTML(biz)}
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
        if (!currentUser) return;

        if (currentUser.isGuest) {
            document.getElementById('profile-name').innerText = 'Guest Explorer';
            document.getElementById('profile-email').innerText = 'Join to unlock perks';
            document.getElementById('profile-id').innerText = 'GUEST-MODE';
            
            const roleBadgesContainer = document.getElementById('profile-role-badges');
            if (roleBadgesContainer) {
                roleBadgesContainer.innerHTML = '<span style="background:rgba(255,255,255,0.1); color:var(--text-secondary); padding:0.2rem 0.6rem; border-radius:1rem; font-size:0.7rem; font-weight:600;"><i class="fa-solid fa-ghost"></i> Guest Explorer</span>';
            }

            // Hide portals
            if (document.getElementById('admin-portal-container')) document.getElementById('admin-portal-container').style.display = 'none';
            if (document.getElementById('business-portal-container')) document.getElementById('business-portal-container').style.display = 'none';
            
            // Special Guest CTA in Profile
            const footer = document.querySelector('#view-profile .badge-footer');
            if (footer && !document.getElementById('guest-join-cta')) {
                const cta = document.createElement('div');
                cta.id = 'guest-join-cta';
                cta.innerHTML = `
                    <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; text-align: left;">
                        <h4 style="color: var(--accent-primary); margin-bottom: 0.5rem;"><i class="fa-solid fa-circle-info"></i> Why Sign Up?</h4>
                        <ul style="font-size: 0.8rem; color: var(--text-secondary); padding-left: 1.2rem; line-height: 1.5;">
                            <li>Record your check-ins and purchases.</li>
                            <li>Unlock exclusive empathy badges.</li>
                            <li>Reach higher Tiers for premium rewards.</li>
                        </ul>
                        <button class="btn btn-primary btn-block mt-3 feature-gradient" style="border:none;" onclick="app.exitGuestMode()">
                            Create Free Account
                        </button>
                    </div>
                `;
                footer.prepend(cta);
            }
            return;
        }

        // --- Standard Member Logic ---
        // remove guest cta if it exists
        const guestCta = document.getElementById('guest-join-cta');
        if (guestCta) guestCta.remove();

        // Auto-link business to user if email matches ownerEmail
        if (currentUser.email) {
            const biz = businesses.find(b => b.ownerEmail && b.ownerEmail.toLowerCase() === currentUser.email.toLowerCase());
            currentUser.businessId = biz ? biz.id : null;
        }

        document.getElementById('profile-name').innerText = currentUser.name;
        document.getElementById('profile-email').innerHTML = currentUser.email ? (currentUser.email + (currentUser.isEmailVerified ? ` <i class="fa-solid fa-circle-check" style="color: var(--accent-success);" title="Verified"></i>` : '')) : '';
        document.getElementById('profile-id').innerText = currentUser.id;

        // Role badges
        const roleBadgesContainer = document.getElementById('profile-role-badges');
        if (roleBadgesContainer) {
            let badges = '';
            if (currentUser.isSuperAdmin) badges += '<span style="display:inline-flex; align-items:center; gap:0.3rem; background:linear-gradient(135deg, #FFD700, #FF8C00); color:#000; padding:0.2rem 0.6rem; border-radius:1rem; font-size:0.7rem; font-weight:700;"><i class="fa-solid fa-crown"></i> Super Admin</span> ';
            else if (currentUser.isAdmin) badges += '<span style="display:inline-flex; align-items:center; gap:0.3rem; background:var(--accent-primary); color:#fff; padding:0.2rem 0.6rem; border-radius:1rem; font-size:0.7rem; font-weight:600;"><i class="fa-solid fa-shield-halved"></i> Admin</span> ';
            if (currentUser.isAuditor && !currentUser.isSuperAdmin) badges += '<span style="display:inline-flex; align-items:center; gap:0.3rem; background:#4CAF50; color:#fff; padding:0.2rem 0.6rem; border-radius:1rem; font-size:0.7rem; font-weight:600;"><i class="fa-solid fa-clipboard-check"></i> Auditor</span> ';
            roleBadgesContainer.innerHTML = badges;
        }
        
        // Show admin portal button if isAdmin OR isSuperAdmin
        const adminPortal = document.getElementById('admin-portal-container');
        if (adminPortal) {
            adminPortal.style.display = currentUser.isAdmin ? 'block' : 'none';
        }

        // Show business portal if businessId exists
        const bizPortal = document.getElementById('business-portal-container');
        if (bizPortal) {
            bizPortal.style.display = currentUser.businessId ? 'block' : 'none';
        }
        
        // Update Impact Panel based on dynamic purchases
        this._calculatePersonalImpact();
    },

    async _calculatePersonalImpact() {
        if (!currentUser) return;
        
        let wasteDivertedAmount = 0;
        let treesPlantedAmount = 0;
        let familiesSupportedCount = 0;

        try {
            if (db) {
                const querySnapshot = await db.collection('transactions')
                    .where('userId', '==', currentUser.id)
                    .where('type', '==', 'purchase')
                    .get();

                const bizPurchases = {};

                querySnapshot.forEach(doc => {
                    const t = doc.data();
                    if (t.status === 'verified') {
                        if (!bizPurchases[t.bizId]) {
                            bizPurchases[t.bizId] = 0;
                        }
                        bizPurchases[t.bizId] += parseFloat(t.amount) || 0;
                    }
                });

                const uniqueBizIds = Object.keys(bizPurchases);
                
                uniqueBizIds.forEach(bizId => {
                    const biz = businesses.find(b => b.id === bizId);
                    if (biz && biz.status !== 'expired') {
                        // 1 employee / job = 1 family supported. Counted once per unique business purchased from.
                        const impactJobs = parseInt(biz.impactJobs) || 0;
                        familiesSupportedCount += impactJobs;

                        // Identify latest revenue and relevant impact metrics
                        let latestRev = 0;
                        let latestWaste = 0;
                        let latestTrees = 0;
                        
                        if (biz.yearlyAssessments) {
                            Object.values(biz.yearlyAssessments).forEach(ya => {
                                if (ya.revenue) {
                                    const revStr = ya.revenue.toString().replace(/,/g, '');
                                    const rev = Number(revStr);
                                    if (!isNaN(rev) && rev > latestRev) {
                                        latestRev = rev;
                                        latestWaste = Number(ya.wasteKg?.toString().replace(/,/g, '')) || 0;
                                        latestTrees = Number(ya.treesPlanted?.toString().replace(/,/g, '')) || 0;
                                    }
                                }
                            });
                        }

                        if (latestRev > 0) {
                            const proportion = bizPurchases[bizId] / latestRev;
                            wasteDivertedAmount += (proportion * latestWaste);
                            treesPlantedAmount += (proportion * latestTrees);
                        }
                    }
                });
            }

            // Update UI
            const elWaste = document.getElementById('impact-waste-diverted');
            const elTrees = document.getElementById('impact-trees-planted');
            const elFamilies = document.getElementById('impact-families-supported');

            if (elWaste) {
                elWaste.innerText = wasteDivertedAmount % 1 !== 0 ? wasteDivertedAmount.toFixed(2) : wasteDivertedAmount;
            }
            if (elTrees) elTrees.innerText = Math.round(treesPlantedAmount);
            if (elFamilies) elFamilies.innerText = familiesSupportedCount.toLocaleString();

        } catch (e) {
            console.error("Error calculating personal impact:", e);
        }
    },


    // --- Role Management (Super Admin only) ---
    async _syncRolesToCloud() {
        if (db) {
            await db.collection('system').doc('roles').set({
                adminEmails: adminEmails,
                auditorEmails: auditorEmails
            }, { merge: true });
        }
    },

    async addRole(role) {
        if (!currentUser.isSuperAdmin) {
            this.showToast('Access Denied: Only the Super Admin can manage roles.', true);
            return;
        }
        const inputId = role === 'admin' ? 'admin-new-email' : 'auditor-new-email';
        const email = document.getElementById(inputId).value.trim();
        if (!email) {
            this.showToast("Please enter an email address.");
            return;
        }
        const list = role === 'admin' ? adminEmails : auditorEmails;
        const label = role === 'admin' ? 'Admin' : 'Auditor';
        if (list.includes(email)) {
            this.showToast(`This email is already an ${label}.`);
            return;
        }
        list.push(email);
        await this._syncRolesToCloud();
        document.getElementById(inputId).value = '';
        this.renderAdminList();
        this.showToast(`${email} has been added as ${label}.`);
    },

    // Keep legacy wrappers for backward compat
    async addAdmin() { return this.addRole('admin'); },
    async addAuditor() { return this.addRole('auditor'); },

    async removeRole(email, role) {
        if (!currentUser.isSuperAdmin) {
            this.showToast('Access Denied: Only the Super Admin can manage roles.', true);
            return;
        }
        if (email === SUPER_ADMIN_EMAIL) {
            this.showToast('Access Denied: The Super Admin cannot be removed from any role.', true);
            return;
        }
        const list = role === 'admin' ? adminEmails : auditorEmails;
        const label = role === 'admin' ? 'Admin' : 'Auditor';
        const index = list.indexOf(email);
        if (index > -1) {
            list.splice(index, 1);
            await this._syncRolesToCloud();
            this.renderAdminList();
            this.showToast(`${email} removed from ${label}s.`);
        }
    },

    // Legacy compat
    async removeAdmin(email) { return this.removeRole(email, 'admin'); },

    renderAdminList() {
        this.renderAdminBusinessList();
        const isSuperAdmin = currentUser && currentUser.isSuperAdmin;

        // --- Admin list ---
        const container = document.getElementById('admin-list-container');
        if (!container) return;
        container.innerHTML = '';
        adminEmails.forEach(email => {
            const isSA = email === SUPER_ADMIN_EMAIL;
            container.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; background: rgba(255,255,255,0.05); padding: 0.5rem 1rem; border-radius: var(--radius-sm);">
                    <div style="display:flex; align-items:center; gap:0.5rem; word-break: break-all;">
                        <i class="fa-solid ${isSA ? 'fa-crown text-gradient' : 'fa-user-shield'}" style="color:var(--accent-primary)"></i> ${email}
                    </div>
                    ${isSA ? '<span style="font-size:0.8rem; color:var(--text-secondary)">Super Admin</span>' : (isSuperAdmin ? `<button class="icon-btn" style="color:var(--text-warning); padding:0.4rem; height:auto; width:auto;" onclick="app.removeRole('${email}','admin')"><i class="fa-solid fa-trash"></i></button>` : '')}
                </div>
            `;
        });

        // --- Auditor list ---
        const auditorContainer = document.getElementById('auditor-list-container');
        if (!auditorContainer) return;
        auditorContainer.innerHTML = '';
        auditorEmails.forEach(email => {
            const isSA = email === SUPER_ADMIN_EMAIL;
            auditorContainer.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; background: rgba(255,255,255,0.05); padding: 0.5rem 1rem; border-radius: var(--radius-sm);">
                    <div style="display:flex; align-items:center; gap:0.5rem; word-break: break-all;">
                        <i class="fa-solid ${isSA ? 'fa-crown text-gradient' : 'fa-clipboard-check'}" style="color:#4CAF50"></i> ${email}
                    </div>
                    ${isSA ? '<span style="font-size:0.8rem; color:var(--text-secondary)">Super Admin</span>' : (isSuperAdmin ? `<button class="icon-btn" style="color:var(--text-warning); padding:0.4rem; height:auto; width:auto;" onclick="app.removeRole('${email}','auditor')"><i class="fa-solid fa-trash"></i></button>` : '')}
                </div>
            `;
        });

        // Show/hide role management controls based on Super Admin status
        const roleManageControls = document.querySelectorAll('.superadmin-only');
        roleManageControls.forEach(el => {
            el.style.display = isSuperAdmin ? '' : 'none';
        });

                // Show/hide auditor-gated sections based on role
        const isAuditor = currentUser && (currentUser.isAuditor || currentUser.isSuperAdmin);
        
        const adminYASection = document.getElementById('admin-ya-section');
        const scoreSection = document.getElementById('score-section');
        const typeGroup = document.getElementById('admin-biz-type-group');

        if (adminYASection) adminYASection.style.display = isAuditor ? 'block' : 'none';
        if (scoreSection) scoreSection.style.display = isAuditor ? 'block' : 'none';
        if (typeGroup) typeGroup.style.display = isAuditor ? 'block' : 'none';
        
        this.renderAdminInitiatives();
        _checkRenewals();
    },

    _checkRenewals() {
        if (!currentUser) return;
        const alertContainer = document.getElementById('admin-renewal-alert');
        if (alertContainer) alertContainer.remove();

        const now = new Date();
        const sixMonthsAhead = new Date();
        sixMonthsAhead.setMonth(now.getMonth() + 6);

        const dueForRenewal = businesses.filter(biz => {
            if (biz.status === 'expired') return false;
            if (!biz.validUntil) {
                const legacyDate = new Date();
                legacyDate.setFullYear(now.getFullYear() + 1);
                biz.validUntil = legacyDate.toISOString();
            }
            const validUntilDate = new Date(biz.validUntil);
            return validUntilDate <= sixMonthsAhead && validUntilDate > now;
        });

        const actionableRenewals = dueForRenewal.filter(biz => {
            if (currentUser.isSuperAdmin) return true;
            return biz.createdBy === currentUser.email;
        });

        if (actionableRenewals.length > 0) {
            let listHTML = actionableRenewals.map(b => `<li><strong>${b.name}</strong> - valid until ${new Date(b.validUntil).toLocaleDateString()}</li>`).join('');
            const alertDiv = document.createElement('div');
            alertDiv.id = 'admin-renewal-alert';
            alertDiv.className = 'glass-card';
            alertDiv.style.borderLeft = '4px solid var(--text-warning)';
            alertDiv.style.marginBottom = '1.5rem';
            alertDiv.innerHTML = `
                <div style="display:flex; align-items:center; gap: 0.5rem; color: var(--text-warning); margin-bottom:0.5rem;">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <strong style="font-size:1.1rem;">Renewals Due</strong>
                </div>
                <p style="font-size: 0.85rem; margin-bottom: 0.8rem;">The following businesses are approaching their membership expiry within the next 6 months:</p>
                <ul style="font-size: 0.85rem; padding-left: 1.5rem; margin-bottom: 0;">
                    ${listHTML}
                </ul>
            `;
            const header = document.querySelector('#view-admin .page-header');
            if (header && header.nextSibling) {
                header.parentNode.insertBefore(alertDiv, header.nextSibling);
            }
        }
    },

    // --- Settings & Demographics Logic ---
    openSettings() {
        document.getElementById('settings-nickname').value = currentUser.name || '';
        document.getElementById('settings-email').value = currentUser.email || '';
        document.getElementById('settings-gender').value = currentUser.gender || '';
        document.getElementById('settings-city').value = currentUser.city || '';
        document.getElementById('settings-dob').value = currentUser.dob || '';

        // Reset checkboxes
        document.querySelectorAll('#settings-causes input[type="checkbox"]').forEach(cb => {
            cb.checked = currentUser.causes && currentUser.causes.includes(cb.value);
        });

        this.renderEmailVerificationStatus();
        this.navigate('settings');
    },

    saveSettings() {
        if (currentUser && currentUser.isGuest) {
            this.openGuestGate();
            return;
        }
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

        if (currentUser.email !== email) {
            currentUser.isEmailVerified = false; // reset verification if email changes
        }

        currentUser.name = nickname;
        currentUser.email = email;
        currentUser.gender = gender;
        currentUser.city = city;
        currentUser.dob = dob;
        currentUser.causes = causes;

        this.saveData();
        this.populateProfile();
        this.updateNewsreel();
        this.showToast('Profile updated successfully!');
        this.navigate('profile');
    },

    renderEmailVerificationStatus() {
        const verifyBtn = document.getElementById('btn-verify-email');
        const badge = document.getElementById('badge-verified');
        
        if (currentUser.isEmailVerified) {
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
        const randomBiz = businesses[Math.floor(Math.random() * businesses.length)];
        this.handleScanResult(randomBiz.id);
    },

    handleScanResult(bizId) {
        const biz = businesses.find(b => b.id === bizId);
        if (biz) {
            this.scannedBusiness = biz;
            document.getElementById('modal-business-name').innerText = this.scannedBusiness.name;
            document.getElementById('purchase-form').classList.add('hidden');
            document.getElementById('modal-default-content').classList.remove('hidden');
            document.getElementById('modal-success-content').classList.add('hidden');
            document.getElementById('action-modal').classList.remove('hidden');

            // Restriction: Only full members can have purchases tracked
            const btnLogPurchase = document.getElementById('btn-log-purchase');
            if (btnLogPurchase) {
                btnLogPurchase.style.display = biz.type === 'affiliate' ? 'none' : 'flex';
            }
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
        if (currentUser && currentUser.isGuest) {
            this.closeModal();
            this.openGuestGate();
            return;
        }
        // Update stats
        networkStats.checkins++;
        currentUser.checkins++;

        if (this.scannedBusiness) {
            if (!currentUser.activityLog) currentUser.activityLog = [];
            currentUser.activityLog.push({
                timestamp: new Date().toISOString(),
                bizId: this.scannedBusiness.id,
                type: 'checkin',
                location: this.scannedBusiness.location || ''
            });

            if (!currentUser.visitedBizIds) currentUser.visitedBizIds = [];
            if (!currentUser.visitedBizIds.includes(this.scannedBusiness.id)) {
                currentUser.visitedBizIds.push(this.scannedBusiness.id);
            }

            this.scannedBusiness.checkinsCount = (this.scannedBusiness.checkinsCount || 0) + 1;
            if (db) {
                try {
                    await db.collection('transactions').add({
                        type: 'checkin',
                        bizId: this.scannedBusiness.id,
                        userId: currentUser.id,
                        userNickname: currentUser.name,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    await db.collection('businesses').doc(this.scannedBusiness.id).set({ checkinsCount: this.scannedBusiness.checkinsCount }, {merge:true});
                } catch(e) { console.warn("Checkin Log failed", e); }
            }
        }

        this.saveData();
        this.renderStats();
        this.evaluateBadges(currentUser);
        
        this.showSuccessModal(`Successfully checked in! Thank you for being part of the empathy economy!`);
    },

    showPurchaseForm() {
        document.getElementById('purchase-form').classList.remove('hidden');
    },

    async submitPurchase() {
        if (currentUser && currentUser.isGuest) {
            this.closeModal();
            this.openGuestGate();
            return;
        }
        const receipt = document.getElementById('receipt-input').value.trim();
        const amount = document.getElementById('amount-input').value.trim();
        
        if(!receipt || !amount) {
            this.showToast('Please enter both receipt number and amount.');
            return;
        }

        if (this.scannedBusiness && this.scannedBusiness.type === 'affiliate') {
            this.showToast('Purchases can only be recorded for full members. Please encourage them to apply!');
            return;
        }

        if (this.scannedBusiness) {
            if (db && firebaseConfig.apiKey !== "YOUR_API_KEY") {
                try {
                    await db.collection('transactions').add({
                        type: 'purchase',
                        bizId: this.scannedBusiness.id,
                        userId: currentUser.id,
                        userNickname: currentUser.name,
                        receipt: receipt,
                        amount: parseFloat(amount),
                        status: 'pending',
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } catch(e) { console.warn("Purchase Log failed", e); }
            }
        }

        document.getElementById('receipt-input').value = '';
        document.getElementById('amount-input').value = '';
        
        // Update local purchase count (server reconciliation handles final verification)
        currentUser.purchases++;
        if (!currentUser.activityLog) currentUser.activityLog = [];
        currentUser.activityLog.push({
            timestamp: new Date().toISOString(),
            bizId: this.scannedBusiness ? this.scannedBusiness.id : 'unknown',
            type: 'purchase',
            location: this.scannedBusiness ? (this.scannedBusiness.location || '') : ''
        });
        networkStats.purchases++;
        this.saveData();
        this.renderStats();
        this.evaluateBadges(currentUser);

        this.showSuccessModal(`Purchase logged! Thank you for being part of the empathy economy!`);
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
            user: currentUser,
            stats: networkStats,
            businesses: businesses
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        const anchor = document.createElement('a');
        anchor.setAttribute("href", dataStr);
        anchor.setAttribute("download", "bfg_conviction_network_backup.json");
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
                    currentUser = data.user;
                    networkStats = data.stats;
                    businesses = data.businesses;
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
        
        let filteredBiz = businesses;
        if (searchTerm) {
            filteredBiz = businesses.filter(b => 
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
            const isExpired = biz.status === 'expired';
            const statusBadge = isExpired ? `<span style="font-size:0.65rem; background:rgba(244,67,54,0.3); color:#F44336; padding:0.1rem 0.4rem; border-radius:1rem; margin-left:0.3rem;">⛔ Expired</span>` : '';
            html += `<div style="display:flex; justify-content:space-between; align-items:center; background: rgba(255,255,255,0.05); padding: 0.5rem 1rem; border-radius: var(--radius-sm); border: 1px solid ${isExpired ? 'rgba(244,67,54,0.2)' : 'rgba(255,255,255,0.1)'}; ${isExpired ? 'opacity:0.7;' : ''}">
                <div>
                    <strong>${biz.name}</strong>${statusBadge} <span style="font-size:0.8rem; color:var(--text-secondary);">- ${biz.founder} ${biz.type==='affiliate' ? '<span style="color:var(--text-warning);">(Affiliate)</span>' : ''}</span>
                </div>
                <button class="btn btn-secondary" style="padding: 0.3rem 0.8rem; font-size: 0.85rem;" onclick="app.loadAdminBizToEdit('${biz.id}')"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
            </div>`;
        });
        container.innerHTML = html;
    },

    // --- Audit Log Helper ---
    _addAuditEntry(bizIndex, action, details) {
        if (bizIndex < 0 || bizIndex >= businesses.length) return;
        if (!businesses[bizIndex].auditLog) businesses[bizIndex].auditLog = [];
        businesses[bizIndex].auditLog.push({
            timestamp: new Date().toISOString(),
            action: action,
            details: details || '',
            user: currentUser ? currentUser.email : 'system',
            userNickname: currentUser ? (currentUser.name || 'Admin') : 'System'
        });
    },

    _renderAuditLogHTML(biz) {
        if (!biz.auditLog || biz.auditLog.length === 0) return '';
        let logRows = '';
        const sortedLog = [...biz.auditLog].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        sortedLog.forEach(entry => {
            const date = new Date(entry.timestamp).toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            logRows += `
                <div style="padding: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 0.8rem;">
                    <div style="display:flex; justify-content:space-between; margin-bottom: 0.2rem;">
                        <strong style="color:var(--accent-primary)">${entry.action}</strong>
                        <span style="color:var(--text-secondary)">${date}</span>
                    </div>
                    <div>${entry.details}</div>
                    <div style="color:var(--text-secondary); font-size:0.7rem; margin-top:0.2rem;">By: ${entry.userNickname || entry.user}</div>
                </div>
            `;
        });
        return `
            <div class="detail-section glass-card" style="margin-top: 1rem;">
                <h3 style="margin-bottom:0.8rem"><i class="fa-solid fa-list-check"></i> Audit Log</h3>
                <div style="max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.2); border-radius: var(--radius-sm);">
                    ${logRows}
                </div>
            </div>
        `;
    },

    downloadQRStandee(bizId) {
        const biz = businesses.find(b => b.id === bizId);
        if(!biz) return;
        
        if (typeof QRCode === 'undefined') {
            alert('QR generation library not loaded.');
            return;
        }

        const tempDiv = document.createElement('div');
        new QRCode(tempDiv, {
            text: biz.id,
            width: 500,
            height: 500,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });

        setTimeout(() => {
            const qrCanvas = tempDiv.querySelector('canvas');
            if(!qrCanvas) return;

            const continueDraw = (leftLogoImg = null) => {
                const cWidth = 1118;
                const cHeight = 1588;
                const canvas = document.createElement('canvas');
                canvas.width = cWidth;
                canvas.height = cHeight;
                const ctx = canvas.getContext('2d');

                // Adjust to the deep blue tone of the reference BFG logo
                ctx.fillStyle = '#011536';
                ctx.fillRect(0, 0, cWidth, cHeight);

                // Top Left: Business Logo
                if (leftLogoImg) {
                    try {
                        ctx.drawImage(leftLogoImg, 60, 60, 100, 100);
                    } catch(e) { }
                } else {
                    ctx.beginPath();
                    ctx.arc(110, 110, 50, 0, 2 * Math.PI);
                    ctx.fillStyle = '#ffffff';
                    ctx.fill();
                    ctx.fillStyle = '#011536';
                    ctx.font = 'bold 50px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(biz.name.charAt(0).toUpperCase(), 110, 110);
                }

                // Top Right: thebfg.team Logo implementation
                const rightX = cWidth - 60;
                const rightY = 110;
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                
                ctx.fillStyle = '#ffcc00';
                ctx.font = 'bold 60px "Font Awesome 6 Free", sans-serif';
                ctx.fillText('\uf0ac', rightX, rightY);
                
                ctx.textBaseline = 'alphabetic';
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 45px sans-serif';
                ctx.fillText('theBFG.team', rightX - 70, rightY - 5);
                ctx.font = 'bold 28px sans-serif';
                ctx.fillStyle = '#ffcc00';
                ctx.fillText('Conviction Network', rightX - 70, rightY + 30);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 85px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Support', cWidth / 2, 330);
                ctx.fillText('For-Good Businesses', cWidth / 2, 450);

                const cardSize = 600;
                const cardX = (cWidth - cardSize) / 2;
                const cardY = 530;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(cardX, cardY, cardSize, cardSize, 30);
                } else {
                    ctx.rect(cardX, cardY, cardSize, cardSize);
                }
                ctx.fill();

                const qrPadding = 30;
                const qrDrawSize = cardSize - (qrPadding*2);
                ctx.drawImage(qrCanvas, cardX + qrPadding, cardY + qrPadding, qrDrawSize, qrDrawSize);

                const iconY = 1250;
                ctx.beginPath();
                ctx.arc(cWidth / 2, iconY, 60, 0, 2 * Math.PI);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.fillStyle = '#011536';
                ctx.font = 'bold 60px "Font Awesome 6 Free", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('\uf118', cWidth/2, iconY);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 70px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'alphabetic';
                ctx.fillText(biz.name.toUpperCase(), cWidth / 2, 1420);

                const dataUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `QR_Standee_${biz.name.replace(/\s+/g,'_')}.png`;
                link.href = dataUrl;
                link.click();
            };

            const logoSrc = biz.shopfrontImg || biz.founderImg;
            if (logoSrc) {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => continueDraw(img);
                img.onerror = () => continueDraw(null);
                img.src = logoSrc;
            } else {
                continueDraw(null);
            }
        }, 300);
    },

    // --- Yearly Assessment (YA) Helper Functions ---
    _renderYARow(containerId, year = 'YA2025', revenue = '', wasteKg = '', treesPlanted = '') {
        const container = document.getElementById(containerId);
        if (!container) return;
        const rowId = 'ya-row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        const row = document.createElement('div');
        row.id = rowId;
        row.style.cssText = 'background:rgba(255,255,255,0.05); padding:0.8rem; border-radius:var(--radius-sm); border:1px solid rgba(255,255,255,0.1);';
        row.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                <input type="text" class="input-modern ya-year" value="${year}" placeholder="e.g. YA2025" style="width:120px; padding:0.3rem 0.5rem; font-weight:600;">
                <button type="button" class="btn btn-secondary" style="padding:0.2rem 0.5rem; font-size:0.75rem; color:var(--text-warning); border-color:var(--text-warning);" onclick="document.getElementById('${rowId}').remove()">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:0.5rem;">
                <div>
                    <label style="font-size:0.7rem; color:var(--text-secondary);">Revenue (RM)</label>
                    <input type="number" class="input-modern ya-revenue" value="${revenue}" placeholder="0" style="padding:0.3rem 0.5rem;">
                </div>
                <div>
                    <label style="font-size:0.7rem; color:var(--text-secondary);">Waste Diverted (kg)</label>
                    <input type="number" class="input-modern ya-waste" value="${wasteKg}" placeholder="0" style="padding:0.3rem 0.5rem;">
                </div>
                <div>
                    <label style="font-size:0.7rem; color:var(--text-secondary);">Trees Planted</label>
                    <input type="number" class="input-modern ya-trees" value="${treesPlanted}" placeholder="0" style="padding:0.3rem 0.5rem;">
                </div>
            </div>
        `;
        container.appendChild(row);
    },

    _collectYAData(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return {};
        const data = {};
        const rows = container.children;
        for (let i = 0; i < rows.length; i++) {
            const yearInput = rows[i].querySelector('.ya-year');
            const revenueInput = rows[i].querySelector('.ya-revenue');
            const wasteInput = rows[i].querySelector('.ya-waste');
            const treesInput = rows[i].querySelector('.ya-trees');
            if (yearInput && yearInput.value.trim()) {
                const yearKey = yearInput.value.trim();
                data[yearKey] = {
                    revenue: revenueInput ? revenueInput.value.trim() : '',
                    wasteKg: wasteInput ? wasteInput.value.trim() : '',
                    treesPlanted: treesInput ? treesInput.value.trim() : ''
                };
            }
        }
        return data;
    },

    _populateYARows(containerId, yaData) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        if (yaData && typeof yaData === 'object') {
            const years = Object.keys(yaData).sort();
            years.forEach(year => {
                const ya = yaData[year];
                this._renderYARow(containerId, year, ya.revenue || '', ya.wasteKg || '', ya.treesPlanted || '');
            });
        }
    },

    addAdminYARow() {
        const currentYear = new Date().getFullYear();
        this._renderYARow('admin-ya-rows', `YA${currentYear}`);
    },

    addEditYARow() {
        const currentYear = new Date().getFullYear();
        this._renderYARow('edit-ya-rows', `YA${currentYear}`);
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
            }

            // Clear YA rows
            const yaContainer = document.getElementById('admin-ya-rows');
            if (yaContainer) yaContainer.innerHTML = '';

            // Hide expiry section for new businesses
            const expirySection = document.getElementById('admin-expiry-section');
            if (expirySection) expirySection.style.display = 'none';
        } else {
            const biz = businesses.find(b => b.id === bizId);
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
            }
            
            if (biz.score && biz.type !== 'affiliate') {
                document.getElementById('score-shareholder').value = biz.score.s || 'C';
                document.getElementById('score-employee').value = biz.score.e || 'C';
                document.getElementById('score-customer').value = biz.score.c || 'C';
                document.getElementById('score-society').value = biz.score.soc || 'C';
                document.getElementById('score-env').value = biz.score.env || 'C';
            }

            // Populate YA rows
            this._populateYARows('admin-ya-rows', biz.yearlyAssessments);

            // Populate expiry fields (show in edit mode)
            const expirySection = document.getElementById('admin-expiry-section');
            if (expirySection) expirySection.style.display = 'block';
            const statusSelect = document.getElementById('admin-biz-status');
            if (statusSelect) {
                statusSelect.value = biz.status || 'active';
                document.getElementById('admin-expiry-fields').style.display = biz.status === 'expired' ? 'block' : 'none';
                document.getElementById('admin-expiry-reason-container').style.display = biz.status === 'expired' ? 'block' : 'none';
            }
            const expiryDateInput = document.getElementById('admin-biz-expiry-date');
            if (expiryDateInput) expiryDateInput.value = biz.expiryDate || '';
            const expiryReasonSelect = document.getElementById('admin-biz-expiry-reason');
            if (expiryReasonSelect) expiryReasonSelect.value = biz.expiryReason || '';
        }

        // Refresh auditor-gated sections
        this.renderAdminList();
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
        if (bizType !== 'affiliate' && (currentUser.isAuditor || currentUser.isSuperAdmin)) {
            score = {
                s: document.getElementById('score-shareholder').value,
                e: document.getElementById('score-employee').value,
                c: document.getElementById('score-customer').value,
                soc: document.getElementById('score-society').value,
                env: document.getElementById('score-env').value
            };
        } else if (bizType !== 'affiliate') {
            // Preserve existing score if not auditor
            const existingBiz = this.adminEditingBizId ? businesses.find(b => b.id === this.adminEditingBizId) : null;
            score = existingBiz ? existingBiz.score : null;
        }

        if (!name || !founder || !story || !location || !contact) {
            this.showToast("Please fill in basic business details.");
            return;
        }

        document.getElementById('btn-add-biz').style.display = 'none';
        document.getElementById('admin-loading').classList.remove('hidden');

        const shopfrontImg = document.getElementById('admin-biz-shopfront').value.trim();
        const founderImg = document.getElementById('admin-biz-founder-img').value.trim();

        // Collect YA data from admin form (Auditor-gated)
        const yearlyAssessments = (currentUser.isAuditor || currentUser.isSuperAdmin) ? this._collectYAData('admin-ya-rows') : undefined;

        if (this.adminEditingBizId) {
            // Update mode
            const bizIndex = businesses.findIndex(b => b.id === this.adminEditingBizId);
            if(bizIndex !== -1) {
                const oldBiz = { ...businesses[bizIndex] };

                // Collect expiry data
                const statusSelect = document.getElementById('admin-biz-status');
                const newStatus = statusSelect ? statusSelect.value : (oldBiz.status || 'active');
                const expiryDate = document.getElementById('admin-biz-expiry-date')?.value || '';
                const expiryReason = document.getElementById('admin-biz-expiry-reason')?.value || '';

                businesses[bizIndex] = {
                    ...businesses[bizIndex],
                    name, founder, ownerEmail, story, location, contact, website, type: bizType, score, shopfrontImg, founderImg,
                    ...(yearlyAssessments !== undefined ? { yearlyAssessments } : {}),
                    status: newStatus,
                    ...(newStatus === 'expired' ? { expiryDate, expiryReason } : { expiryDate: '', expiryReason: '' })
                };

                                // Audit & Gating (v0.95)
                const isAuditor = currentUser && (currentUser.isAuditor || currentUser.isSuperAdmin);
                
                if (!isAuditor) {
                    // Force revert sensitive fields if an Admin somehow sent them
                    businesses[bizIndex].score = oldBiz.score;
                    businesses[bizIndex].yearlyAssessments = oldBiz.yearlyAssessments;
                    businesses[bizIndex].type = oldBiz.type; // Block upgrade to 'full'
                } else {
                    // Auditor is editing: Detect sensitive changes for hierarchical audit logs
                    if (JSON.stringify(oldBiz.score) !== JSON.stringify(businesses[bizIndex].score)) {
                        this.createAuditEntry(this.adminEditingBizId, 'SCORE_CHANGE', 'Score updated:', 'Updated paradigm scoring for transparency alignment.');
                    }
                    if (oldBiz.type !== businesses[bizIndex].type && businesses[bizIndex].type === 'full') {
                        this.createAuditEntry(this.adminEditingBizId, 'STATUS_UPGRADE', 'Transitioned from Affiliated to Full Member', 'Business successfully completed manual audit and verification process.');
                    }
                    if (JSON.stringify(oldBiz.yearlyAssessments) !== JSON.stringify(businesses[bizIndex].yearlyAssessments)) {
                        this.createAuditEntry(this.adminEditingBizId, 'YA_UPDATE', 'Impact (YA) Data updated', 'Verified yearly assessment figures for for-good impact quantification.');
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

        const activeDate = new Date();
        const validUntilDate = new Date(activeDate);
        validUntilDate.setFullYear(validUntilDate.getFullYear() + 1);

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
            yearlyAssessments: yearlyAssessments || {},
            status: 'active',
            auditLog: [],
            checkinsCount: 0,
            purchasesCount: 0,
            createdAt: activeDate.toISOString(),
            validUntil: validUntilDate.toISOString(),
            createdBy: currentUser.email
        };

        // Update local state
        businesses.push(newBiz);
        const newBizIndex = businesses.length - 1;
        this._addAuditEntry(newBizIndex, 'Created', `Business created by ${currentUser.email}`);
        networkStats.businesses++;
        
        try {
            this.saveData();
        } catch (e) {
            // Local storage quota exceeded
            this.showToast("Error saving business. Images may be too large. Try smaller files.");
            businesses.pop();
            networkStats.businesses--;
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
        }

        this.renderAdminBusinessList();
        this.showToast(`Successfully added ${name}!`);
        
        document.getElementById('btn-add-biz').style.display = 'block';
        document.getElementById('admin-loading').classList.add('hidden');
        
        this.navigate('directory');
    },

    // --- Business Portal Logic ---
    async openBusinessDashboard() {
        if (!currentUser.businessId) return;
        const biz = businesses.find(b => b.id === currentUser.businessId);
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
                                    RM ${parseFloat(t.amount).toFixed(2)}
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
        if (!currentUser.businessId) return;
        const biz = businesses.find(b => b.id === currentUser.businessId);
        if (!biz) return;

        document.getElementById('edit-biz-name').value = biz.name || '';
        document.getElementById('edit-biz-founder').value = biz.founder || '';
        document.getElementById('edit-biz-story').value = biz.story || '';
        document.getElementById('edit-biz-contact').value = biz.contact || '';
        document.getElementById('edit-biz-website').value = biz.website || '';
        document.getElementById('edit-biz-location').value = biz.location || '';
        document.getElementById('edit-biz-shopfront').value = biz.shopfrontImg || '';
        document.getElementById('edit-biz-video').value = biz.videoUrl || '';
        
        // ISO53001 Impact Metrics
        document.getElementById('edit-biz-impact').value = biz.impactStatement || '';
        document.getElementById('edit-biz-impact-waste').value = biz.impactWaste || '';
        document.getElementById('edit-biz-impact-jobs').value = biz.impactJobs || '';
        
        // Populate YA rows in business portal edit (Auditor-gated)
        const editYASection = document.getElementById('edit-ya-section');
        const isAuditor = currentUser && (currentUser.isAuditor || currentUser.isSuperAdmin);
        if (editYASection) {
            editYASection.style.display = isAuditor ? 'block' : 'none';
        }
        if (isAuditor) {
            this._populateYARows('edit-ya-rows', biz.yearlyAssessments);
        }
        
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
                .where('bizId', '==', currentUser.businessId)
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
                                <strong>${t.userNickname}</strong> - RM ${t.amount.toFixed(2)}<br>
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
            
            // Update business purchase count
            const biz = businesses.find(b => b.id === currentUser.businessId);
            if (biz) {
                biz.purchasesCount = (biz.purchasesCount || 0) + addedPurchases;
                await db.collection('businesses').doc(biz.id).set({ purchasesCount: biz.purchasesCount }, {merge:true});
            }
            
            // Update global network stats (server-side Cloud Functions handle per-user attribution)
            networkStats.purchases += addedPurchases;
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
        if (!currentUser.businessId) return;
        const bizIndex = businesses.findIndex(b => b.id === currentUser.businessId);
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
            let shopfrontUrl = businesses[bizIndex].shopfrontImg;
            let videoUrl = videoInputVal;

            // Handle Photo URL
            const editShopUrl = document.getElementById('edit-biz-shopfront').value.trim();
            if(editShopUrl) shopfrontUrl = editShopUrl;

            const location = document.getElementById('edit-biz-location').value.trim();
            videoUrl = videoInputVal;
            const impactStatement = document.getElementById('edit-biz-impact').value.trim();
            const impactWaste = document.getElementById('edit-biz-impact-waste').value.trim();
            const impactJobs = document.getElementById('edit-biz-impact-jobs').value.trim();

            businesses[bizIndex].name = name;
            businesses[bizIndex].founder = founder;
            businesses[bizIndex].story = story;
            businesses[bizIndex].contact = contact;
            businesses[bizIndex].website = website;
            businesses[bizIndex].location = location;
            businesses[bizIndex].shopfrontImg = shopfrontUrl;
            businesses[bizIndex].videoUrl = videoUrl;
            businesses[bizIndex].impactStatement = impactStatement;
            businesses[bizIndex].impactWaste = impactWaste;
            businesses[bizIndex].impactJobs = impactJobs;

            // Collect YA data from business portal edit (Auditor-gated)
            if (currentUser.isAuditor || currentUser.isSuperAdmin) {
                businesses[bizIndex].yearlyAssessments = this._collectYAData('edit-ya-rows');
            }

            if (db) {
                await db.collection('businesses').doc(currentUser.businessId).set(businesses[bizIndex], {merge:true});
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
                    .where('userId', '==', currentUser.id)
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
                        const biz = businesses.find(b => b.id === t.bizId) || { name: 'Unknown Business' };
                        const dt = t.timestamp ? t.timestamp.toDate().toLocaleString() : 'Just now';
                        
                        let extraInfo = '';
                        let valueBlock = '';

                        if (type === 'purchase') {
                            const status = t.status || 'verified';
                            const statusColor = status === 'pending' ? 'var(--text-warning)' : 'var(--accent-success)';
                            const statusIcon = status === 'pending' ? '<i class="fa-solid fa-clock"></i> Pending ' : '<i class="fa-solid fa-check"></i> Verified ';
                            
                            extraInfo = `<small style="color:${statusColor}">${statusIcon} &bull; </small><small style="color:var(--text-secondary)">Receipt: ${t.receipt} &bull; ${dt}</small>`;
                            valueBlock = `<div style="color:${statusColor}; font-weight:bold;">RM ${parseFloat(t.amount).toFixed(2)}</div>`;
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
            list.innerHTML = `<p style="color: var(--text-warning); padding:1rem; text-align:center;">Cloud connection required to view transaction history.</p>`;
        }
    },

    // --- Super Admin Spreadsheet ---
    sheetSortCol: null,
    sheetSortDir: 'asc',

    openSpreadsheet() {
        if (!currentUser || !currentUser.isSuperAdmin) {
            this.showToast('Access Denied: Super Admin only.', true);
            return;
        }
        this.sheetSortCol = null;
        this.sheetSortDir = 'asc';
        this.navigate('spreadsheet');
        this.renderSpreadsheet();
    },

    _getVisibleCols() {
        const toggles = document.querySelectorAll('.sheet-col-toggle input');
        const cols = {};
        toggles.forEach(t => cols[t.value] = t.checked);
        return cols;
    },

    _getAllYAYears() {
        const years = new Set();
        businesses.forEach(biz => {
            const ya = biz.yearlyAssessments || {};
            Object.keys(ya).forEach(y => years.add(y));
        });
        return Array.from(years).sort();
    },

    _getScoreStr(biz) {
        if (!biz.score || typeof biz.score !== 'object') return '-';
        return `${biz.score.s || '-'}${biz.score.e || '-'}${biz.score.c || '-'}${biz.score.soc || '-'}${biz.score.env || '-'}`;
    },

    _colorScore(grade) {
        if (!grade || grade === '-') return '';
        const cls = { 'A': 'score-a', 'B': 'score-b', 'C': 'score-c', 'D': 'score-d' }[grade] || '';
        return `<span class="${cls}">${grade}</span>`;
    },

    renderSpreadsheet() {
        const container = document.getElementById('sheet-table-container');
        if (!container) return;

        const search = (document.getElementById('sheet-search')?.value || '').toLowerCase().trim();
        const typeFilter = document.getElementById('sheet-type-filter')?.value || 'all';
        const scoreFilter = document.getElementById('sheet-score-filter')?.value || 'all';
        const cols = this._getVisibleCols();
        const yaYears = this._getAllYAYears();

        // Filter
        let filtered = businesses.filter(biz => {
            // Type filter
            if (typeFilter !== 'all' && biz.type !== typeFilter) return false;

            // Score filter
            if (scoreFilter !== 'all' && biz.score && typeof biz.score === 'object') {
                const scoreVals = Object.values(biz.score);
                if (!scoreVals.includes(scoreFilter)) return false;
            } else if (scoreFilter !== 'all' && (!biz.score || biz.type === 'affiliate')) {
                return false;
            }

            // Search
            if (search) {
                const haystack = [biz.name, biz.founder, biz.ownerEmail, biz.contact, biz.location, biz.website, biz.story, biz.id].filter(Boolean).join(' ').toLowerCase();
                if (!haystack.includes(search)) return false;
            }
            return true;
        });

        // Sort
        if (this.sheetSortCol) {
            filtered.sort((a, b) => {
                let va = '', vb = '';
                const col = this.sheetSortCol;
                if (col === 'name') { va = a.name || ''; vb = b.name || ''; }
                else if (col === 'founder') { va = a.founder || ''; vb = b.founder || ''; }
                else if (col === 'type') { va = a.type || ''; vb = b.type || ''; }
                else if (col === 'score') { va = this._getScoreStr(a); vb = this._getScoreStr(b); }
                else if (col === 'owner') { va = a.ownerEmail || ''; vb = b.ownerEmail || ''; }
                else if (col === 'contact') { va = a.contact || ''; vb = b.contact || ''; }
                else if (col === 'location') { va = a.location || ''; vb = b.location || ''; }
                else if (col === 'checkins') { va = a.checkinsCount || 0; vb = b.checkinsCount || 0; }
                else if (col === 'purchases') { va = a.purchasesCount || 0; vb = b.purchasesCount || 0; }
                if (typeof va === 'number') return this.sheetSortDir === 'asc' ? va - vb : vb - va;
                return this.sheetSortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
            });
        }

        // Update count
        const countEl = document.getElementById('sheet-count');
        if (countEl) countEl.innerText = `Showing ${filtered.length} of ${businesses.length} businesses`;

        // Build table header
        let thead = '<tr>';
        thead += '<th onclick="app.sortSheet(\'name\')" class="' + (this.sheetSortCol === 'name' ? 'sorted-' + this.sheetSortDir : '') + '">#</th>';
        thead += '<th onclick="app.sortSheet(\'name\')" class="' + (this.sheetSortCol === 'name' ? 'sorted-' + this.sheetSortDir : '') + '">Name</th>';
        thead += '<th onclick="app.sortSheet(\'founder\')" class="' + (this.sheetSortCol === 'founder' ? 'sorted-' + this.sheetSortDir : '') + '">Founder</th>';
        thead += '<th onclick="app.sortSheet(\'owner\')" class="' + (this.sheetSortCol === 'owner' ? 'sorted-' + this.sheetSortDir : '') + '">Owner Email</th>';
        thead += '<th onclick="app.sortSheet(\'type\')" class="' + (this.sheetSortCol === 'type' ? 'sorted-' + this.sheetSortDir : '') + '">Type</th>';
        thead += '<th onclick="app.sortSheet(\'score\')" class="' + (this.sheetSortCol === 'score' ? 'sorted-' + this.sheetSortDir : '') + '">Sh</th>';
        thead += '<th>Em</th><th>Cu</th><th>So</th><th>Env</th>';
        if (cols.contact) thead += '<th onclick="app.sortSheet(\'contact\')" class="' + (this.sheetSortCol === 'contact' ? 'sorted-' + this.sheetSortDir : '') + '">Contact</th>';
        if (cols.location) thead += '<th onclick="app.sortSheet(\'location\')" class="' + (this.sheetSortCol === 'location' ? 'sorted-' + this.sheetSortDir : '') + '">Location</th>';
        if (cols.website) thead += '<th>Website</th>';
        if (cols.impact) thead += '<th>Impact Statement</th><th>Waste (kg)</th><th>Jobs</th>';
        if (cols.ya) {
            yaYears.forEach(y => {
                thead += `<th>${y} Rev</th><th>${y} Waste</th><th>${y} Trees</th>`;
            });
        }
        if (cols.activity) {
            thead += '<th onclick="app.sortSheet(\'checkins\')" class="' + (this.sheetSortCol === 'checkins' ? 'sorted-' + this.sheetSortDir : '') + '">Check-ins</th>';
            thead += '<th onclick="app.sortSheet(\'purchases\')" class="' + (this.sheetSortCol === 'purchases' ? 'sorted-' + this.sheetSortDir : '') + '">Purchases</th>';
        }
        thead += '</tr>';

        // Build table rows
        let tbody = '';
        filtered.forEach((biz, idx) => {
            const score = (biz.score && typeof biz.score === 'object') ? biz.score : {};
            tbody += '<tr>';
            tbody += `<td style="color:var(--text-secondary);">${idx + 1}</td>`;
            tbody += `<td style="font-weight:600;">${biz.name || '-'}</td>`;
            tbody += `<td>${biz.founder || '-'}</td>`;
            tbody += `<td style="font-size:0.7rem;">${biz.ownerEmail || '-'}</td>`;
            tbody += `<td><span class="cell-type ${biz.type === 'affiliate' ? 'cell-type-affiliate' : 'cell-type-full'}">${biz.type || 'full'}</span></td>`;
            tbody += `<td class="cell-score">${this._colorScore(score.s)}</td>`;
            tbody += `<td class="cell-score">${this._colorScore(score.e)}</td>`;
            tbody += `<td class="cell-score">${this._colorScore(score.c)}</td>`;
            tbody += `<td class="cell-score">${this._colorScore(score.soc)}</td>`;
            tbody += `<td class="cell-score">${this._colorScore(score.env)}</td>`;
            if (cols.contact) tbody += `<td style="font-size:0.7rem;">${biz.contact || '-'}</td>`;
            if (cols.location) tbody += `<td title="${biz.location || ''}" style="max-width:150px;">${biz.location || '-'}</td>`;
            if (cols.website) tbody += `<td>${biz.website ? '<a href="' + biz.website + '" target="_blank" style="color:var(--accent-primary); text-decoration:none; font-size:0.7rem;">' + biz.website.replace(/https?:\/\//, '') + '</a>' : '-'}</td>`;
            if (cols.impact) {
                tbody += `<td title="${biz.impactStatement || ''}" style="max-width:150px;">${biz.impactStatement || '-'}</td>`;
                tbody += `<td>${biz.impactWaste || '-'}</td>`;
                tbody += `<td>${biz.impactJobs || '-'}</td>`;
            }
            if (cols.ya) {
                const ya = biz.yearlyAssessments || {};
                yaYears.forEach(y => {
                    const d = ya[y] || {};
                    tbody += `<td>${d.revenue ? 'RM ' + Number(d.revenue).toLocaleString() : '-'}</td>`;
                    tbody += `<td>${d.wasteKg ? Number(d.wasteKg).toLocaleString() + 'kg' : '-'}</td>`;
                    tbody += `<td>${d.treesPlanted ? Number(d.treesPlanted).toLocaleString() : '-'}</td>`;
                });
            }
            if (cols.activity) {
                tbody += `<td style="font-weight:600;">${(biz.checkinsCount || 0).toLocaleString()}</td>`;
                tbody += `<td style="font-weight:600;">${(biz.purchasesCount || 0).toLocaleString()}</td>`;
            }
            tbody += '</tr>';
        });

        container.innerHTML = `<table class="sheet-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
    },

    sortSheet(col) {
        if (this.sheetSortCol === col) {
            this.sheetSortDir = this.sheetSortDir === 'asc' ? 'desc' : 'asc';
        } else {
            this.sheetSortCol = col;
            this.sheetSortDir = 'asc';
        }
        this.renderSpreadsheet();
    },

    exportSpreadsheetCSV() {
        if (!currentUser || !currentUser.isSuperAdmin) return;
        const yaYears = this._getAllYAYears();
        let csv = 'Name,Founder,Owner Email,Type,Sh,Em,Cu,So,Env,Contact,Location,Website,Impact Statement,Waste (kg),Jobs';
        yaYears.forEach(y => { csv += `,${y} Revenue,${y} Waste (kg),${y} Trees`; });
        csv += ',Check-ins,Purchases\n';

        businesses.forEach(biz => {
            const score = (biz.score && typeof biz.score === 'object') ? biz.score : {};
            const ya = biz.yearlyAssessments || {};
            const esc = (v) => '"' + String(v || '').replace(/"/g, '""') + '"';
            csv += [
                esc(biz.name), esc(biz.founder), esc(biz.ownerEmail), esc(biz.type),
                esc(score.s), esc(score.e), esc(score.c), esc(score.soc), esc(score.env),
                esc(biz.contact), esc(biz.location), esc(biz.website),
                esc(biz.impactStatement), esc(biz.impactWaste), esc(biz.impactJobs)
            ].join(',');
            yaYears.forEach(y => {
                const d = ya[y] || {};
                csv += `,${esc(d.revenue)},${esc(d.wasteKg)},${esc(d.treesPlanted)}`;
            });
            csv += `,${biz.checkinsCount || 0},${biz.purchasesCount || 0}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bfg_businesses_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this.showToast('CSV exported successfully!');
    },

    async saveInitiative() {
        const idInput = document.getElementById('admin-init-id').value;
        const title = document.getElementById('admin-init-title').value.trim();
        const narrative = document.getElementById('admin-init-narrative').value.trim();
        const mechanism = document.getElementById('admin-init-mechanism').value.trim();
        const url = document.getElementById('admin-init-url').value.trim();
        const status = document.getElementById('admin-init-status').value;
        const startDate = document.getElementById('admin-init-start-date').value || null;
        const endDate = document.getElementById('admin-init-end-date').value || null;
        const files = document.getElementById('admin-init-photos').files;

        if (!title) return this.showToast('Campaign Title is required', true);

        const loading = document.getElementById('admin-init-loading');
        loading.classList.remove('hidden');

        try {
            let photos = [];
            const existing = PLATFORM_INITIATIVES.find(i => i.id === idInput);
            
            if (files.length > 0) {
                // Upload up to 5 photos as base64
                for (let i = 0; i < files.length; i++) {
                    if (i >= 5) break; 
                    const base64 = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const img = new Image();
                            img.onload = () => {
                                const canvas = document.createElement('canvas');
                                const MAX_WIDTH = 600; // Aggressively compress for fast gallery loading
                                const MAX_HEIGHT = 600;
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

                                // Output as JPEG with 0.6 quality to ensure 5 photos easily fit under Firestore 1MB document limit
                                resolve(canvas.toDataURL('image/jpeg', 0.6));
                            };
                            img.onerror = () => resolve('');
                            img.src = e.target.result;
                        };
                        reader.onerror = () => resolve('');
                        reader.readAsDataURL(files[i]);
                    });
                    if (base64) photos.push(base64);
                }
            } else if (existing && existing.photos) {
                photos = existing.photos; // retain old
            }

            const data = {
                title, narrative, mechanism, url, status, startDate, endDate, photos,
                updatedAt: new Date().toISOString()
            };

            if (db && firebaseConfig.apiKey !== "YOUR_API_KEY") {
                if (idInput) {
                    await db.collection('initiatives').doc(idInput).set(data, {merge:true});
                } else {
                    await db.collection('initiatives').add(data);
                }
            } else {
                 if(idInput) {
                     const idx = PLATFORM_INITIATIVES.findIndex(i => i.id === idInput);
                     if(idx>-1) PLATFORM_INITIATIVES[idx] = {...data, id: idInput};
                 } else {
                     PLATFORM_INITIATIVES.push({...data, id: 'init_'+Date.now()});
                 }
            }

            this.showToast('Initiative saved successfully!');
            this.loadAdminInitiativeToEdit(''); 
            await this.forceSync();
            
        } catch (e) {
            console.error("Error saving initiative:", e);
            this.showToast('Failed to save initiative', true);
        } finally {
            loading.classList.add('hidden');
        }
    },

    loadAdminInitiativeToEdit(id) {
        document.getElementById('admin-init-id').value = id || '';
        document.getElementById('btn-admin-cancel-initiative').classList.toggle('hidden', !id);
        const titleEl = document.getElementById('admin-initiative-form-title');
        if(titleEl) titleEl.innerText = id ? 'Edit Initiative' : 'Add New Initiative';
        
        const init = PLATFORM_INITIATIVES.find(i => i.id === id) || {};
        document.getElementById('admin-init-title').value = init.title || '';
        document.getElementById('admin-init-narrative').value = init.narrative || '';
        document.getElementById('admin-init-mechanism').value = init. механизм || init.mechanism || ''; // typo safety
        document.getElementById('admin-init-url').value = init.url || '';
        document.getElementById('admin-init-status').value = init.status || 'active';
        document.getElementById('admin-init-start-date').value = init.startDate || '';
        document.getElementById('admin-init-end-date').value = init.endDate || '';
        document.getElementById('admin-init-photos').value = ''; 
    },

    async _toggleInitiativeStatus(id, currentStatus) {
        if (!currentUser || !currentUser.isSuperAdmin) return;
        const newStatus = currentStatus === 'active' ? 'past' : 'active';
        if (db && firebaseConfig.apiKey !== "YOUR_API_KEY") {
             await db.collection('initiatives').doc(id).set({status: newStatus}, {merge:true});
        } else {
             const idx = PLATFORM_INITIATIVES.findIndex(i => i.id === id);
             if(idx>-1) PLATFORM_INITIATIVES[idx].status = newStatus;
        }
        await this.forceSync();
        this.showToast(`Set to ${newStatus}`);
    },

    renderAdminInitiatives() {
        const container = document.getElementById('admin-initiatives-list-container');
        if (!container) return;
        container.innerHTML = '';

        if (PLATFORM_INITIATIVES.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding:1rem;">No initiatives found.</p>';
            return;
        }

        // Sort: Active first, then by chronological end date (most recent end first)
        const sortedList = [...PLATFORM_INITIATIVES].sort((a, b) => {
            if (a.status === 'active' && b.status !== 'active') return -1;
            if (a.status !== 'active' && b.status === 'active') return 1;
            
            // Handle dates (treat blank endDate as far future/Present)
            const dateA = a.endDate ? new Date(a.endDate) : new Date('9999-12');
            const dateB = b.endDate ? new Date(b.endDate) : new Date('9999-12');
            
            if (dateA > dateB) return -1;
            if (dateA < dateB) return 1;
            
            return (a.title || "").localeCompare(b.title || "");
        });

        // Helper to format 'YYYY-MM' to 'Feb 2025'
        const formatMonth = (val) => {
            if (!val) return '';
            const parts = val.split('-');
            if (parts.length < 2) return val;
            const d = new Date(parts[0], parts[1] - 1);
            return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        };

        sortedList.forEach(init => {
            const statusColor = init.status === 'active' ? 'var(--accent-success)' : (init.status === 'past' ? 'var(--accent-secondary)' : 'var(--text-secondary)');
            
            const sDate = formatMonth(init.startDate);
            const eDate = formatMonth(init.endDate);
            let dateStr = '';
            if (sDate) {
                 dateStr = `<span style="font-size:0.75rem; color:var(--text-secondary); margin-left:0.5rem; font-weight:normal;">(${sDate} - ${eDate || 'Present'})</span>`;
            }

            container.innerHTML += `
                <div style="background: rgba(255,255,255,0.05); border-radius: var(--radius-sm); padding: 0.8rem; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${init.title}</strong>${dateStr}<br>
                        <span style="font-size:0.75rem; color:${statusColor}; font-weight:bold; text-transform:uppercase;">${init.status}</span>
                        <span style="font-size:0.75rem; color:var(--text-secondary);"> &bull; ${init.photos ? init.photos.length : 0} photos</span>
                    </div>
                    <div style="display:flex; gap:0.5rem;">
                        <button class="icon-btn" onclick="app.loadAdminInitiativeToEdit('${init.id}')"><i class="fa-solid fa-pen"></i></button>
                        <button class="icon-btn" style="color:var(--text-warning);" onclick="app._toggleInitiativeStatus('${init.id}', '${init.status}')"><i class="fa-solid fa-power-off"></i></button>
                    </div>
                </div>
            `;
        });
    },

    renderInitiatives() {
        const container = document.getElementById('initiatives-list-container');
        if (!container) return;
        container.innerHTML = '';

        const activeList = PLATFORM_INITIATIVES
            .filter(i => i.status !== 'hidden')
            .sort((a, b) => {
                // Priority 1: Active cards first
                if (a.status === 'active' && b.status !== 'active') return -1;
                if (a.status !== 'active' && b.status === 'active') return 1;
                
                // Priority 2: Chronological (most recent end date first)
                const dateA = a.endDate ? new Date(a.endDate) : new Date('9999-12');
                const dateB = b.endDate ? new Date(b.endDate) : new Date('9999-12');
                
                if (dateA > dateB) return -1;
                if (dateA < dateB) return 1;

                return (a.title || "").localeCompare(b.title || "");
            });

        if (activeList.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary); padding:2rem; text-align:center;">No active campaigns at the moment. Check back soon!</p>';
            return;
        }

        activeList.forEach(init => {
            // Render mechanism bullets
            let bulletsHTML = '';
            if (init.mechanism) {
                const parts = init.mechanism.split('\\n').filter(p => p.trim() !== '');
                parts.forEach(p => {
                    bulletsHTML += `<li>${p.trim()}</li>`;
                });
            }

            // Render gallery
            let galleryHTML = '';
            if (init.photos && init.photos.length > 0) {
                const imagesHTML = init.photos.map(p => `
                    <div style="min-width: 140px; height: 100px; background: rgba(255,255,255,0.1); border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; overflow:hidden;">
                        <img src="${p}" style="height:100%; min-width:100%; object-fit:cover;">
                    </div>
                `).join('');

                galleryHTML = `
                    <div style="display: flex; gap: 0.8rem; overflow-x: auto; padding-bottom: 0.5rem; scrollbar-width: thin; -ms-overflow-style: none;">
                        ${imagesHTML}
                    </div>
                `;
            }

            const headerTag = init.status === 'past' ? `<span style="font-size: 0.7rem; background: var(--accent-secondary); padding: 0.3rem 0.6rem; border-radius:1rem; font-weight:bold; color:#fff; display:inline-block; margin-bottom:0.5rem;">PAST CAMPAIGN</span>` : `<span style="font-size: 0.7rem; background: var(--accent-success); padding: 0.3rem 0.6rem; border-radius:1rem; font-weight:bold; color:#fff; display:inline-block; margin-bottom:0.5rem;">ACTIVE INITIATIVE</span>`;

            // Helper to format 'YYYY-MM' to 'Feb 2025'
            const formatMonth = (val) => {
                if (!val) return '';
                const parts = val.split('-');
                if (parts.length < 2) return val;
                const d = new Date(parts[0], parts[1] - 1);
                return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
            };
            
            const sDate = formatMonth(init.startDate);
            const eDate = formatMonth(init.endDate);
            let dateStr = '';
            if (sDate) {
                 dateStr = `<span style="display:block; font-size:0.8rem; color:var(--text-secondary); margin-top:0.2rem;"><i class="fa-regular fa-calendar" style="margin-right:0.3rem;"></i> ${sDate} - ${eDate || 'Present'}</span>`;
            }

            container.innerHTML += `
                <div class="glass-card feature-gradient mt-2" style="position: relative; overflow: hidden; padding: 1.5rem;">
                    <div style="display: flex; flex-direction: column; gap: 1rem; position: relative; z-index: 2;">
                        <div>
                            ${headerTag}
                            <h3 style="margin-top: 0.3rem; font-size: 1.4rem; margin-bottom:0px;">${init.title}</h3>
                            ${dateStr}
                            <p style="color: rgba(255,255,255,0.9); font-size: 0.95rem; line-height: 1.5; margin-top: 0.7rem;">
                                ${init.narrative}
                            </p>
                        </div>
                        
                        ${bulletsHTML ? `
                        <div style="background: rgba(0,0,0,0.3); border-radius: var(--radius-md); padding: 1rem; border: 1px solid rgba(255,255,255,0.1);">
                            <h4 style="font-size: 0.9rem; margin-bottom: 0.5rem; color: var(--accent-primary);">How It Works:</h4>
                            <ul style="font-size: 0.85rem; color: var(--text-secondary); margin-left: 1.2rem; line-height: 1.6;">
                                ${bulletsHTML}
                            </ul>
                        </div>` : ''}

                        ${galleryHTML}

                        ${init.url ? `
                        <a href="${init.url}" target="_blank" style="text-decoration: none;">
                            <button class="btn btn-outline" style="width: 100%; border-color: rgba(255,255,255,0.3); margin-top: 0.5rem;">
                                Learn More <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.8rem; margin-left: 0.3rem;"></i>
                            </button>
                        </a>` : ''}
                    </div>
                </div>
            `;
        });
    },

    // --- Privileges Management ---
    async savePrivilege() {
        const idInput = document.getElementById('admin-priv-id').value;
        const title = document.getElementById('admin-priv-title').value.trim();
        const description = document.getElementById('admin-priv-desc').value.trim();
        const requiredTier = document.getElementById('admin-priv-tier').value;
        const icon = document.getElementById('admin-priv-icon').value.trim() || 'fa-gem';
        const status = document.getElementById('admin-priv-status').value;

        if (!title) return this.showToast('Privilege Title is required', true);

        const loading = document.getElementById('admin-priv-loading');
        loading.classList.remove('hidden');

        try {
            const data = {
                title, description, requiredTier, icon, status,
                updatedAt: new Date().toISOString()
            };

            if (db && firebaseConfig.apiKey !== "YOUR_API_KEY") {
                if (idInput) {
                    await db.collection('privileges').doc(idInput).set(data, {merge:true});
                } else {
                    const docRef = await db.collection('privileges').add(data);
                    data.id = docRef.id;
                }
            }
            
            if (idInput) {
                const idx = PLATFORM_PRIVILEGES.findIndex(i => i.id === idInput);
                if(idx > -1) PLATFORM_PRIVILEGES[idx] = { ...PLATFORM_PRIVILEGES[idx], ...data };
            } else {
                if (!data.id) data.id = 'priv_' + Date.now();
                PLATFORM_PRIVILEGES.push(data);
            }

            this.showToast('Privilege saved successfully!');
            this.loadAdminPrivilegeToEdit(''); 
            this.saveData();
            this.renderAdminPrivileges();
            
        } catch (e) {
            console.error("Error saving privilege:", e);
            this.showToast('Failed to save privilege', true);
        } finally {
            loading.classList.add('hidden');
        }
    },

    loadAdminPrivilegeToEdit(id) {
        document.getElementById('admin-priv-id').value = id || '';
        document.getElementById('btn-admin-cancel-privilege').classList.toggle('hidden', !id);
        const titleEl = document.getElementById('admin-privilege-form-title');
        if(titleEl) titleEl.innerText = id ? 'Edit Privilege' : 'Add New Privilege';
        
        const priv = PLATFORM_PRIVILEGES.find(p => p.id === id) || {};
        document.getElementById('admin-priv-title').value = priv.title || '';
        document.getElementById('admin-priv-desc').value = priv.description || '';
        document.getElementById('admin-priv-tier').value = priv.requiredTier || 'Blue';
        document.getElementById('admin-priv-icon').value = priv.icon || '';
        document.getElementById('admin-priv-status').value = priv.status || 'active';
    },

    _togglePrivilegeStatus(id, currentStatus) {
        if (!currentUser || !currentUser.isSuperAdmin) return;
        const newStatus = currentStatus === 'active' ? 'hidden' : 'active';
        
        if (db && firebaseConfig.apiKey !== "YOUR_API_KEY") {
             db.collection('privileges').doc(id).set({status: newStatus}, {merge:true});
        }
        
        const idx = PLATFORM_PRIVILEGES.findIndex(p => p.id === id);
        if(idx > -1) PLATFORM_PRIVILEGES[idx].status = newStatus;
        
        this.saveData();
        this.renderAdminPrivileges();
        this.showToast(`Set to ${newStatus}`);
    },

    renderAdminPrivileges() {
        const container = document.getElementById('admin-privileges-list-container');
        if (!container) return;
        container.innerHTML = '';

        if (PLATFORM_PRIVILEGES.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding:1rem;">No privileges found.</p>';
            return;
        }

        const tierOrder = { 'Blue': 1, 'Silver': 2, 'Gold': 3, 'Platinum': 4 };
        
        const sortedList = [...PLATFORM_PRIVILEGES].sort((a, b) => {
            if (a.status === 'active' && b.status !== 'active') return -1;
            if (a.status !== 'active' && b.status === 'active') return 1;
            
            const tierA = tierOrder[a.requiredTier] || 0;
            const tierB = tierOrder[b.requiredTier] || 0;

            if (tierA !== tierB) return tierA - tierB;
            
            return (a.title || "").localeCompare(b.title || "");
        });

        sortedList.forEach(priv => {
            const statusColor = priv.status === 'active' ? 'var(--accent-success)' : 'var(--text-secondary)';
            let tierColor = 'var(--text-secondary)';
            if (priv.requiredTier === 'Silver') tierColor = '#c0c0c0';
            if (priv.requiredTier === 'Gold') tierColor = '#ffd700';
            if (priv.requiredTier === 'Platinum') tierColor = '#E5E4E2';

            container.innerHTML += `
                <div style="background: rgba(255,255,255,0.05); border-radius: var(--radius-sm); padding: 0.8rem; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong><i class="fa-solid ${priv.icon || 'fa-gem'}" style="margin-right: 0.5rem; color: ${tierColor};"></i> ${priv.title}</strong><br>
                        <span style="font-size:0.75rem; color:${statusColor}; font-weight:bold; text-transform:uppercase;">${priv.status}</span>
                        <span style="font-size:0.75rem; color:var(--text-secondary);"> &bull; Tier: <span style="color:${tierColor}; font-weight:bold;">${priv.requiredTier}</span></span>
                    </div>
                    <div style="display:flex; gap:0.5rem;">
                        <button class="icon-btn" onclick="app.loadAdminPrivilegeToEdit('${priv.id}')"><i class="fa-solid fa-pen"></i></button>
                        <button class="icon-btn" style="color:var(--text-warning);" onclick="app._togglePrivilegeStatus('${priv.id}', '${priv.status}')"><i class="fa-solid fa-power-off"></i></button>
                    </div>
                </div>
            `;
        });
    },

    // --- Tutorial Logic ---
    startTutorial() {
        this.tutorialStep = 0;
        document.getElementById('tutorial-modal').classList.remove('hidden');
        this.renderTutorial();
    },

    nextTutorialStep() {
        if (this.tutorialStep < this.tutorialSteps.length - 1) {
            this.tutorialStep++;
            this.renderTutorial();
        } else {
            this.closeTutorial();
        }
    },

    prevTutorialStep() {
        if (this.tutorialStep > 0) {
            this.tutorialStep--;
            this.renderTutorial();
        }
    },

    closeTutorial() {
        document.getElementById('tutorial-modal').classList.add('hidden');
    },

    renderTutorial() {
        const step = this.tutorialSteps[this.tutorialStep];
        const content = document.getElementById('tutorial-content');
        const nextBtn = document.getElementById('tutorial-next');
        const prevBtn = document.getElementById('tutorial-prev');
        const dots = document.getElementById('tutorial-dots');

        content.innerHTML = `
            <div style="margin-bottom: 1.5rem; position: relative;">
                <img src="${step.image}" style="width: 100%; max-width: 280px; height: auto; border-radius: var(--radius-md); box-shadow: 0 500 20px rgba(0,0,0,0.3); border: 2px solid rgba(255,255,255,0.05); animation: zoomIn 0.5s ease-out;">
                <div style="position: absolute; top: -15px; right: -15px; background: ${step.color}; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem; box-shadow: 0 4px 10px rgba(0,0,0,0.3); animation: bounce 2s infinite;">
                    <i class="fa-solid ${step.icon}"></i>
                </div>
            </div>
            <h2 style="color: ${step.color}; margin-bottom: 0.8rem; font-size: 1.25rem;">${step.title}</h2>
            <p style="color: var(--text-secondary); line-height: 1.6; font-size: 0.9rem; margin-bottom: 1rem; padding: 0 0.5rem;">${step.text}</p>
        `;

        // Update Nav
        prevBtn.style.visibility = this.tutorialStep === 0 ? 'hidden' : 'visible';
        nextBtn.innerText = this.tutorialStep === this.tutorialSteps.length - 1 ? 'Finish' : 'Next';

        // Update Dots
        dots.innerHTML = '';
        this.tutorialSteps.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.className = `tutorial-dot ${i === this.tutorialStep ? 'active' : ''}`;
            dots.appendChild(dot);
        });
    },

    initAuditListener() {
        if (!db || !currentUser || !currentUser.isSupervisor) return;
        
        db.collection('audit_logs')
            .where('status', '==', 'PENDING_APPROVAL')
            .onSnapshot(snapshot => {
                let count = 0;
                snapshot.forEach(doc => {
                    const log = doc.data();
                    if (log.supervisorEmail === currentUser.email || (log.supervisorEmails && log.supervisorEmails.includes(currentUser.email))) {
                        count++;
                    }
                });
                this.pendingApprovalCount = count;
                this.updateNewsreel();
            });
    },

    // --- Audit Lifecycle (v0.95) ---
    
    async createAuditEntry(bizId, type, details, initialSummary = '') {
        if (!db) return null;
        if (!currentUser) return null;

        const biz = businesses.find(b => b.id === bizId);
        const logData = {
            bizId: bizId,
            bizName: biz ? biz.name : 'Unknown',
            type: type, // 'STATUS_UPGRADE', 'SCORE_CHANGE', 'YA_UPDATE', 'ADMIN_ONBOARD'
            details: details, // Technical delta
            publicSummary: initialSummary, // Auditor will refine this
            status: 'SYSTEM_DRAFT',
            auditorEmail: currentUser.email,
            supervisorEmails: supervisorMap[currentUser.email] || [SUPER_ADMIN_EMAIL],
            createdAt: new Date().toISOString(),
            rejectionComment: ''
        };

        try {
            const docRef = await db.collection('audit_logs').add(logData);
            this.showToast(`New ${type} audit draft created.`);
            return docRef.id;
        } catch (e) {
            console.error("Audit log creation error:", e);
            return null;
        }
    },

    async submitAuditToSupervisor(logId, summary, supervisorEmail) {
        if (!db) return;
        try {
            await db.collection('audit_logs').doc(logId).update({
                publicSummary: summary,
                supervisorEmail: supervisorEmail,
                status: 'PENDING_APPROVAL',
                submittedAt: new Date().toISOString()
            });
            this.showToast("Submitted to supervisor for review.");
            this.renderAuditHub();
        } catch (e) {
            console.error("Audit submission error:", e);
        }
    },

    async approveAudit(logId) {
        if (!db) return;
        try {
            const logDoc = await db.collection('audit_logs').doc(logId).get();
            const log = logDoc.data();
            
            // Check self-approval restriction
            if (currentUser.email === log.auditorEmail && !currentUser.isSuperAdmin) {
                this.showToast("Self-approval is strictly prohibited.");
                return;
            }

            await db.collection('audit_logs').doc(logId).update({
                status: 'PUBLISHED',
                approvedBy: currentUser.email,
                approvedAt: new Date().toISOString()
            });

            this.showToast("Audit log published successfully.");
            this.renderAuditHub();
        } catch (e) {
            console.error("Audit approval error:", e);
        }
    },

    async rejectAudit(logId, comment) {
        if (!db) return;
        if (!comment) {
            this.showToast("Rejection comment is required.");
            return;
        }
        try {
            await db.collection('audit_logs').doc(logId).update({
                status: 'RETURNED',
                rejectionComment: comment,
                rejectedBy: currentUser.email,
                rejectedAt: new Date().toISOString()
            });
            this.showToast("Log returned to auditor with comments.");
            this.renderAuditHub();
        } catch (e) {
            console.error("Audit rejection error:", e);
        }
    },

    async renderAuditHub() {
        if (!db) return;
        const container = document.getElementById('audit-hub-content');
        if (!container) return;

        container.innerHTML = '<div style="text-align:center; padding:2rem;"><i class="fa-solid fa-spinner fa-spin"></i> Loading verification queue...</div>';

        const snapshot = await db.collection('audit_logs').get();
        let logs = [];
        snapshot.forEach(doc => logs.push({ id: doc.id, ...doc.data() }));
        
        // Sort by date locally to avoid index errors on new collections
        logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const myDrafts = logs.filter(l => l.auditorEmail === currentUser.email && (l.status === 'SYSTEM_DRAFT' || l.status === 'RETURNED'));
        const pendingForMe = logs.filter(l => (l.supervisorEmail === currentUser.email || (l.supervisorEmails && l.supervisorEmails.includes(currentUser.email) && !l.supervisorEmail)) && l.status === 'PENDING_APPROVAL');

        let html = '<div class="stats-grid" style="margin-bottom:2rem;">';
        html += `<div class="stat-card glass-card"><h3>${myDrafts.length}</h3><p>My Pending Drafts</p></div>`;
        html += `<div class="stat-card glass-card"><h3>${pendingForMe.length}</h3><p>Awaiting My Approval</p></div>`;
        html += '</div>';

        // --- Supervisor Queue ---
        if (currentUser.isSupervisor) {
            html += '<h3><i class="fa-solid fa-user-check" style="color:var(--accent-primary)"></i> Approvals Assigned to Me</h3>';
            if (pendingForMe.length === 0) {
                html += '<p style="color:var(--text-secondary); margin:1rem 0;">No logs currently awaiting your authorization.</p>';
            } else {
                pendingForMe.forEach(log => {
                    html += `
                        <div class="glass-card mt-3" style="border-left: 4px solid var(--accent-primary);">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                <div>
                                    <h4 style="margin:0;">${log.bizName} - ${log.type}</h4>
                                    <p style="font-size:0.8rem; color:var(--text-secondary);">Auditor: ${log.auditorEmail}</p>
                                </div>
                                <span class="cell-type cell-type-full" style="background:rgba(59,130,246,0.2);">Pending</span>
                            </div>
                            <div style="margin-top:1rem; padding:1rem; background:rgba(255,255,255,0.05); border-radius:var(--radius-sm);">
                                <p style="font-weight:600; font-size:0.9rem;">Public Summary:</p>
                                <p style="font-style:italic;">"${log.publicSummary}"</p>
                                <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin:0.5rem 0;">
                                <p style="font-size:0.8rem; color:var(--text-secondary);">Technical Details: ${log.details}</p>
                            </div>
                            <div style="margin-top:1rem; display:flex; gap:0.5rem;">
                                <button class="btn btn-primary" style="flex:1;" onclick="app.approveAudit('${log.id}')">Approve & Publish</button>
                                <button class="btn btn-secondary" style="color:var(--text-warning); border-color:var(--text-warning);" onclick="var c=prompt('Enter rejection comment:'); if(c) app.rejectAudit('${log.id}', c)">Reject</button>
                            </div>
                        </div>
                    `;
                });
            }
        }

        // --- Auditor Queue ---
        if (currentUser.isAuditor) {
            html += '<h3 class="mt-5"><i class="fa-solid fa-pen-nib" style="color:#81C784"></i> My Action Items</h3>';
            if (myDrafts.length === 0) {
                html += '<p style="color:var(--text-secondary); margin:1rem 0;">You have no active drafts or returned items.</p>';
            } else {
                myDrafts.forEach(log => {
                    const isReturned = log.status === 'RETURNED';
                    html += `
                        <div class="glass-card mt-3" style="border-left: 4px solid ${isReturned ? 'var(--text-warning)' : '#81C784'};">
                            <div style="display:flex; justify-content:space-between;">
                                <div>
                                    <h4 style="margin:0;">${log.bizName} - ${log.type}</h4>
                                    <p style="font-size:0.8rem; color:var(--text-secondary);">Created: ${new Date(log.createdAt).toLocaleDateString()}</p>
                                </div>
                                <span class="cell-type" style="background:${isReturned ? 'rgba(255,193,7,0.2)' : 'rgba(255,255,255,0.1)'}">${log.status}</span>
                            </div>
                            ${isReturned ? `
                                <div style="margin-top:1rem; padding:1rem; background:rgba(211,47,47,0.1); border-radius:var(--radius-sm); border: 1px solid rgba(211,47,47,0.3);">
                                    <p style="color:#FFCDD2; font-size:0.85rem;"><strong>Rejection Comment from ${log.rejectedBy}:</strong></p>
                                    <p style="color:#FFF; font-size:0.9rem;">${log.rejectionComment}</p>
                                </div>
                            ` : ''}
                            <div style="margin-top:1rem;">
                                <label style="font-size:0.8rem; color:var(--text-secondary);">Public Summary (Draft for Compliance Timeline)</label>
                                <textarea id="summary-${log.id}" class="input-modern" rows="2" style="width:100%;">${log.publicSummary || ''}</textarea>
                                
                                <label style="font-size:0.8rem; color:var(--text-secondary); margin-top:0.8rem;">Target Supervisor</label>
                                <select id="supervisor-${log.id}" class="input-modern" style="width:100%;">
                                    ${(log.supervisorEmails || [SUPER_ADMIN_EMAIL]).map(email => `<option value="${email}">${email}</option>`).join('')}
                                </select>
                                
                                <button class="btn btn-primary btn-block mt-3" onclick="app.submitAuditToSupervisor('${log.id}', document.getElementById('summary-${log.id}').value, document.getElementById('supervisor-${log.id}').value)">
                                    Submit for Review
                                </button>
                            </div>
                        </div>
                    `;
                });
            }
        }

        container.innerHTML = html;
    },

    async renderComplianceTimeline(targetElId, bizId) {
        if (!db) return;
        const container = document.getElementById(targetElId);
        if (!container) return;

        const snapshot = await db.collection('audit_logs')
            .where('bizId', '==', bizId)
            .where('status', '==', 'PUBLISHED')
            .get();

        const logs = [];
        snapshot.forEach(doc => logs.push(doc.data()));
        logs.sort((a, b) => new Date(b.approvedAt) - new Date(a.approvedAt));

        if (logs.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary); font-style:italic;">No verified compliance records available yet.</p>';
            return;
        }

        let html = '<div class="compliance-timeline" style="border-left: 2px solid rgba(255,255,255,0.1); padding-left: 1.5rem; margin-top: 1rem; position: relative;">';
        logs.forEach(log => {
            html += `
                <div class="timeline-item" style="margin-bottom: 2rem; position: relative;">
                    <div style="width:12px; height:12px; background:var(--accent-success); border-radius:50%; position:absolute; left:-22px; top:5px; box-shadow: 0 0 10px var(--accent-success);"></div>
                    <div style="font-size:0.7rem; color:var(--text-secondary); margin-bottom:0.2rem;">${new Date(log.approvedAt).toLocaleDateString()} • Verified by ${log.approvedBy}</div>
                    <div style="margin:0; font-size:0.95rem; line-height:1.5;">${log.publicSummary}</div>
                </div>
            `;
        });
        html += '</div>';

        container.innerHTML = html;
    },


    async toggleSupervisor(auditorEmail, supervisorEmail) {
        if (!currentUser || !currentUser.isSuperAdmin) return;
        if (auditorEmail === supervisorEmail) {
            this.showToast("An auditor cannot supervise themselves.");
            return;
        }

        let sups = supervisorMap[auditorEmail] || [];
        if (sups.includes(supervisorEmail)) {
            sups = sups.filter(e => e !== supervisorEmail);
            this.showToast("Supervisor removed.");
        } else {
            sups.push(supervisorEmail);
            this.showToast("Supervisor added.");
        }

        try {
            await db.collection('supervisions').doc(auditorEmail).set({ supervisors: sups });
            supervisorMap[auditorEmail] = sups;
            this.renderUserRegistry();
        } catch (e) {
            console.error("Supervisor update error:", e);
        }
    },
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});




