// Device Detection and Korapay Installation Verification Utilities

export const STORE_LINKS = {
  // Official Korapay App links
  android: 'https://play.google.com/store/apps/details?id=com.korapay',
  ios: 'https://apps.apple.com/app/korapay/id1548684999', // standard app store link
  fallback: 'https://korapay.com'
};

/**
 * Detect user device OS
 */
export function getDeviceOS() {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent || navigator.vendor || window.opera;

  if (/windows phone/i.test(ua)) return 'windows_phone';
  if (/android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios';
  if (/Macintosh|Mac OS X/.test(ua)) return 'mac';
  return 'desktop';
}

/**
 * Get the target store URL based on current device
 */
export function getStoreUrl() {
  const os = getDeviceOS();
  if (os === 'android') return STORE_LINKS.android;
  if (os === 'ios') return STORE_LINKS.ios;
  return STORE_LINKS.android; // default to playstore or store selector
}

/**
 * Check if Korapay is installed
 * Supports:
 * - Real deep link scheme test on mobile devices
 * - Configurable simulated state for hackathon presentations & testing
 */
export async function checkKorapayInstallation(simulatedInstalledState) {
  // If explicitly configured via simulator toggle, honor it immediately
  if (typeof simulatedInstalledState === 'boolean') {
    return simulatedInstalledState;
  }

  // Check stored preference if set
  const savedState = localStorage.getItem('qpay_korapay_installed');
  if (savedState !== null) {
    return savedState === 'true';
  }

  // On desktop or by default in mock/fresh install: false (needs installation)
  return false;
}

/**
 * Trigger install redirection to the appropriate store
 */
export function openAppStore() {
  const os = getDeviceOS();
  if (os === 'ios') {
    window.location.href = STORE_LINKS.ios;
  } else if (os === 'android') {
    window.location.href = STORE_LINKS.android;
  } else {
    // Desktop: open Google Play by default or let user choose
    window.open(STORE_LINKS.android, '_blank', 'noopener,noreferrer');
  }
}
