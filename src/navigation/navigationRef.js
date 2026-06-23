import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * Shared navigation ref so components rendered OUTSIDE the navigator
 * (the global ongoing-call pill and the persistent CallProvider) can navigate
 * without a `navigation` prop.
 */
export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

export function getCurrentRouteName() {
  if (navigationRef.isReady()) {
    return navigationRef.getCurrentRoute()?.name;
  }
  return undefined;
}
