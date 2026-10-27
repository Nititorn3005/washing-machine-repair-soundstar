import React, { createContext, useContext, useState, useEffect } from 'react';
import * as api from './api.functions';

interface StoreContextType {
  data: any;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  addJob: (job: any) => Promise<void>;
  updateJobStatus: (id: string, status: string) => Promise<void>;
  issuePart: (jobId: string, partId: string, qty: number, reason: string) => Promise<void>;
  updateStock: (partId: string, type: 'IN' | 'OUT' | 'ADJUST', qty: number, reason: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<any>({ jobs: [], inventory: [], staff: [], jobParts: [], transactions: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = async () => {
    try {
      setLoading(true);
      const snapshot = await api.getSnapshot();
      setData(snapshot);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const addJob = async (job: any) => {
    await api.createJob(job);
    await refreshData();
  };

  const updateJobStatus = async (id: string, status: string) => {
    await api.updateJob(id, { status });
    await refreshData();
  };

  const issuePart = async (jobId: string, partId: string, qty: number, reason: string) => {
    await api.issueJobPart(jobId, partId, qty, reason);
    await refreshData();
  };

  const updateStock = async (partId: string, type: 'IN' | 'OUT' | 'ADJUST', qty: number, reason: string) => {
    await api.recordMovement(partId, type, qty, reason);
    await refreshData();
  };

  return (
    <StoreContext.Provider value={{ data, loading, error, refreshData, addJob, updateJobStatus, issuePart, updateStock }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};

