export const CURRENT_SEASON = {
    id: 'season_1',
    name: 'Season 1: Genesis',
    startDate: '2026-04-01T00:00:00.000Z',
    endDate: '2026-09-30T23:59:59.000Z',
    description: 'The founding season of the Conviction Network.'
};

export const BADGE_CATEGORIES = {
    'Seen':     { label: 'Seen',     icon: 'fa-binoculars',        color: '#3B82F6', description: 'Making for-good businesses discoverable.' },
    'Verified': { label: 'Verified', icon: 'fa-shield-halved',     color: '#10B981', description: 'Normalising audited impact as a benchmark.' },
    'Valued':   { label: 'Valued',   icon: 'fa-hand-holding-heart', color: '#F59E0B', description: 'Making founders feel noticed and appreciated.' }
};

export const BADGES_CONFIG = [
    // SEEN
    { 
        id: 'seen_first_step', title: 'The First Step', category: 'Seen', icon: 'fa-shoe-prints',
        description: 'Recorded your very first check-in.',
        why: 'Every journey begins with a single choice. This badge marks the moment you entered the empathy economy.',
        how: 'Automatically earned the first time you check-in to any Conviction Network business.'
    },
    { 
        id: 'seen_explorer', title: 'The Explorer', category: 'Seen', icon: 'fa-compass',
        description: 'Checked into 3 unique for-good businesses.',
        why: 'Discovery is the first step to making businesses visible. The more diverse your visits, the wider the network becomes.',
        how: 'Earned by checking in at 3 completely different business profiles.'
    },
    { 
        id: 'seen_pathfinder', title: 'The Pathfinder', category: 'Seen', icon: 'fa-route',
        description: 'Checked into 7 unique for-good businesses.',
        why: 'You are actively mapping the empathy economy. Every new door you open makes that business more visible to others.',
        how: 'Earned by checking in at 7 completely different business profiles.'
    },
    { 
        id: 'seen_cartographer', title: 'The Cartographer', category: 'Seen', icon: 'fa-map',
        description: 'Checked into 15 unique for-good businesses.',
        why: 'You are drawing the map of the empathy economy. Founders across the city know they are being seen.',
        how: 'Earned by checking in at 15 completely different business profiles.'
    },
    { 
        id: 'seen_nomad', title: 'Neighborhood Nomad', category: 'Seen', icon: 'fa-map-location-dot',
        description: 'Visited businesses in 3 different locations.',
        why: 'Crossing district lines to support for-good businesses is the physical effort that makes the network real.',
        how: 'Earned by checking in at businesses located in 3 distinct areas.'
    },
    { 
        id: 'seen_wanderer', title: 'State Wanderer', category: 'Seen', icon: 'fa-earth-asia',
        description: 'Supported businesses in 2 or more states.',
        why: 'When the empathy economy crosses state borders, it becomes a national movement.',
        how: 'Earned by checking in at businesses in at least 2 different states.'
    },
    { 
        id: 'seen_pioneer', title: 'The Pioneer', category: 'Seen', icon: 'fa-flag',
        description: 'One of the first to visit a newly listed business.',
        why: 'New businesses are fragile. Being among the first visitors gives founders the confidence that they are seen.',
        how: 'Earned by checking in within 30 days of a business being added to the network.'
    },
    { 
        id: 'seen_sector_specialist', title: 'Sector Specialist', category: 'Seen', icon: 'fa-layer-group',
        description: 'Supported businesses across 3 different industries.',
        why: 'A diverse empathy economy is a resilient economy. Supporting multiple sectors builds a broad foundation.',
        how: 'Earned by checking in at businesses in 3+ different sectors (e.g. F&B, Retail, Services).'
    },
    { 
        id: 'seen_night_owl', title: 'Night Owl', category: 'Seen', icon: 'fa-moon',
        description: 'Checked in after 8 PM.',
        why: 'Evening support keeps businesses alive beyond the daytime rush. You showed up when others went home.',
        how: 'Earned by recording a check-in after 8:00 PM local time.'
    },
    { 
        id: 'seen_early_bird', title: 'Early Bird', category: 'Seen', icon: 'fa-sun',
        description: 'Checked in before 9 AM.',
        why: 'Starting the day with an empathetic choice sets the tone. You are part of the morning crew that keeps founders going.',
        how: 'Earned by recording a check-in before 9:00 AM local time.'
    },

    // VERIFIED
    { 
        id: 'verified_eco_warrior', title: 'Eco-Warrior', category: 'Verified', icon: 'fa-leaf',
        description: 'Visited 3 businesses with an Environment "A" score.',
        why: 'By choosing verified green businesses, you signal that environmental commitment is worth paying for.',
        how: 'Earned by checking in at 3 different businesses with an Environment paradigm score of "A".'
    },
    { 
        id: 'verified_eco_champion', title: 'Eco-Champion', category: 'Verified', icon: 'fa-seedling',
        description: 'Visited 7 businesses with an Environment "A" score.',
        why: 'Deep environmental commitment, repeated across many businesses, builds the trust infrastructure for green GDP.',
        how: 'Earned by checking in at 7 different businesses with an Environment paradigm score of "A".'
    },
    { 
        id: 'verified_social_hero', title: 'Social Hero', category: 'Verified', icon: 'fa-users',
        description: 'Visited 3 businesses with a Social "A" score.',
        why: 'Social equity is the backbone of a fair economy. Your support validates businesses that invest in people.',
        how: 'Earned by checking in at 3 different businesses with a Social paradigm score of "A".'
    },
    { 
        id: 'verified_social_sentinel', title: 'Social Sentinel', category: 'Verified', icon: 'fa-shield-heart',
        description: 'Visited 7 businesses with a Social "A" score.',
        why: 'Sustained support for socially excellent businesses drives systemic change, not just good feelings.',
        how: 'Earned by checking in at 7 different businesses with a Social paradigm score of "A".'
    },
    { 
        id: 'verified_purist', title: 'The Purist', category: 'Verified', icon: 'fa-gem',
        description: 'Visited a business with a perfect AAAAA score.',
        why: 'Total commitment to the BFG paradigm is rare. By visiting, you prove that perfection is worth the journey.',
        how: 'Earned by checking in at any business with a perfect AAAAA paradigm score.'
    },
    { 
        id: 'verified_idealist', title: 'The Idealist', category: 'Verified', icon: 'fa-star',
        description: 'Visited 3 businesses with a perfect AAAAA score.',
        why: 'You are building a portfolio of perfection. This signals to the market that the highest standard of impact is valued.',
        how: 'Earned by checking in at 3 different businesses with a perfect AAAAA paradigm score.'
    },
    { 
        id: 'verified_initiative_ally', title: 'Initiative Ally', category: 'Verified', icon: 'fa-bullhorn',
        description: 'Participated in a platform initiative.',
        why: 'Initiatives are how the network moves together. Your participation amplifies collective impact.',
        how: 'Earned by actively participating in at least 1 Conviction Network initiative.'
    },
    { 
        id: 'verified_zero_waste', title: 'Zero Waste Partner', category: 'Verified', icon: 'fa-recycle',
        description: 'Checked in 5 times at businesses with waste reduction programs.',
        why: 'Waste diversion is measurable impact. Repeat visits to waste-conscious businesses sustain their mission.',
        how: 'Earned by recording 5 check-ins at businesses with high Environment paradigm scores.'
    },

    // VALUED
    { 
        id: 'valued_weekend', title: 'Weekend Philanthropist', category: 'Valued', icon: 'fa-calendar-check',
        description: 'Showed up on your time off.',
        why: 'Choosing to support a for-good business on your day off tells the founder: "You matter enough for my free time."',
        how: 'Earned by recording a check-in or purchase on any Saturday or Sunday.'
    },
    { 
        id: 'valued_weekend_regular', title: 'Weekend Regular', category: 'Valued', icon: 'fa-calendar-week',
        description: 'Showed up on 4 separate weekends.',
        why: 'One weekend is a nice gesture. Four weekends is a relationship. Founders notice who comes back.',
        how: 'Earned by recording activity on 4 distinct weekend days (Saturdays or Sundays).'
    },
    { 
        id: 'valued_weekly_pulse', title: 'The Weekly Pulse', category: 'Valued', icon: 'fa-heart-pulse',
        description: 'Recorded 4 or more activities in a single week.',
        why: 'When you visit 4 times in one week, the empathy economy has a heartbeat. You are the pulse.',
        how: 'Earned by logging 4+ check-ins or purchases within a single calendar week (Mon-Sun).'
    },
    { 
        id: 'valued_streak_bronze', title: 'Empathy Streak', category: 'Valued', icon: 'fa-fire',
        tier: 'Bronze', tierGroup: 'empathy_streak',
        description: '2 consecutive weeks of activity.',
        why: 'Consistency is how habits form. Two weeks of showing up means the empathy economy is becoming part of your life.',
        how: 'Earned by recording at least 1 activity per week for 2 consecutive weeks.'
    },
    { 
        id: 'valued_streak_silver', title: 'Empathy Streak', category: 'Valued', icon: 'fa-fire',
        tier: 'Silver', tierGroup: 'empathy_streak',
        description: '4 consecutive weeks of activity.',
        why: 'A month of unbroken support. Founders are starting to rely on people like you.',
        how: 'Earned by recording at least 1 activity per week for 4 consecutive weeks.'
    },
    { 
        id: 'valued_streak_gold', title: 'Empathy Streak', category: 'Valued', icon: 'fa-fire',
        tier: 'Gold', tierGroup: 'empathy_streak',
        description: '8 consecutive weeks of activity.',
        why: 'Two months of unbroken commitment. You are the foundation the empathy economy is built on.',
        how: 'Earned by recording at least 1 activity per week for 8 consecutive weeks.'
    },
    { 
        id: 'valued_local_legend', title: 'Local Legend', category: 'Valued', icon: 'fa-store',
        tier: null, tierGroup: 'local_loyalty',
        description: '5 visits to the same business.',
        why: 'When the barista knows your name, the empathy economy has a face. You are making one founder feel truly seen.',
        how: 'Earned by recording 5 check-ins at a single business.'
    },
    { 
        id: 'valued_local_anchor', title: 'Local Anchor', category: 'Valued', icon: 'fa-anchor',
        tier: null, tierGroup: 'local_loyalty',
        description: '15 visits to the same business.',
        why: 'You are the anchor that keeps a small business grounded. They know you, and they count on you.',
        how: 'Earned by recording 15 check-ins at a single business.'
    },
    { 
        id: 'valued_local_family', title: 'Local Family', category: 'Valued', icon: 'fa-house-heart',
        tier: null, tierGroup: 'local_loyalty',
        description: '30 visits to the same business.',
        why: 'You are not a customer anymore. You are family. This is what being valued truly means.',
        how: 'Earned by recording 30 check-ins at a single business.'
    },
    { 
        id: 'valued_consummate', title: 'Consummate Supporter', category: 'Valued', icon: 'fa-basket-shopping',
        description: 'Recorded 10 separate purchases.',
        why: 'Every purchase is a vote. Ten votes says you are committed to keeping the empathy economy alive.',
        how: 'Earned by logging 10 valid purchase receipts across any Conviction Network business.'
    },
    { 
        id: 'valued_community_builder', title: 'Community Builder', category: 'Valued', icon: 'fa-people-group',
        description: 'Helped expand the network.',
        why: 'The network is only as strong as its nodes. You are actively expanding the reach of empathetic commerce.',
        how: 'Earned by successfully referring a friend or executing a Group Check-in.'
    },
    { 
        id: 'valued_the_bridge', title: 'The Bridge', category: 'Valued', icon: 'fa-bridge',
        description: 'Referred 3 people to the network.',
        why: 'You are the bridge between the old economy and the empathy economy. Three connections and growing.',
        how: 'Earned by successfully referring 3 new members to the Conviction Network.'
    },
    { 
        id: 'valued_monday_motivator', title: 'Monday Motivator', category: 'Valued', icon: 'fa-mug-hot',
        description: 'Made a check-in on a Monday.',
        why: 'Mondays are hard. Choosing empathy on the hardest day of the week is a statement of intent.',
        how: 'Earned by recording a check-in on any Monday.'
    },
    { 
        id: 'valued_the_returnee', title: 'The Returnee', category: 'Valued', icon: 'fa-rotate-left',
        description: 'Came back after 30+ days away.',
        why: 'Life gets busy. Coming back after a break shows that the empathy economy is still part of who you are.',
        how: 'Earned by recording an activity after 30 or more days of inactivity.'
    }
];


