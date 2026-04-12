/**
 * usePermissions – Astrologer App
 *
 * A simple hook that returns the permissions object from permissions.json.
 * Usage:
 *   const { can } = usePermissions();
 *   if (!can('more_kundali')) return null;
 */
import permissions from '../config/permissions.json';

export const usePermissions = () => {
  /**
   * can(key) → boolean
   * Returns true if the feature is enabled, defaults to true if key not found.
   */
  const can = (key) => {
    if (key in permissions) return permissions[key] === true;
    return true; // default: allow if not listed
  };

  return { can, permissions };
};

export default usePermissions;
