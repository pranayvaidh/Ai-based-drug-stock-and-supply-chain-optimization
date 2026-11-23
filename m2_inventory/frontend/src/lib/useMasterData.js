import { useCallback, useEffect, useState } from 'react';
import api from '@m1/api/client';

let cache = null;
let inflight = null;

async function load() {
  const [drugs, branches, suppliers] = await Promise.all([
    api.get('/drugs', { params: { limit: 100 } }),
    api.get('/branches', { params: { limit: 100 } }),
    api.get('/suppliers', { params: { limit: 100 } }),
  ]);
  return { drugs: drugs.data.items, branches: branches.data.items, suppliers: suppliers.data.items };
}

/** Drugs / branches / suppliers for dropdowns (admin + pharmacist). Cached for the session. */
export default function useMasterData() {
  const [data, setData] = useState(cache || { drugs: [], branches: [], suppliers: [] });
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState(null);

  const refresh = useCallback(async (force = true) => {
    if (force) cache = null;
    setLoading(true);
    try {
      inflight = inflight || load();
      cache = await inflight;
      setData(cache);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      inflight = null;
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (!cache) refresh(false); }, [refresh]);

  const opts = (list) => list.map((x) => ({ value: x.id, label: x.name }));
  return {
    ...data,
    loading,
    error,
    refresh,
    drugOptions: opts(data.drugs),
    branchOptions: opts(data.branches),
    pharmacyOptions: opts(data.branches.filter((b) => b.type === 'pharmacy')),
    supplierOptions: opts(data.suppliers),
  };
}

export function invalidateMasterData() { cache = null; }
