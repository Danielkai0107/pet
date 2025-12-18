export interface Pet {
  id: string;
  name: string;
  species: string; // 寵物種類，如：狗、貓、兔子
  size: string; // 體型，如：小型、中型、大型
  breed?: string; // 品種（選填）
  photoUrl?: string; // 照片（選填）
  notes?: string; // 備註
  createdAt?: any; // Firestore Timestamp
}
