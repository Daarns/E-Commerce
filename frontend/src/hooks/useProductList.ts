import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { productService, categoryService } from '@/services/product';
import { Product, Category } from '@/types';
import { ProductFilters } from './useProductFilter';

export interface ProductListState {
  products: Product[];
  categories: Category[];
  isLoading: boolean;
  isLoadingMore: boolean;
  totalProducts: number;
  currentPage: number;
}

const LIMIT = 15;

export function useProductList(filters: ProductFilters) {
  const observerTarget = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ProductListState>({
    products: [],
    categories: [],
    isLoading: false,
    isLoadingMore: false,
    totalProducts: 0,
    currentPage: 1,
  });

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const cats = await categoryService.getCategories();
        setState(prev => ({ ...prev, categories: cats }));
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    }
    fetchCategories();
  }, []);

  // Fetch products when filters change (reset to page 1)
  useEffect(() => {
    async function fetchProducts() {
      setState(prev => ({ ...prev, isLoading: true, products: [], currentPage: 1 }));

      try {
        let categoryId: string | undefined = undefined;
        if (filters.selectedCategorySlug && filters.selectedCategorySlug !== 'all') {
          const selectedCat = state.categories.find(c => c.slug === filters.selectedCategorySlug);
          categoryId = selectedCat?.id;
        }

        const result = await productService.getProducts({
          page: 1,
          limit: LIMIT,
          search: filters.searchQuery,
          category_id: categoryId,
          sort_by: filters.sortBy,
          min_price: filters.minPrice ? parseFloat(filters.minPrice) : undefined,
          max_price: filters.maxPrice ? parseFloat(filters.maxPrice) : undefined,
        });

        setState(prev => ({
          ...prev,
          products: result.products,
          totalProducts: result.meta.total,
          isLoading: false,
          currentPage: 1,
        }));
      } catch (error) {
        console.error('Failed to fetch products:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
        }));
      }
    }

    fetchProducts();
  }, [filters, state.categories]);

  // Load next page (infinite scroll)
  const loadNextPage = useCallback(async (nextPage: number) => {
    setState(prev => ({ ...prev, isLoadingMore: true }));

    try {
      let categoryId: string | undefined = undefined;
      if (filters.selectedCategorySlug && filters.selectedCategorySlug !== 'all') {
        const selectedCat = state.categories.find(c => c.slug === filters.selectedCategorySlug);
        categoryId = selectedCat?.id;
      }

      const result = await productService.getProducts({
        page: nextPage,
        limit: LIMIT,
        search: filters.searchQuery,
        category_id: categoryId,
        sort_by: filters.sortBy,
        min_price: filters.minPrice ? parseFloat(filters.minPrice) : undefined,
        max_price: filters.maxPrice ? parseFloat(filters.maxPrice) : undefined,
      });

      setState(prev => ({
        ...prev,
        products: [...prev.products, ...result.products],
        totalProducts: result.meta.total,
        currentPage: nextPage,
        isLoadingMore: false,
      }));
    } catch (error) {
      console.error('Failed to load more products:', error);
      setState(prev => ({
        ...prev,
        isLoadingMore: false,
      }));
    }
  }, [filters, state.categories]);

  // Infinite scroll - Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !state.isLoadingMore && !state.isLoading) {
          const totalPages = Math.ceil(state.totalProducts / LIMIT);
          if (state.currentPage < totalPages) {
            loadNextPage(state.currentPage + 1);
          }
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [state.isLoadingMore, state.isLoading, state.currentPage, state.totalProducts, loadNextPage]);

  return {
    ...state,
    observerTarget,
  };
}
