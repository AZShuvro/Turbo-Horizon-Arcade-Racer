/**
 * Mobile & Touch detection, Cross-browser Fullscreen API, and Landscape Orientation Lock helpers.
 */

export function isMobileOrTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const hasOnTouchStart = 'ontouchstart' in window;
  const hasTouchPoints =
    typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  const hasCoarsePointer =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  const isNarrowViewport = window.innerWidth <= 950;

  return hasOnTouchStart || hasTouchPoints || hasCoarsePointer || isNarrowViewport;
}

export function isFullscreenActive(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
    mozFullScreenElement?: Element | null;
    msFullscreenElement?: Element | null;
  };
  return Boolean(
    doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
  );
}

export async function enterFullscreenAndLandscape(): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
    mozRequestFullScreen?: () => Promise<void> | void;
    msRequestFullscreen?: () => Promise<void> | void;
  };

  let entered = isFullscreenActive();

  if (!entered) {
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
        entered = true;
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
        entered = true;
      } else if (el.mozRequestFullScreen) {
        await el.mozRequestFullScreen();
        entered = true;
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
        entered = true;
      }
    } catch {
      // Some browsers or embedded iframes block fullscreen; fail gracefully
    }
  }

  // Attempt landscape orientation lock for mobile racing view
  try {
    const orientation = window.screen?.orientation as
      | (ScreenOrientation & { lock?: (orientation: string) => Promise<void> })
      | undefined;
    if (orientation && typeof orientation.lock === 'function') {
      await orientation.lock('landscape');
    }
  } catch {
    // Orientation lock unsupported on desktop or non-fullscreen contexts
  }

  return entered || isFullscreenActive();
}

export async function exitFullscreenMode(): Promise<void> {
  if (typeof document === 'undefined') return;
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
    mozFullScreenElement?: Element | null;
    msFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void> | void;
    mozCancelFullScreen?: () => Promise<void> | void;
    msExitFullscreen?: () => Promise<void> | void;
  };

  try {
    if (doc.exitFullscreen && doc.fullscreenElement) {
      await doc.exitFullscreen();
    } else if (doc.webkitExitFullscreen && doc.webkitFullscreenElement) {
      await doc.webkitExitFullscreen();
    } else if (doc.mozCancelFullScreen && doc.mozFullScreenElement) {
      await doc.mozCancelFullScreen();
    } else if (doc.msExitFullscreen && doc.msFullscreenElement) {
      await doc.msExitFullscreen();
    }
  } catch {
    // Ignore errors when exiting fullscreen
  }

  try {
    const orientation = window.screen?.orientation as
      | (ScreenOrientation & { unlock?: () => void })
      | undefined;
    if (orientation && typeof orientation.unlock === 'function') {
      orientation.unlock();
    }
  } catch {
    // Ignore unlock errors
  }
}

export async function toggleFullscreenAndLandscape(): Promise<boolean> {
  if (isFullscreenActive()) {
    await exitFullscreenMode();
    return false;
  }
  return enterFullscreenAndLandscape();
}
