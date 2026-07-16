// ============================================================
// CLAIMSIGHT — Mock Users
// ============================================================

import type { User } from '@/types';

export const MOCK_USERS: User[] = [
  {
    id: 'usr-001',
    name: 'Marcus Webb',
    role: 'adjuster',
    email: 'mwebb@claimsight.io',
    avatarInitials: 'MW',
  },
  {
    id: 'usr-002',
    name: 'Diana Chen',
    role: 'adjuster',
    email: 'dchen@claimsight.io',
    avatarInitials: 'DC',
  },
  {
    id: 'usr-003',
    name: 'Robert Kim',
    role: 'adjuster',
    email: 'rkim@claimsight.io',
    avatarInitials: 'RK',
  },
  {
    id: 'usr-004',
    name: 'Sarah Okafor',
    role: 'adjuster',
    email: 'sokafor@claimsight.io',
    avatarInitials: 'SO',
  },
  {
    id: 'usr-005',
    name: 'James Thornton',
    role: 'admin',
    email: 'jthornton@claimsight.io',
    avatarInitials: 'JT',
  },
];

export const CURRENT_USER: User = MOCK_USERS[0];
