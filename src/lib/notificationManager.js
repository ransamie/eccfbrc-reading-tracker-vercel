// Utility for Web Push Notifications & Daily Reporting Reminders

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    return { success: false, status: 'unsupported' };
  }

  try {
    const permission = await Notification.requestPermission();
    return { success: permission === 'granted', status: permission };
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return { success: false, status: 'error', error };
  }
}

export async function sendLocalNotification({
  title = "ECCF Reading Tracker",
  body = "Time to record daily Bible reading updates for your team! 📖",
  tag = "daily-reminder",
  url = "/",
  icon = "/icon-192x192.png",
  badge = "/icon-192x192.png"
} = {}) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const options = {
    body,
    icon,
    badge,
    tag,
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url },
    actions: [
      { action: "open", title: "Update Team 📝" },
      { action: "dismiss", title: "Dismiss ✕" }
    ]
  };

  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration && registration.showNotification) {
      await registration.showNotification(title, options);
      return true;
    } else {
      // Fallback to legacy Notification constructor if service worker ready unavailable
      new Notification(title, options);
      return true;
    }
  } catch (err) {
    console.warn("Failed to trigger notification via Service Worker:", err);
    try {
      new Notification(title, options);
      return true;
    } catch (fallbackErr) {
      console.error("Native notification failed:", fallbackErr);
      return false;
    }
  }
}

// Storage helpers for user reminder preferences
export const REMINDER_STORAGE_KEY = 'eccf_reminders_settings_v1';

export function getStoredReminderSettings() {
  if (typeof window === 'undefined') {
    return {
      enabled: false,
      morningReminder: true,
      eveningReminder: true,
      closingAlert: true,
      morningTime: "07:00",
      eveningTime: "20:00"
    };
  }

  try {
    const raw = localStorage.getItem(REMINDER_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Could not load reminder settings from localStorage:", e);
  }

  return {
    enabled: false,
    morningReminder: true,
    eveningReminder: true,
    closingAlert: true,
    morningTime: "07:00",
    eveningTime: "20:00"
  };
}

export function saveStoredReminderSettings(settings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn("Could not save reminder settings to localStorage:", e);
  }
}
