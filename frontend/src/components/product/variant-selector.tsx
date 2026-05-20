'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ProductVariantCombination, ProductVariantType } from '@/types';
import { getAvailableOptionIdsForType } from '@/utils';

interface VariantSelectorProps {
  variantTypes: ProductVariantType[];
  combinations: ProductVariantCombination[];
  selectedOptions: Record<string, string>;
  onSelect: (typeId: string, optionId: string) => void;
}

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
  silver: '#C0C0C0',
  gold: '#D4AF37',
};

function getColorCode(colorName: string): string | null {
  return colorMap[colorName.toLowerCase()] ?? null;
}

export function VariantSelector({
  variantTypes,
  combinations,
  selectedOptions,
  onSelect,
}: VariantSelectorProps) {
  return (
    <div className="space-y-6">
      {variantTypes.map((variantType) => {
        const availableOptionIds = getAvailableOptionIdsForType(variantType.id, selectedOptions, combinations);
        const selectedOptionId = selectedOptions[variantType.id];
        const selectedOption = variantType.options.find((option) => option.id === selectedOptionId);
        const isColorLike = variantType.is_visual || ['color', 'warna', 'colour'].includes(variantType.name.toLowerCase());

        return (
          <div key={variantType.id}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">{variantType.name}</span>
              {selectedOption && (
                <span className="text-sm text-muted-foreground">{selectedOption.value}</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {variantType.options.map((option) => {
                const isSelected = selectedOptionId === option.id;
                const isUnavailable = !availableOptionIds.has(option.id);
                const colorCode = isColorLike ? getColorCode(option.value) : null;

                return (
                  <motion.button
                    key={option.id}
                    whileHover={{ scale: isUnavailable ? 1 : 1.05 }}
                    whileTap={{ scale: isUnavailable ? 1 : 0.95 }}
                    onClick={() => !isUnavailable && onSelect(variantType.id, option.id)}
                    disabled={isUnavailable}
                    className={cn(
                      'relative transition-all duration-200',
                      isUnavailable && 'opacity-40 cursor-not-allowed'
                    )}
                    aria-pressed={isSelected}
                    aria-label={`${variantType.name} ${option.value}`}
                  >
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
                      />
                    ) : (
                      <div
                        className={cn(
                          'min-w-[3rem] h-10 px-3 flex items-center justify-center',
                          'border rounded-md text-sm font-medium transition-all',
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border hover:border-primary/50',
                          isUnavailable && 'line-through'
                        )}
                      >
                        {option.value}
                      </div>
                    )}

                    {isSelected && (
                      <motion.div
                        layoutId={`variant-selected-${variantType.id}`}
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
        );
      })}
    </div>
  );
}
