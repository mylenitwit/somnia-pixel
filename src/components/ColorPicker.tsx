'use client';

import React, { useState, useEffect } from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';

interface ColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
}

// Modern, doygun renkler
const PREDEFINED_COLORS = [
  // Canlı Ana Renkler
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#5856D6', '#AF52DE',
  
  // Pastel Renkler
  '#FFD1DC', '#FFAAA5', '#FFD3B6', '#DCEDC1', '#A8E6CF', '#AA96DA', '#C7CEEA',
  
  // Neon Renkler
  '#FE019A', '#BC13FE', '#5961FF', '#00FFDD', '#00FF5B', '#FFE600', '#FF9900',
  
  // Grayscale
  '#FFFFFF', '#DDDDDD', '#999999', '#555555', '#111111', '#000000',
  
  // Transparent için özel değer
  'transparent',
];

const ColorPicker: React.FC<ColorPickerProps> = ({ selectedColor, onColorChange }) => {
  const [customColor, setCustomColor] = useState<string>(selectedColor);
  const [showCustomPicker, setShowCustomPicker] = useState<boolean>(false);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  
  // Seçilen renk değiştiğinde custom input'u güncelle
  useEffect(() => {
    setCustomColor(selectedColor);
  }, [selectedColor]);
  
  // Kullanıcı renk seçtiğinde
  const handleColorSelect = (color: string) => {
    onColorChange(color);
    
    // Son kullanılan renkleri güncelle
    if (color !== 'transparent' && !recentColors.includes(color)) {
      const updatedRecentColors = [color, ...recentColors.slice(0, 4)];
      setRecentColors(updatedRecentColors);
      // LocalStorage'a kaydet
      localStorage.setItem('recentColors', JSON.stringify(updatedRecentColors));
    }
  };
  
  // Özel renk değiştiğinde
  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColor(e.target.value);
  };
  
  // Özel renk seçildiğinde
  const handleCustomColorSelect = () => {
    onColorChange(customColor);
    // Son kullanılan renklere ekle
    handleColorSelect(customColor);
  };
  
  // Son kullanılan renkleri localStorage'dan yükle
  useEffect(() => {
    const savedRecentColors = localStorage.getItem('recentColors');
    if (savedRecentColors) {
      try {
        setRecentColors(JSON.parse(savedRecentColors));
      } catch (error) {
        console.error('Error parsing recent colors:', error);
      }
    }
  }, []);
  
  return (
    <div className="color-picker">
      <h3 className="color-picker-title">Colors</h3>
      
      <div className="grid grid-cols-5 gap-2 mb-4">
        {PREDEFINED_COLORS.map((color) => (
          <div
            key={color}
            onClick={() => handleColorSelect(color)}
            className={`color-swatch ${selectedColor === color ? 'selected' : ''}`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
      
      <div className="mt-4">
        <button 
          onClick={() => setShowCustomPicker(!showCustomPicker)}
          className="btn btn-secondary w-full mb-2"
        >
          {showCustomPicker ? 'Hide Custom Color Picker' : 'Choose Custom Color'}
        </button>
        
        {showCustomPicker && (
          <div className="mt-2 p-2 border border-gray-200 rounded-lg bg-white">
            <HexColorPicker 
              color={selectedColor} 
              onChange={onColorChange} 
              style={{ width: '100%', height: '160px' }} 
            />
            <div className="mt-2 flex items-center">
              <div className="mr-2">HEX:</div>
              <HexColorInput 
                color={selectedColor} 
                onChange={onColorChange} 
                prefixed 
                className="w-full p-1 border border-gray-300 rounded" 
              />
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 flex items-center">
        <div className="w-8 h-8 border border-gray-300 rounded mr-2" style={{ backgroundColor: selectedColor }} />
        <div className="text-sm">
          <div className="text-black font-medium">Selected Color</div>
          <div className="text-black font-medium">{selectedColor}</div>
        </div>
      </div>
    </div>
  );
};

export default ColorPicker; 