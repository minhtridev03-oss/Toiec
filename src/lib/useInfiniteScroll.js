import { useEffect, useRef } from 'react';

export const useInfiniteScroll = (loadMore, hasMore, loading = false) => {
  const sentinelRef = useRef(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!hasMore || !sentinelRef.current || !('IntersectionObserver' in window)) return undefined;

    const observer = new IntersectionObserver(async (entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || loading || loadingRef.current) return;
      loadingRef.current = true;
      try {
        await loadMore();
      } finally {
        loadingRef.current = false;
      }
    }, { rootMargin: '320px 0px' });

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadMore, loading]);

  return sentinelRef;
};
