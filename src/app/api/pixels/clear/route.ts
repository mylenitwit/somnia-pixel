import { NextRequest, NextResponse } from 'next/server';
import { clearAllPixels } from '../lib';

// Global variables
declare global {
  var pixelData: any[];
  var _pixelsInitialized: boolean;
  var _preventTestPixels: boolean;
}

// Admin adreslerinin listesi (yetkili adresleri)
const ADMIN_ADDRESSES = ['0x794dab44e2bdaa6926f2428c7191f2ca0e24c3dd'];

// OPTIONS request handler for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// POST request handler to clear all pixels
export async function POST(request: Request) {
  console.log("POST /api/pixels/clear called");
  
  try {
    // Daha güvenli bir şekilde JSON parse et
    let bodyText;
    try {
      bodyText = await request.text();
      const body = JSON.parse(bodyText);
      const { adminAddress } = body;
      
      console.log("Clear request from:", adminAddress);
      
      // Basic admin check
      if (!adminAddress || !adminAddress.startsWith('0x')) {
        return new NextResponse(
          JSON.stringify({ error: 'Unauthorized', details: 'Admin address required' }),
          { 
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        );
      }
      
      // Clear all pixels
      console.log("Clearing all pixels...");
      clearAllPixels();
      
      // Also clear global variable
      if (global.pixelData) {
        global.pixelData = [];
      }
      
      console.log("All pixels cleared successfully");
      return new NextResponse(
        JSON.stringify({ success: true, message: 'All pixels cleared' }),
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store, max-age=0'
          }
        }
      );
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Raw body:", bodyText);
      return new NextResponse(
        JSON.stringify({ error: 'Invalid JSON format', details: String(parseError) }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
  } catch (error) {
    console.error("Error clearing pixels:", error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to clear pixels', details: String(error) }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
} 