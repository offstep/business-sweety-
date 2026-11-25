import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ProductForm from '../../components/admin/ProductForm.jsx';
import CatalogEditor from '../../components/admin/CatalogEditor.jsx';
import { sb } from '../../lib/supabase.js';
import { useAsync, must } from '../../hooks/useAsync.js';
import { sortBy } from '../../lib/helpers.js';

export default function ProductEdit() {
  const { id } = useParams();            // undefined sur /admin/produits/nouveau
  const navigate = useNavigate();
  const [version, setVersion] = useState(0);
  const [ok, setOk] = useState(false);
  const reload = () => setVersion((v) => v + 1);

  const { data, error } = useAsync(async () => {
    const categories = await must(sb.from('categories').select('id, name').order('position').order('name'));
    if (!id) return { categories, product: null };
    const { data: product, error: e } = await sb.from('products')
      .select('*, product_images(*), option_types(*, option_values(*)), supplements(*, supplement_option_types(*))')
      .eq('id', id).maybeSingle();
    if (e) throw e;
    return { categories, product };
  }, [id, version], true);

  if (error) return <p className="msg msg--err">{error.message}</p>;
  if (!data) return <p className="empty">Chargement…</p>;
  if (id && !data.product) return <p className="empty">Produit introuvable.</p>;

  const { categories, product } = data;
  const images = sortBy(product?.product_images);

  return (
    <>
      <h1>{product ? product.name : 'Nouveau produit'}</h1>
      {ok && <p className="msg msg--ok">Enregistré.</p>}
      <ProductForm
        key={product?.id ?? 'new'}
        product={product}
        categories={categories}
        images={images}
        onSaved={(newId, created) => { if (created) navigate(`/admin/produits/${newId}`); else { setOk(true); reload(); } }}
        onChanged={() => { setOk(false); reload(); }}
        onDeleted={() => navigate('/admin')}
      />
      {product && (
        <CatalogEditor
          productId={product.id}
          images={images}
          optionTypes={sortBy(product.option_types, 'created_at')}
          supplements={product.supplements || []}
          onChange={reload}
        />
      )}
    </>
  );
}
