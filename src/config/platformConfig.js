export const PLATFORM_CONFIG = {
    // DOSM Nominal GDP for Malaysia 2023 (~RM 1.82 Trillion)
    NOMINAL_GDP_MY_RM: 1820000000000,
    
    // Mission goal
    GDP_TARGET_PERCENT: 30,
    
    // Deployment / Roadmap dates
    IMPACT_ROADMAP_DATE: 'June 2027',
    
    // Alpha/Beta Status
    IS_ALPHA: true,
    
    // Default Supervisors for Audits
    DEFAULT_SUPERVISORS: [],

    // Role Definitions
    ROLES: {
        SUPER_ADMIN: 'isSuperAdmin',
        ADMIN: 'isAdmin',
        AUDITOR: 'isAuditor',
        OWNER: 'isOwner',
        CUSTOMER_SUCCESS: 'isCustomerSuccess'
    }
};
