export interface AIPrompt {
  id: string;
  title: string;
  prompt: string;
  imageUrl: string;
  category: string;
  createdAt: any;
  likesCount: number;
  viewsCount?: number;
  copiesCount?: number;
}

export interface Shayari {
  id: string;
  content: string;
  category: string;
  createdAt: any;
  likesCount: number;
}

export interface Like {
  id: string;
  itemId: string;
  type: 'prompt' | 'shayari';
  addedAt: any;
}

export type Category = string;

export interface UserProfile {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
}
