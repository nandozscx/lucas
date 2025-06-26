
"use client";
import React from 'react';

const DashboardHeader: React.FC = () => {

  return (
    <header className="flex flex-col sm:flex-row items-center justify-between p-4 bg-card shadow-md rounded-lg gap-4 sm:gap-0">
      <h1 className="text-2xl md:text-3xl font-bold text-primary">acopiapp</h1>
    </header>
  );
};

export default DashboardHeader;
