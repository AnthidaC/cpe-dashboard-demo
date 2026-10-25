'use client';

import React, { createContext, useContext, useState } from 'react';

interface FilterContextType {
  academicYear: string;
  setAcademicYear: (year: string) => void;
  semester: string;
  setSemester: (semester: string) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [academicYear, setAcademicYear] = useState('all');
  const [semester, setSemester] = useState('all');

  return (
    <FilterContext.Provider value={{ academicYear, setAcademicYear, semester, setSemester }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}
