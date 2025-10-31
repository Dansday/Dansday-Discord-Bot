import { PERMISSIONS } from "../../config.js";

// Check if member has a specific role
function hasRole(member, roleId) {
    return member.roles.cache.has(roleId);
}

// Check if user has admin role
export function isAdmin(member) {
    return hasRole(member, PERMISSIONS.ADMIN_ROLE);
}

// Check if user has staff role
export function isStaff(member) {
    return hasRole(member, PERMISSIONS.STAFF_ROLE);
}

// Check if user has member role
export function isMember(member) {
    return hasRole(member, PERMISSIONS.MEMBER_ROLE);
}

// Check permission for specific action
export function hasPermission(member, action) {
    // Admin has all permissions
    if (isAdmin(member)) {
        return true;
    }

    // Staff permissions: all interfaces except pause
    // Actions: status, help, send_message, inactive (but not pause or setup)
    if (isStaff(member)) {
        return action !== 'pause' && action !== 'setup';
    }

    // Member permissions: status, help, and booster_role
    if (isMember(member)) {
        return action === 'status' || action === 'help' || action === 'booster_role';
    }

    // No permission
    return false;
}

// Get permission error message
export function getPermissionError(action) {
    return `❌ You don't have permission to use ${action}.`;
}
