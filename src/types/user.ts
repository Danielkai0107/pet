import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string; // LINE User ID
  displayName: string;
  pictureUrl: string;
  email?: string;
  phone?: string;
  createdAt: Timestamp;
  role: 'customer' | 'admin';
}
