export const CURRENT_SEASON = {
    id: '2026_S1',
    name: 'Season 1: Genesis',
    startDate: '2026-04-01T00:00:00.000Z',
    endDate: '2026-12-31T23:59:59.000Z', // Genesis Season extended to year-end
    description: 'The founding season of the Conviction Network.'
};

export const BADGE_CATEGORIES = {
    'Seen':     { label: 'Seen',     icon: 'fa-binoculars',        color: '#3B82F6', description: 'Making for-good businesses discoverable through physical presence.' },
    'Verified': { label: 'Verified', icon: 'fa-shield-halved',     color: '#10B981', description: 'Supporting officially audited and verified impact.' },
    'Valued':   { label: 'Valued',   icon: 'fa-hand-holding-heart', color: '#F59E0B', description: 'Demonstrating financial commitment to for-good founders.' }
};

const SECTOR_MAP = {
    'Arts & Culture': 'fa-palette',
    'Business Support Services': 'fa-handshake-angle',
    'Cafe and Restaurants': 'fa-utensils',
    'Community': 'fa-users',
    'Ecological Stewardship': 'fa-earth-americas',
    'Education & Talent': 'fa-graduation-cap',
    'Finance': 'fa-coins',
    'Food Systems': 'fa-wheat-awn',
    'Gifts & Crafts': 'fa-gift',
    'Health & Wellness': 'fa-heart-pulse',
    'Housing & Living': 'fa-house-chimney',
    'Manufacturing & Logistics': 'fa-industry',
    'Personal Support Services': 'fa-user-gear',
    'Pets': 'fa-paw',
    'Repairs, Recycling & Sharing': 'fa-screwdriver-wrench',
    'Social Events': 'fa-calendar-day',
    'Sports': 'fa-volleyball',
    'Tourism & Nature': 'fa-leaf',
    'Transportation & Mobility': 'fa-bus'
};

const PRESENCE_TITLES = ['Curiosity', 'Patron', 'Visionary', 'Cultural Custodian'];
const FINANCIAL_TITLES = ['Ally', 'Benefactor', 'Creative Catalyst', 'Economic Pillar'];

const GENERATED_BADGES = [];

// 1. Generate Presence Journeys (Seen)
Object.entries(SECTOR_MAP).forEach(([sector, icon]) => {
    PRESENCE_TITLES.forEach((title, index) => {
        GENERATED_BADGES.push({
            id: `journey_seen_${sector.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${index}`,
            title, sector, category: 'Seen', icon,
            why: `Stage ${index + 1} of your ${sector} presence journey. Your consistent visits make these founders visible.`,
            how: `Visit a variable percentage of ${sector} businesses to unlock.`
        });
    });
});

// 2. Generate Financial Journeys (Valued)
Object.entries(SECTOR_MAP).forEach(([sector, icon]) => {
    FINANCIAL_TITLES.forEach((title, index) => {
        GENERATED_BADGES.push({
            id: `journey_valued_${sector.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${index}`,
            title, sector, category: 'Valued', icon,
            why: `Stage ${index + 1} of your ${sector} financial journey. Your verified purchases directly sustain this industry.`,
            how: `Complete verified purchases at a variable percentage of ${sector} businesses.`
        });
    });
});

// 3. Universal Journeys
const UNIVERSAL = [
    {
        id: 'journey_verified_universal',
        titles: ['The Impact Seeker', 'Verified Voyager', 'Transparency Trailblazer', 'Paradigm Pioneer'],
        category: 'Verified',
        icon: 'fa-shield-heart',
        why: 'Recognition of your commitment to officially verified impact businesses across the entire network.',
        how: 'Support verified businesses across the platform.'
    },
    {
        id: 'journey_ambassador',
        titles: ['The Scout', 'The Envoy', 'The Architect', 'The Network Legend'],
        category: 'Seen',
        icon: 'fa-handshake-angle',
        why: 'Rewarding your advocacy. You are not just a participant; you are an architect of the network.',
        how: 'Onboard new businesses by persuading owners and claiming the secret code.'
    }
];

UNIVERSAL.forEach(j => {
    j.titles.forEach((title, index) => {
        GENERATED_BADGES.push({
            id: `${j.id}_${index}`,
            title, category: j.category, icon: j.icon,
            why: j.why, how: j.how
        });
    });
});

export const BADGES_CONFIG = [
    ...GENERATED_BADGES,
    { 
        id: 'impact_carbon_crusader', title: 'Carbon Crusader', category: 'Verified', icon: 'fa-cloud-arrow-down',
        why: 'The network has verified your contribution to carbon removal.',
        how: 'Offset 10+ trees through verified purchases.'
    },
    { 
        id: 'impact_waste_warrior', title: 'Waste Warrior', category: 'Verified', icon: 'fa-trash-arrow-up',
        why: 'The network has verified your contribution to waste diversion.',
        how: 'Divert 50kg+ of waste through verified purchases.'
    }
];

export const evaluateTier = (userBadges) => {
    const totalUnlocked = Object.values(userBadges || {}).filter(b => b.unlocked).length;
    
    let tierName = 'Blue';
    let progress = 0;
    let totalNext = 10;
    let isMax = false;

    if (totalUnlocked >= 100) {
        tierName = 'Platinum';
        isMax = true;
        progress = 100;
        totalNext = 100;
    } else if (totalUnlocked >= 40) {
        tierName = 'Gold';
        totalNext = 100;
        progress = ((totalUnlocked - 40) / 60) * 100;
    } else if (totalUnlocked >= 10) {
        tierName = 'Silver';
        totalNext = 40;
        progress = ((totalUnlocked - 10) / 30) * 100;
    } else {
        progress = (totalUnlocked / 10) * 100;
    }

    return {
        name: tierName,
        badgeCount: totalUnlocked,
        progress,
        totalNext,
        isMax
    };
};

import scannerImg from '../assets/tutorial/scanner.png';
import recognitionImg from '../assets/tutorial/recognition.png';
import purchaseImg from '../assets/tutorial/purchase.png';
import successImg from '../assets/tutorial/success.png';

export const TUTORIAL_STEPS = [
    {
        title: "Step 1: Locate the Standee",
        icon: "fa-qrcode",
        text: "Look for the physical theBFG.team standee next to the cashier or counter. Scan the QR code to start.",
        color: "#3B82F6",
        image: scannerImg
    },
    {
        title: "Step 2: Selection",
        icon: "fa-hand-pointer",
        text: "Support them by checking in, or record your support by logging a purchase.",
        color: "#10B981",
        image: recognitionImg
    },
    {
        title: "Step 3: Log Purchase",
        icon: "fa-receipt",
        text: "When logging a purchase, enter the Receipt ID and the Total Amount (RM) from your bill.",
        color: "#F59E0B",
        image: purchaseImg
    },
    {
        title: "Step 4: Success!",
        icon: "fa-certificate",
        text: "Thank you for contributing to the growth of the conviction economy. Your activity is now securely recorded.",
        color: "#8B5CF6",
        image: successImg
    }
];
