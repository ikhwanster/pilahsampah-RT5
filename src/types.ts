/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'citizen';

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  address: string; // Will be encrypted in persistent file DB, decrypted on load for authenticated users
  phone: string;   // Will be encrypted in persistent file DB, decrypted on load for authenticated users
  points: number;
  totalTrashWeight: number; // in kg
  createdAt: string;
}

export type TrashCategory = 'organic' | 'plastic' | 'paper' | 'metal' | 'glass' | 'other';

export interface TrashDeposit {
  id: string;
  userId: string;
  userName: string;
  category: TrashCategory;
  weight: number; // in kg
  pointsEarned: number;
  date: string; // YYYY-MM-DD
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  createdAt: string;
  approvedAt?: string;
}

export interface RewardItem {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  stock: number;
  image?: string;
}

export interface RewardClaim {
  id: string;
  userId: string;
  userName: string;
  rewardId: string;
  rewardTitle: string;
  pointsCost: number;
  status: 'pending' | 'completed';
  claimedAt: string;
}

export interface CleanupFeedback {
  id: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  serviceType: 'pickup' | 'cleanliness' | 'app';
  createdAt: string;
}

export interface PickupSchedule {
  id: string;
  day: string; // e.g., "Senin", "Rabu", "Sabtu"
  time: string; // e.g., "08:00 - 10:00"
  category: string; // e.g., "Organik", "Anorganik", "Semua Jenis"
  notes?: string;
}

export interface SystemNotification {
  id: string;
  userId: string;
  message: string;
  type: 'points_earned' | 'reward_status' | 'schedule_reminder' | 'general';
  isRead: boolean;
  createdAt: string;
}

export interface DBState {
  users: Record<string, User & { passwordHash: string }>;
  deposits: TrashDeposit[];
  rewards: RewardItem[];
  claims: RewardClaim[];
  feedbacks: CleanupFeedback[];
  schedules: PickupSchedule[];
  notifications: SystemNotification[];
}
