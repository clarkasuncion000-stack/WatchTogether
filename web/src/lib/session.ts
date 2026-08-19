export interface UserSession {
  userId: string;
  displayName: string;
}

const STORAGE_KEY = "watch_together_session";

const ADJECTIVES = [
  "Cyber", "Cosmic", "Neon", "Solar", "Lunar", 
  "Astra", "Velox", "Hyper", "Pixel", "Quantum", 
  "Retro", "Zenith", "Vivid", "Stellar", "Sonic"
];

const NOUNS = [
  "Panda", "Falcon", "Otter", "Phoenix", "Voyager", 
  "Vortex", "Runner", "Rider", "Surfer", "Drifter", 
  "Spark", "Beacon", "Pioneer", "Echo", "Wave"
];

export function generateRandomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${adj}${noun}${num}`;
}

export function generateUserId(): string {
  return `usr_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
}

export function getOrCreateSession(): UserSession {
  if (typeof window === "undefined") {
    return { userId: "ssr_user", displayName: "Guest" };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.userId && parsed.displayName) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Failed to parse stored user session", err);
  }

  const newSession: UserSession = {
    userId: generateUserId(),
    displayName: generateRandomName(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
  } catch (err) {
    console.warn("Failed to persist user session", err);
  }

  return newSession;
}

export function updateDisplayName(newDisplayName: string): UserSession {
  const current = getOrCreateSession();
  const updated: UserSession = {
    ...current,
    displayName: newDisplayName.trim() || generateRandomName(),
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn("Failed to update user session", err);
    }
  }

  return updated;
}
