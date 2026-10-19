import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Boxes,
  ChevronLeft,
  Layers3,
  LoaderCircle,
  Pencil,
  Plus,
  Power,
  Search,
  Tag,
  X,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../lib/api";
import { DataMigrationPanel } from "./DataMigrationPanel";

type Category = { id: string; name: string; description: string | null };
type Product = {
  id: string;
  sku: string;
  name: string;
  category_id: string | null;
  unit: string;
  sale_price: string;
  is_active: boolean;
};
type ProductForm = {
  sku: string;
  name: string;
  category_id: string;
  unit: string;
  sale_price: string;
};
const blankProduct: ProductForm = {
  sku: "",
  name: "",
  category_id: "",
  unit: "unit",
  sale_price: "0",
};
const money = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

export function ProductsPage({ goBack }: { goBack: () => void }) {
  const { session, tenantId } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productOpen, setProductOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<ProductForm>(blankProduct);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const options = {
    accessToken: session?.access_token,
    tenantId: tenantId ?? undefined,
  };
  const load = async () => {
    if (!session || !tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [catalog, groups] = await Promise.all([
        apiFetch<Product[]>("/products", options),
        apiFetch<Category[]>("/products/categories", options),
      ]);
      setProducts(catalog);
      setCategories(groups);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo cargar el catálogo.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [session?.access_token, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term
      ? products.filter((item) =>
          `${item.sku} ${item.name}`.toLowerCase().includes(term),
        )
      : products;
  }, [products, query]);
  const categoryNameFor = (id: string | null) =>
    categories.find((category) => category.id === id)?.name ?? "Sin categoría";
  const closeProduct = () => {
    setProductOpen(false);
    setEditingId(null);
    setProduct(blankProduct);
  };
  const editProduct = (item: Product) => {
    setError(null);
    setProduct({
      sku: item.sku,
      name: item.name,
      category_id: item.category_id ?? "",
      unit: item.unit,
      sale_price: item.sale_price,
    });
    setEditingId(item.id);
    setProductOpen(true);
  };
  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...product,
        category_id: product.category_id || null,
        sale_price: Number(product.sale_price || 0),
      };
      const saved = await apiFetch<Product>(
        editingId ? "/products/" + editingId : "/products",
        {
          ...options,
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      setProducts((current) =>
        (editingId
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [...current, saved]
        ).sort((a, b) => a.name.localeCompare(b.name)),
      );
      closeProduct();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible guardar el producto.",
      );
    } finally {
      setSaving(false);
    }
  };
  const toggleProduct = async (item: Product) => {
    setSaving(true);
    setError(null);
    try {
      const saved = await apiFetch<Product>("/products/" + item.id, {
        ...options,
        method: "PATCH",
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      setProducts((current) =>
        current.map((currentItem) =>
          currentItem.id === saved.id ? saved : currentItem,
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible actualizar el estado.",
      );
    } finally {
      setSaving(false);
    }
  };
  const saveCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await apiFetch<Category>("/products/categories", {
        ...options,
        method: "POST",
        body: JSON.stringify({
          name: categoryName,
          description: categoryDescription || null,
        }),
      });
      setCategories((current) =>
        [...current, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setProduct((current) => ({ ...current, category_id: created.id }));
      setCategoryName("");
      setCategoryDescription("");
      setCategoryOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible crear la categoría.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="module-page">
      <div className="module-heading">
        <div>
          <button className="back-link" onClick={goBack}>
            <ChevronLeft size={16} /> Panel general
          </button>
          <p className="eyebrow">CATÁLOGO E INVENTARIO</p>
          <h1>Productos</h1>
          <p className="subtitle">
            Administra artículos, precios de venta y clasificación comercial.
          </p>
        </div>
        <div className="heading-actions">
          <button
            className="secondary-button"
            onClick={() => {
              setError(null);
              setCategoryOpen(true);
            }}
          >
            <Layers3 size={16} /> Categoría
          </button>
          <button
            className="primary-button"
            onClick={() => {
              setError(null);
              setEditingId(null);
              setProduct(blankProduct);
              setProductOpen(true);
            }}
          >
            <Plus size={18} /> Nuevo producto
          </button>
        </div>
      </div>
      <section className="customer-summary product-summary">
        <article>
          <span className="summary-icon">
            <Boxes size={19} />
          </span>
          <div>
            <small>PRODUCTOS ACTIVOS</small>
            <strong>{products.filter((item) => item.is_active).length}</strong>
          </div>
        </article>
        <article>
          <span className="summary-icon purple">
            <Layers3 size={19} />
          </span>
          <div>
            <small>CATEGORÍAS</small>
            <strong>{categories.length}</strong>
          </div>
        </article>
      </section>
      <DataMigrationPanel module="products" onImported={load} />
      <article className="panel customers-panel">
        <div className="customers-toolbar">
          <label className="search customer-search">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Buscar productos"
              placeholder="Buscar por nombre o SKU"
            />
          </label>
          <span>{shown.length} resultados</span>
        </div>
        {error && !productOpen && !categoryOpen && (
          <div className="module-error">
            {error}
            <button onClick={() => void load()}>Reintentar</button>
          </div>
        )}
        {loading ? (
          <div className="module-state">
            <LoaderCircle className="spin" size={22} /> Cargando catálogo…
          </div>
        ) : shown.length === 0 ? (
          <div className="module-state">
            <Boxes size={28} />
            <strong>
              {query
                ? "No se encontraron coincidencias"
                : "Aún no hay productos"}
            </strong>
            <span>
              {query
                ? "Prueba con otro término."
                : "Crea el primer producto para comenzar a operar."}
            </span>
            <button
              className="text-button"
              onClick={() => {
                setEditingId(null);
                setProduct(blankProduct);
                setProductOpen(true);
              }}
            >
              Crear producto
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="products-table">
              <thead>
                <tr>
                  <th>PRODUCTO</th>
                  <th>SKU</th>
                  <th>CATEGORÍA</th>
                  <th>UNIDAD</th>
                  <th>PRECIO DE VENTA</th>
                  <th>ESTADO</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {shown.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="product-icon">
                        <Tag size={14} />
                      </span>
                      <strong>{item.name}</strong>
                    </td>
                    <td>{item.sku}</td>
                    <td>{categoryNameFor(item.category_id)}</td>
                    <td>{item.unit}</td>
                    <td>
                      <strong>{money.format(Number(item.sale_price))}</strong>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${item.is_active ? "active" : "inactive"}`}
                      >
                        {item.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-button muted"
                          onClick={() => editProduct(item)}
                          aria-label="Editar producto"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-button muted"
                          onClick={() => void toggleProduct(item)}
                          disabled={saving}
                          aria-label="Cambiar estado"
                        >
                          <Power size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
      {productOpen && (
        <Modal
          title={editingId ? "Editar producto" : "Crear producto"}
          onClose={closeProduct}
        >
          <form className="customer-form" onSubmit={saveProduct}>
            <label>
              SKU
              <input
                required
                maxLength={64}
                value={product.sku}
                onChange={(event) =>
                  setProduct((current) => ({
                    ...current,
                    sku: event.target.value,
                  }))
                }
                placeholder="SKU-001"
              />
            </label>
            <label>
              Nombre del producto
              <input
                required
                maxLength={160}
                value={product.name}
                onChange={(event) =>
                  setProduct((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Nombre comercial"
              />
            </label>
            <div className="form-grid">
              <label>
                Categoría
                <select
                  value={product.category_id}
                  onChange={(event) =>
                    setProduct((current) => ({
                      ...current,
                      category_id: event.target.value,
                    }))
                  }
                >
                  <option value="">Sin categoría</option>
                  {categories.map((category) => (
                    <option value={category.id} key={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Unidad
                <input
                  required
                  maxLength={16}
                  value={product.unit}
                  onChange={(event) =>
                    setProduct((current) => ({
                      ...current,
                      unit: event.target.value,
                    }))
                  }
                  placeholder="unit"
                />
              </label>
            </div>
            <label>
              Precio de venta
              <input
                type="number"
                min="0"
                step="0.01"
                value={product.sale_price}
                onChange={(event) =>
                  setProduct((current) => ({
                    ...current,
                    sale_price: event.target.value,
                  }))
                }
              />
            </label>
            {error && <p className="login-error">{error}</p>}
            <ModalActions
              saving={saving}
              onCancel={closeProduct}
              label={editingId ? "Guardar cambios" : "Guardar producto"}
            />
          </form>
        </Modal>
      )}
      {categoryOpen && (
        <Modal title="Crear categoría" onClose={() => setCategoryOpen(false)}>
          <form className="customer-form" onSubmit={saveCategory}>
            <label>
              Nombre
              <input
                required
                maxLength={100}
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="Materiales"
              />
            </label>
            <label>
              Descripción{" "}
              <input
                maxLength={240}
                value={categoryDescription}
                onChange={(event) => setCategoryDescription(event.target.value)}
                placeholder="Opcional"
              />
            </label>
            {error && <p className="login-error">{error}</p>}
            <ModalActions
              saving={saving}
              onCancel={() => setCategoryOpen(false)}
              label="Guardar categoría"
            />
          </form>
        </Modal>
      )}
    </section>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-layer">
      <section
        className="customer-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">CATÁLOGO</p>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function ModalActions({
  saving,
  onCancel,
  label,
}: {
  saving: boolean;
  onCancel: () => void;
  label: string;
}) {
  return (
    <div className="modal-actions">
      <button type="button" className="secondary-button" onClick={onCancel}>
        Cancelar
      </button>
      <button className="primary-button" disabled={saving}>
        {saving ? "Guardando…" : label}
      </button>
    </div>
  );
}
