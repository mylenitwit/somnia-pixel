// Pixel veri yapısı tanımı
export interface Pixel {
  x: number;
  y: number;
  color: string | number;
  owner: string; // Ethereum adresi
  transactionHash?: string;
  updatedAt?: string;
} 