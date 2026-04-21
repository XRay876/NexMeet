export type Role = "Member" | "Guest" | "Unknown";

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: string[] | null;
}

export interface AuthData {
  userId?: string;
  accessToken: string;
  displayName?: string;
  avatarUrl?: string | null;
  themePreference?: string;
  createdAt?: string;
}

export interface JwtClaims {
  exp?: number;
  unique_name?: string;
  name?: string;
  role?: Role;
  meeting_code?: string;
  sub?: string;
  nameid?: string;
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"?: Role;
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"?: string;
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"?: string;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  ownerId: string;
  isActive: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderUserId: string;
  senderDisplayName: string;
  text: string;
  createdAt: string;
}

export interface SharedFile {
  id: string;
  roomId: string;
  uploaderUserId: string;
  uploaderDisplayName: string;
  originalFileName: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

export interface HistoryResponse {
  messages: ChatMessage[];
  files: SharedFile[];
}

export interface IceServerResponse {
  iceServers: RTCIceServer[];
}

export interface UserProfile {
  id: string;
  login: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  themePreference: string;
  createdAt: string;
}
