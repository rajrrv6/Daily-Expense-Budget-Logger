import { useState, useCallback } from 'react';

export default function useQueryParams(initialValues = {}) {
  const [params, setParams] = useState({
    pageNumber: 0,
    pageSize: 10,
    sortBy: 'transactionDate',
    sortDirection: 'DESC',
    startDate: '',
    endDate: '',
    ...initialValues,
  });

  const setParam = useCallback((key, value) => {
    setParams((prev) => ({
      ...prev,
      [key]: value,
      // Reset page back to 0 if search filters or dates change
      ...((key === 'startDate' || key === 'endDate' || key === 'pageSize') && { pageNumber: 0 }),
    }));
  }, []);

  const setPageNumber = useCallback((page) => {
    setParams((prev) => ({ ...prev, pageNumber: page }));
  }, []);

  const resetFilters = useCallback(() => {
    setParams((prev) => ({
      ...prev,
      pageNumber: 0,
      startDate: '',
      endDate: '',
    }));
  }, []);

  return {
    params,
    setParam,
    setPageNumber,
    resetFilters,
  };
}
