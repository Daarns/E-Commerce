import { useState, useEffect, useRef, useCallback } from 'react';
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
  nextCursor?: string;
  hasNextPage: boolean;
}

const LIMIT = 20;

export function useProductList(filters: ProductFilters) {
  const observerTarget = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ProductListState>({
    products: [],
    categories: [],
    isLoading: false,
    isLoadingMore: false,
    totalProducts: 0,
    currentPage: 1,
    nextCursor: undefined,
    hasNextPage: false,
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
          nextCursor: result.meta.next_cursor,
          hasNextPage: result.meta.has_next ?? result.products.length >= LIMIT,
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
  const loadNextPage = useCallback(async () => {
    const cursor = state.nextCursor;
    if (!cursor) return;

    setState(prev => ({ ...prev, isLoadingMore: true }));

    try {
      let categoryId: string | undefined = undefined;
      if (filters.selectedCategorySlug && filters.selectedCategorySlug !== 'all') {
        const selectedCat = state.categories.find(c => c.slug === filters.selectedCategorySlug);
        categoryId = selectedCat?.id;
      }

      const result = await productService.getProducts({
        cursor,
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
        currentPage: prev.currentPage + 1,
        nextCursor: result.meta.next_cursor,
        hasNextPage: result.meta.has_next ?? result.products.length >= LIMIT,
        isLoadingMore: false,
      }));
    } catch (error) {
      console.error('Failed to load more products:', error);
      setState(prev => ({
        ...prev,
        isLoadingMore: false,
      }));
    }
  }, [filters, state.categories, state.nextCursor]);

  // Infinite scroll - Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !state.isLoadingMore && !state.isLoading && state.hasNextPage) {
          void loadNextPage();
        }
      },
      { rootMargin: '800px 0px', threshold: 0.1 }
    );

    const target = observerTarget.current;

    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [state.isLoadingMore, state.isLoading, state.hasNextPage, loadNextPage]);

  return {
    ...state,
    observerTarget,
  };
}