import scannerImg from '../assets/tutorial/scanner.png';
import recognitionImg from '../assets/tutorial/recognition.png';
import purchaseImg from '../assets/tutorial/purchase.png';
import successImg from '../assets/tutorial/success.png';

// NOTE: These images are actual app screenshots. Please recapture and update them 
// in src/assets/tutorial/ whenever the UI for the Scanner, Purchase Form, 
// or Success screen is modified to maintain visual consistency.
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
        text: "Thank you for contributing to the growth of the empathy economy. Your activity is now securely recorded.",
        color: "#8B5CF6",
        image: successImg
    }
];

export const evaluateTier = (userBadges) => {
    let totalUnlocked = 0;
    const categoryCounts = { 'Seen': 0, 'Verified': 0, 'Valued': 0 };
    
    BADGES_CONFIG.forEach(b => {
        if (userBadges && userBadges[b.id] && userBadges[b.id].unlocked) {
            totalUnlocked++;
            if (categoryCounts[b.category] !== undefined) {
                categoryCounts[b.category]++;
            }
        }
    });

    const isMastery = (cat) => categoryCounts[cat] >= 3;

    let tierName = 'Blue';
    let progress = 0;
    let badgeCount = totalUnlocked;
    let totalNext = 5;
    let missingCats = [];
    let isMax = false;

    if (totalUnlocked >= 5) {
        if (isMastery('Seen')) {
            tierName = 'Silver';
            totalNext = 15;
            if (totalUnlocked >= 15) {
                if (isMastery('Seen') && isMastery('Verified') && isMastery('Valued')) {
                    tierName = 'Gold';
                    totalNext = 30;
                    if (totalUnlocked >= 30) {
                        tierName = 'Platinum';
                        isMax = true;
                        progress = 100;
                        totalNext = 30;
                    } else {
                        progress = ((totalUnlocked - 15) / 15) * 100;
                    }
                } else {
                    missingCats = ['Seen', 'Verified', 'Valued'].filter(c => !isMastery(c));
                    progress = 100;
                }
            } else {
                progress = ((totalUnlocked - 5) / 10) * 100;
            }
        } else {
            missingCats = ['Seen'];
            progress = 100;
        }
    } else {
        progress = (totalUnlocked / 5) * 100;
    }

    return {
        name: tierName,
        badgeCount,
        progress,
        totalNext,
        missingCats,
        categoryCounts,
        isMax
    };
};
