import { createContext, useContext, useEffect, useState } from 'react';
import { sb } from './supabase';

const DEFAULTS = { shop_name: 'Sweety Business', whatsapp_number: '', low_stock_threshold: 5 };
const Ctx = createContext(DEFAULTS);
export const useSettings = () => useContext(Ctx);

export function SettingsProvider({ children }) {
  const [s, setS] = useState(DEFAULTS);
  useEffect(() => {
    sb.from('settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) { setS(data); document.title = data.shop_name; }
    });
  }, []);
  return <Ctx.Provider value={s}>{children}</Ctx.Provider>;
}
