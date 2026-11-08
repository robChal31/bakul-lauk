import AppHeader from "@/components/AppHeader";
import ProductsClient from "@/components/products/ProductsClient";
import { requireUser } from "@/lib/auth";
import { listCategories, listProducts } from "@/lib/queries";

export const instant = false;

export default async function ProductsPage() {
  const user = await requireUser();
  const products = await listProducts();
  const categories = (await listCategories()).map((category) => ({
    id: category.id,
    name: category.name,
  }));

  const active = products.filter((product) => product.is_active === 1);
  const totalValue = active.reduce(
    (sum, product) => sum + product.cost * product.stock,
    0,
  );

  return (
    <main className="pb-28">
      <AppHeader
        title="Produk"
        subtitle={`${active.length} produk aktif · nilai stok ${new Intl.NumberFormat(
          "id-ID",
          { style: "currency", currency: "IDR", maximumFractionDigits: 0 },
        ).format(totalValue)}`}
      />
      <ProductsClient
        products={products}
        categories={categories}
        canManage={user.role === "owner"}
      />
    </main>
  );
}
