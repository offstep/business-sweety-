import { createContext, useContext, useEffect, useState } from 'react';
import { sb, configured } from '../lib/supabase.js';

const DEFAULT = { shop_name: 'Sweety Business', whatsapp_number: '', low_stock_threshold: 5 };
const Ctx = createContext({ settings: DEFAULT, ready: false });
export const useShop = () => useContext(Ctx);

export function ShopProvider({ children }) {
  const [state, setState] = useState({ settings: DEFAULT, ready: false });
  useEffect(() => {
    let on = true;
    (async () => {
      let s = DEFAULT;
      if (configured) {
        const { data } = await sb.from('settings').select('*').eq('id', 1).maybeSingle();
        if (data) s = data;
      }
      if (on) { document.title = s.shop_name; setState({ settings: s, ready: true }); }
    })();
    return () => { on = false; };
  }, []);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}
