// src/pages/CsvMapping/components/MainFieldsSection.js
// 基本項目マッピングセクションコンポーネント（headerName直接版）

import React from 'react';

const MainFieldsSection = ({ mappingConfig, updateMainFieldMapping, parsedHeaders }) => {
  console.log('🔥 MainFieldsSection: 受け取ったmappingConfig:', mappingConfig);
  
  const safeMainFields = mappingConfig?.mainFields || {};
  const allItems = [
    ...(mappingConfig?.incomeItems || []),
    ...(mappingConfig?.deductionItems || []),
    ...(mappingConfig?.attendanceItems || []),
    ...(mappingConfig?.itemCodeItems || []),
    ...(mappingConfig?.kyItems || [])
  ];
  
  console.log('🔥 MainFieldsSection: allItemsの最初の3個:', allItems.slice(0, 3));
  
  // データ構造はそのまま使用（自動修正は行わない）
  const fixedItems = allItems;
  
  console.log('🔧 アイテムをそのまま使用（最初の3個）:', fixedItems.slice(0, 3));
  
  // 記号（headerName）を表示するように変更
  const availableSymbols = fixedItems.map(item => item.headerName).filter(s => s && s.trim());
  
  // mainFieldsから正しい記号を取得するヘルパー関数
  const getSymbolFromMainField = (mainField) => {
    if (!mainField) return '';
    
    // mainField.headerNameが記号の場合はそのまま返す
    if (mainField.headerName && mainField.headerName.startsWith('KY')) {
      return mainField.headerName;
    }
    
    // mainField.headerNameが日本語の場合、同じcolumnIndexのfixedItemsから記号を探す
    if (mainField.columnIndex >= 0) {
      const matchedItem = fixedItems.find(item => item.columnIndex === mainField.columnIndex);
      return matchedItem?.headerName || '';
    }
    
    return '';
  };
  
  // 表示用の項目名を取得するヘルパー関数
  const getDisplayNameFromSymbol = (symbol) => {
    if (!symbol) return symbol;
    const matchedItem = fixedItems.find(item => item.headerName === symbol);
    return matchedItem?.itemName || symbol;
  };
  
  console.log('🔍 基本項目マッピング（記号版）:');
  console.log('- 利用可能な記号（headerName）:', availableSymbols);
  console.log('- 利用可能な記号（最初の10個）:', availableSymbols.slice(0, 10));
  console.log('- mainFields:', safeMainFields);
  console.log('- 全項目数:', allItems.length);
  console.log('- 全項目（最初の3個）:', allItems.slice(0, 3));

  return (
    <div className="bg-white p-6 border border-gray-200 rounded-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">基本項目マッピング</h3>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              識別コード
            </label>
            <select
              value={getSymbolFromMainField(safeMainFields.identificationCode)}
              onChange={(e) => updateMainFieldMapping('identificationCode', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">選択してください</option>
              {availableSymbols.map((symbol, index) => (
                <option key={index} value={symbol}>{symbol} - {getDisplayNameFromSymbol(symbol)}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              従業員コード
            </label>
            <select
              value={getSymbolFromMainField(safeMainFields.employeeCode)}
              onChange={(e) => updateMainFieldMapping('employeeCode', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">選択してください</option>
              {availableSymbols.map((symbol, index) => (
                <option key={index} value={symbol}>{symbol} - {getDisplayNameFromSymbol(symbol)}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              従業員氏名
            </label>
            <select
              value={getSymbolFromMainField(safeMainFields.employeeName)}
              onChange={(e) => updateMainFieldMapping('employeeName', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">選択してください</option>
              {availableSymbols.map((symbol, index) => (
                <option key={index} value={symbol}>{symbol} - {getDisplayNameFromSymbol(symbol)}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              支給額
            </label>
            <select
              value={getSymbolFromMainField(safeMainFields.totalSalary)}
              onChange={(e) => updateMainFieldMapping('totalSalary', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">選択してください</option>
              {availableSymbols.map((symbol, index) => (
                <option key={index} value={symbol}>{symbol} - {getDisplayNameFromSymbol(symbol)}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              控除額
            </label>
            <select
              value={getSymbolFromMainField(safeMainFields.totalDeductions)}
              onChange={(e) => updateMainFieldMapping('totalDeductions', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">選択してください</option>
              {availableSymbols.map((symbol, index) => (
                <option key={index} value={symbol}>{symbol} - {getDisplayNameFromSymbol(symbol)}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              差引支給額
            </label>
            <select
              value={getSymbolFromMainField(safeMainFields.netSalary)}
              onChange={(e) => updateMainFieldMapping('netSalary', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">選択してください</option>
              {availableSymbols.map((symbol, index) => (
                <option key={index} value={symbol}>{symbol} - {getDisplayNameFromSymbol(symbol)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainFieldsSection;
