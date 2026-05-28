export interface Game {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  hasRanks: boolean;
}

export interface Role {
  id: string;
  name: string;
  gameId: string;
}

export interface Rank {
  id: string;
  name: string;
  tier: number;
  gameId: string;
}

export interface GameWithMeta extends Game {
  roles: Role[];
  ranks: Rank[];
}

export interface UserGame {
  game: Game;
  role: string;
  rankId: string;
  rankTier: number;
  isLookingNow: boolean;
  timeSlots?: string[];
}

export interface User {
  id: string;
  discordId: string;
  username: string;
  avatar: string;
  avatarSeed?: string;
  role?: string;
  bio: string;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
}

export interface Candidate extends User {
  games: UserGame[];
  generalTimeSlots?: string[];
  playHours?: PlayHours;
}

export interface Match {
  user: User;
  roomId: string;
  matchedAt: string;
  games: UserGame[];
  generalTimeSlots?: string[];
  playHours?: PlayHours;
}

export interface Message {
  id: string;
  content: string;
  sentAt: string;
  roomId: string;
  senderId: string;
  senderUsername: string;
  senderAvatar: string;
}

export interface TimeSlot {
  id: string;
  label: string;
  startHour: number;
  endHour: number;
}

export interface PlayHours {
  id: string;
  startHour: number;
  endHour: number;
  createdAt: string;
}

export interface Lobby {
  id: string;
  name: string;
  gameId: string;
  rankTier: string;
  createdAt: string;
  gameName?: string;
}

export interface LobbyMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: string;
}

export interface SwipeFilters {
  gameIds: string[];
  onlineOnly: boolean;
  rankTolerance: number;
  timeSlotIds: string[];
  playHoursStart?: number;
  playHoursEnd?: number;
}
