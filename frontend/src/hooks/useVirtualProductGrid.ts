import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';

const VIRTUAL_GRID_OVERSCAN_ROWS = 3;
const DEFAULT_ROW_HEIGHT = 360;

type ProductGridColumnCount = 2 | 3 | 4 | 5;

interface VirtualProductGridOptions {
  itemCount: number;
  columns: ProductGridColumnCount;
}

interface VirtualProductGridState {
  containerRef: RefObject<HTMLDivElement | null>;
  visibleStartIndex: number;
  visibleEndIndex: number;
  topSpacerHeight: number;
  totalHeight: number;
  columnCount: number;
}

function getResponsiveColumnCount(columns: ProductGridColumnCount, width: number): number {
  if (columns === 2) return 2;
  if (columns === 3) return width >= 768 ? 3 : 2;
  if (columns === 4) return width >= 1024 ? 4 : width >= 768 ? 3 : 2;
  if (width >= 1024) return 5;
  if (width >= 768) return 4;
  if (width >= 640) return 3;
  return 2;
}

function getEstimatedRowHeight(width: number): number {
  if (width >= 1024) return 370;
  if (width >= 768) return 350;
  return 330;
}

export function useVirtualProductGrid({
  itemCount,
  columns,
}: VirtualProductGridOptions): VirtualProductGridState {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewportHeight, setViewportHeight] = useState(DEFAULT_ROW_HEIGHT * 3);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerTop, setContainerTop] = useState(0);
  const [windowWidth, setWindowWidth] = useState(1024);

  const measure = useCallback((): void => {
    const container = containerRef.current;
    const nextViewportHeight = window.innerHeight || DEFAULT_ROW_HEIGHT * 3;
    const nextWindowWidth = window.innerWidth || 1024;

    setViewportHeight(nextViewportHeight);
    setWindowWidth(nextWindowWidth);
    setScrollTop(window.scrollY || window.pageYOffset || 0);

    if (container) {
      const rect = container.getBoundingClientRect();
      setContainerTop(rect.top + (window.scrollY || window.pageYOffset || 0));
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(measure);
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  return useMemo(() => {
    const columnCount = getResponsiveColumnCount(columns, windowWidth);
    const rowHeight = getEstimatedRowHeight(windowWidth);
    const totalRows = Math.ceil(itemCount / columnCount);
    const relativeScrollTop = Math.max(0, scrollTop - containerTop);
    const startRow = Math.max(
      0,
      Math.floor(relativeScrollTop / rowHeight) - VIRTUAL_GRID_OVERSCAN_ROWS
    );
    const visibleRowCount = Math.ceil(viewportHeight / rowHeight) + VIRTUAL_GRID_OVERSCAN_ROWS * 2;
    const endRow = Math.min(totalRows, startRow + visibleRowCount);

    return {
      containerRef,
      visibleStartIndex: startRow * columnCount,
      visibleEndIndex: Math.min(itemCount, endRow * columnCount),
      topSpacerHeight: startRow * rowHeight,
      totalHeight: totalRows * rowHeight,
      columnCount,
    };
  }, [columns, containerTop, itemCount, scrollTop, viewportHeight, windowWidth]);
}
