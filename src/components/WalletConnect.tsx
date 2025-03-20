'use client';

import * as React from 'react';

interface WalletConnectProps {
  account: string | null;
  onConnect: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const WalletConnect: React.FC<WalletConnectProps> = ({ account, onConnect, loading, error }) => {
  // Adres formatını kısalt
  const shortenAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-400 w-full mx-auto">
      {!account ? (
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-3 text-gray-900">Cüzdanınızı Bağlayın</h2>
          <p className="mb-4 text-gray-800">
            Pixel Canvas'e katılmak için MetaMask cüzdanınızı bağlayın
          </p>
          <button
            onClick={onConnect}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-full"
          >
            {loading ? 'Bağlanıyor...' : 'MetaMask ile Bağlan'}
          </button>
          
          {error && (
            <div className="mt-3 text-red-600 text-sm font-medium">
              <p>{error}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <span className="text-gray-700 block text-sm">Bağlı Cüzdan:</span>
            <span className="font-mono font-medium text-gray-900">{shortenAddress(account)}</span>
          </div>
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium border border-green-200">
            Bağlandı
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletConnect; 