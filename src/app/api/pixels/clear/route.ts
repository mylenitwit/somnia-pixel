import { NextRequest, NextResponse } from 'next/server';
import { clearAllPixels } from '../route';

// Admin adreslerinin listesi (yetkili adresleri)
const ADMIN_ADDRESSES = ['0x794dab44e2bdaa6926f2428c7191f2ca0e24c3dd'];

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
      clearAllPixels();
      
      console.log("All pixels cleared successfully!");
      
      return NextResponse.json({ 
        success: true, 
        message: 'Canvas cleared successfully',
        pixelsRemaining: 0
      });
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