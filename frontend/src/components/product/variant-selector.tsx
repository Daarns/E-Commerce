'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface VariantOption {
  id: string;
  type: string;
  value: string;
  price_adjustment: number;
  stock_quantity: number;
  image_url?: string;
}

interface VariantSelectorProps {
  variants: VariantOption[];
  selectedVariant: VariantOption | null;
  onSelect: (variant: VariantOption) => void;
}

// Group variants by type
function groupVariants(variants: VariantOption[]): Record<string, VariantOption[]> {
  return variants.reduce((acc, variant) => {
    const type = variant.type.toLowerCase();
    if (!acc[type]) acc[type] = [];
    acc[type].push(variant);
    return acc;
  }, {} as Record<string, VariantOption[]>);
}

// Color display helper
const colorMap: Record<string, string> = {
  black: '#000000',
  white: '#FFFFFF',
  red: '#EF4444',
  blue: '#3B82F6',
  green: '#22C55E',
  yellow: '#EAB308',
  orange: '#F97316',
  purple: '#A855F7',
  pink: '#EC4899',
  gray: '#6B7280',
  grey: '#6B7280',
  brown: '#92400E',
  navy: '#1E3A8A',
  beige: '#D4B896',
  cream: '#FFFDD0',
};

function getColorCode(colorName: string): string | null {
  return colorMap[colorName.toLowerCase()] || null;
}

export function VariantSelector({ variants, selectedVariant, onSelect }: VariantSelectorProps) {
  const groupedVariants = groupVariants(variants);
  const [selectedByType, setSelectedByType] = useState<Record<string, string>>(() => {
    if (selectedVariant) {
      return { [selectedVariant.type.toLowerCase()]: selectedVariant.id };
    }
    return {};
  });

  const handleSelect = (variant: VariantOption) => {
    setSelectedByType(prev => ({
      ...prev,
      [variant.type.toLowerCase()]: variant.id,
    }));
    onSelect(variant);
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedVariants).map(([type, options]) => (
        <div key={type}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium capitalize">{type}</span>
            {selectedByType[type] && (
              <AnimatePresence mode="wait">
                <motion.span
                  key={selectedByType[type]}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="text-sm text-muted-foreground"
                >
                  {options.find(o => o.id === selectedByType[type])?.value}
                </motion.span>
              </AnimatePresence>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {options.map((option) => {
              const isSelected = selectedByType[type] === option.id;
              const isOutOfStock = option.stock_quantity === 0;
              const colorCode = type === 'color' ? getColorCode(option.value) : null;

              return (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: isOutOfStock ? 1 : 1.05 }}
                  whileTap={{ scale: isOutOfStock ? 1 : 0.95 }}
                  onClick={() => !isOutOfStock && handleSelect(option)}
                  disabled={isOutOfStock}
                  className={cn(
                    'relative transition-all duration-200',
                    isOutOfStock && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  {/* Color swatch */}
                  {colorCode ? (
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full border-2 transition-all',
                        isSelected 
                          ? 'border-primary ring-2 ring-primary ring-offset-2' 
                          : 'border-border hover:border-primary/50'
                      )}
                      style={{ backgroundColor: colorCode }}
                      title={option.value}
                    >
                      {isOutOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-full h-0.5 bg-red-500 rotate-45 absolute" />
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Size/Other variant button */
                    <div
                      className={cn(
                        'min-w-[3rem] h-10 px-3 flex items-center justify-center',
                        'border rounded-md text-sm font-medium transition-all',
                        isSelected 
                          ? 'border-primary bg-primary text-primary-foreground' 
                          : 'border-border hover:border-primary/50',
                        isOutOfStock && 'line-through'
                      )}
                    >
                      {option.value}
                    </div>
                  )}

                  {/* Selection indicator animation */}
                  {isSelected && (
                    <motion.div
                      layoutId={`variant-selected-${type}`}
                      className="absolute -inset-0.5 border-2 border-primary rounded-md pointer-events-none"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
