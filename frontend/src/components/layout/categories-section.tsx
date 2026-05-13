'use client';

import { useState, MouseEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Category } from '@/types';
import { useScrollCarousel } from '@/hooks/useScrollCarousel';

interface CategoriesSectionProps {
  categories: Category[];
}

export function CategoriesSection({ categories }: CategoriesSectionProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { scrollContainerRef, scroll } = useScrollCarousel();

  const infiniteCategories = [...categories, ...categories];

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const handleScrollLeft = (e: MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    scroll('left');
  };

  const handleScrollRight = (e: MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    scroll('right');
  };

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-4">Shop by Category</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Explore our curated collections designed for every lifestyle
          </p>
        </motion.div>

        <div className="relative">
          <motion.div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth"
            style={{
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {infiniteCategories.map((category, index) => (
              <motion.div
                key={`${category.id}-${index}`}
                variants={itemVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ delay: (index % categories.length) * 0.05 }}
                onMouseEnter={() => setHoveredId(category.id)}
                onMouseLeave={() => setHoveredId(null)}
                whileHover={{ y: -8 }}
                className="flex-shrink-0 w-72"
              >
                <Link
                  href={`/products?category=${category.slug}`}
                  className="group relative aspect-square block overflow-hidden rounded-2xl bg-muted h-72"
                >
                  {category.image_url && (
                    <Image
                      src={category.image_url}
                      alt={category.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-125"
                    />
                  )}

                  <motion.div
                    className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
                    animate={{
                      backgroundColor:
                        hoveredId === category.id
                          ? 'rgba(0, 0, 0, 0.8)'
                          : 'rgba(0, 0, 0, 0.35)',
                    }}
                    transition={{ duration: 0.3 }}
                  />

                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <motion.h3
                      className="text-white font-semibold text-xl text-center px-4"
                      animate={{
                        color:
                          hoveredId === category.id
                            ? '#ffffff'
                            : 'rgba(255, 255, 255, 0.95)',
                        fontSize:
                          hoveredId === category.id
                            ? '1.375rem'
                            : '1.25rem',
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      {category.name}
                    </motion.h3>
                  </div>

                  <motion.div
                    className="absolute inset-0 rounded-2xl border-2 border-white/0"
                    animate={{
                      borderColor:
                        hoveredId === category.id
                          ? 'rgba(255, 255, 255, 0.5)'
                          : 'rgba(255, 255, 255, 0)',
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </Link>
              </motion.div>
            ))}
          </motion.div>

          <div className="md:hidden flex gap-2 justify-center mt-4">
            <motion.button
              onClick={handleScrollLeft}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-full bg-primary text-primary-foreground transition-opacity"
              aria-label="Scroll left"
              type="button"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>

            <motion.button
              onClick={handleScrollRight}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-full bg-primary text-primary-foreground transition-opacity"
              aria-label="Scroll right"
              type="button"
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
}
