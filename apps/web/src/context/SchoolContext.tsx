import React, { createContext, useContext, useState, useEffect } from 'react';
import { SchoolProfile } from '@sms/shared';

interface SchoolContextType {
  school: Partial<SchoolProfile> | null;
  loading: boolean;
  refreshSchool: () => Promise<void>;
  setSchoolData: (data: Partial<SchoolProfile>) => void;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export const SchoolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [school, setSchool] = useState<Partial<SchoolProfile> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSchool = async () => {
    try {
      const token = localStorage.getItem('sms_token');
      const url = token ? '/api/school/profile' : '/api/school/public';
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        const s = data.school;
        setSchool({
          ...s,
          logoUrl: s.logoUrl || s.logo_url || '',
          iemisCode: s.iemisCode !== undefined ? s.iemisCode : s.iemis_code,
        });
      } else if (!token) {
        const publicRes = await fetch('/api/school/public');
        if (publicRes.ok) {
          const publicData = await publicRes.json();
          const s = publicData.school;
          setSchool({
            ...s,
            logoUrl: s.logoUrl || s.logo_url || '',
            iemisCode: s.iemisCode !== undefined ? s.iemisCode : s.iemis_code,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load school profile', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchool();
  }, []);

  const refreshSchool = async () => {
    await fetchSchool();
  };

  const setSchoolData = (data: Partial<SchoolProfile>) => {
    const normalized = {
      ...data,
      logoUrl: data.logoUrl || (data as any)?.logo_url || '',
      iemisCode: data.iemisCode !== undefined ? data.iemisCode : (data as any)?.iemis_code,
    };
    setSchool((prev) => (prev ? { ...prev, ...normalized } : normalized));
  };

  return (
    <SchoolContext.Provider value={{ school, loading, refreshSchool, setSchoolData }}>
      {children}
    </SchoolContext.Provider>
  );
};

export const useSchool = () => {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error('useSchool must be used within a SchoolProvider');
  return ctx;
};
