import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import clientPromise from '@/lib/mongodb';

// Admin adreslerinin listesi (yetkili adresleri)
const ADMIN_ADDRESSES = ['0x794dab44e2bdaa6926f2428c7191f2ca0e24c3dd'];

// Piksel koleksiyonu adı
const COLLECTION_NAME = 'pixels';

// Pikselleri temizle
const clearAllPixels = async (): Promise<boolean> => {
  try {
    console.log('Tüm pikseller temizleniyor (MongoDB)');
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection(COLLECTION_NAME);
    
    // Tüm belgeleri sil
    const result = await collection.deleteMany({});
    console.log(`${result.deletedCount} piksel silindi`);
    return true;
  } catch (error) {
    console.error('MongoDB piksel temizleme hatası:', error);
    return false;
  }
};

// Tüm pikselleri temizleyen endpoint
export async function POST(request: NextRequest) {
  console.log("Canvas clearing API called");
  
  try {
    // Request body'den admin adresini al
    const requestData = await request.json();
    const adminAddress = requestData.adminAddress?.toLowerCase() || '';
    
    console.log("Received clear request from address:", adminAddress);
    console.log("Admin whitelist (lowercase):", ADMIN_ADDRESSES.map(addr => addr.toLowerCase()));
    console.log("Original request address:", requestData.adminAddress);
    
    // Adresi kontrol et (case-insensitive olarak)
    const isAdmin = ADMIN_ADDRESSES.some(
      addr => addr.toLowerCase() === adminAddress
    );
    
    if (!isAdmin) {
      console.log("Unauthorized clear attempt by:", adminAddress);
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }
    
    // Veritabanını temizle
    console.log("ADMIN ACCESS GRANTED - CLEARING ALL PIXELS");
    
    try {
      // Piksel verilerini temizle
      const success = await clearAllPixels();
      
      if (success) {
        console.log("All pixels cleared successfully!");
        
        return NextResponse.json({ 
          success: true, 
          message: 'Canvas cleared successfully',
          pixelsRemaining: 0
        });
      } else {
        return NextResponse.json(
          { error: 'Database clearing operation failed' },
          { status: 500 }
        );
      }
    } catch (clearError) {
      console.error("Error during pixel clearing:", clearError);
      return NextResponse.json(
        { error: 'Server error while clearing canvas', details: String(clearError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Canvas clear API error:", error);
    return NextResponse.json(
      { error: 'Invalid request or server error' },
      { status: 400 }
    );
  }
} 