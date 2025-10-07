"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

interface AutocompleteItem {
  type: string;
  itemName: string;
  itemNumber: string;
  itemBrand?: string;
  itemType?: string;
  count: number;
  displayText: string;
  secondaryText: string;
}

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: AutocompleteItem) => void;
  onAutoFill?: (suggestion: AutocompleteItem) => void; // 自动填充回调
  placeholder?: string;
  type: "name" | "number"; // name: 按商品名称搜索, number: 按货号搜索
  className?: string;
  autoFillOnBlur?: boolean; // 是否在失去焦点时自动填充
}

export function AutocompleteInput({
  value,
  onChange,
  onSelect,
  onAutoFill,
  placeholder,
  type,
  className,
  autoFillOnBlur = false,
}: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = React.useState<AutocompleteItem[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState(value);
  const [hasManualSelection, setHasManualSelection] = React.useState(false); // 跟踪是否手动选择过

  // 防抖搜索
  const searchTimeoutRef = React.useRef<NodeJS.Timeout>();

  const handleSearch = async (searchValue: string) => {
    if (searchValue.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/items/autocomplete?q=${encodeURIComponent(searchValue)}&type=${type}`
      );
      const data = await response.json();
      setSuggestions(data.suggestions || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error("自动补全搜索失败:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 同步外部 value 到内部状态
  React.useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleInputChange = (newValue: string) => {
    setInternalValue(newValue);
    onChange(newValue);
    
    // 用户开始新的输入时，重置手动选择标志
    setHasManualSelection(false);

    // 清除之前的搜索定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // 设置新的搜索定时器（防抖）
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(newValue);
    }, 300);
  };

  const handleSelectSuggestion = (suggestion: AutocompleteItem) => {
    // 标记为手动选择
    setHasManualSelection(true);
    
    // 立即更新内部状态，防止闪回
    const selectedValue = type === "name" ? suggestion.itemName : suggestion.itemNumber;
    setInternalValue(selectedValue);
    setShowSuggestions(false);
    
    // 立即调用 onChange 更新外部状态
    onChange(selectedValue);
    
    // 然后调用外部的选择回调来设置其他字段
    if (onSelect) {
      onSelect(suggestion);
    }
  };

  const handleBlur = () => {
    // 延迟处理，以便点击建议项
    setTimeout(() => {
      setShowSuggestions(false);
      
      // 如果启用自动填充且有建议，自动选择最佳匹配
      // 但是如果用户已经手动选择过，就不要再自动填充了
      if (autoFillOnBlur && !hasManualSelection && suggestions.length > 0 && value.trim().length >= 2) {
        const bestMatch = findBestMatch(value, suggestions);
        if (bestMatch && onAutoFill) {
          onAutoFill(bestMatch);
        }
      }
    }, 300);
  };

  // 找到最佳匹配项
  const findBestMatch = (inputValue: string, suggestionList: AutocompleteItem[]): AutocompleteItem | null => {
    if (!inputValue || suggestionList.length === 0) return null;
    
    const input = inputValue.toLowerCase().trim();
    
    // 1. 完全匹配（优先级最高）
    const exactMatch = suggestionList.find(item => {
      const searchText = type === "name" ? item.itemName : item.itemNumber;
      return searchText.toLowerCase() === input;
    });
    if (exactMatch) return exactMatch;
    
    // 2. 开头匹配
    const startsWithMatch = suggestionList.find(item => {
      const searchText = type === "name" ? item.itemName : item.itemNumber;
      return searchText.toLowerCase().startsWith(input);
    });
    if (startsWithMatch) return startsWithMatch;
    
    // 3. 包含匹配（选择最短的，通常更准确）
    const containsMatches = suggestionList.filter(item => {
      const searchText = type === "name" ? item.itemName : item.itemNumber;
      return searchText.toLowerCase().includes(input);
    });
    
    if (containsMatches.length > 0) {
      // 返回最短的匹配项，通常更准确
      return containsMatches.reduce((shortest, current) => {
        const shortestText = type === "name" ? shortest.itemName : shortest.itemNumber;
        const currentText = type === "name" ? current.itemName : current.itemNumber;
        return currentText.length < shortestText.length ? current : shortest;
      });
    }
    
    // 4. 如果没有好的匹配，返回第一个（最相关的）
    return suggestionList[0] || null;
  };

  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <Input
        value={internalValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onBlur={handleBlur}
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        placeholder={placeholder}
        className={className}
      />
      
      {/* 加载指示器 */}
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* 建议列表 */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelectSuggestion(suggestion);
              }}
              onMouseDown={(e) => {
                e.preventDefault(); // 防止触发 blur 事件
              }}
            >
              <div className="font-medium text-gray-900">
                {suggestion.displayText}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {suggestion.secondaryText}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                已有 {suggestion.count} 件商品
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 无结果提示 */}
      {showSuggestions && suggestions.length === 0 && !isLoading && value.length >= 2 && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1">
          <div className="p-3 text-sm text-gray-500 text-center">
            {type === "name" ? "未找到匹配的商品名称" : "未找到匹配的货号"}
          </div>
        </div>
      )}
    </div>
  );
}
