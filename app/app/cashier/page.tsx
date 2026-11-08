import Cashier from "@/components/cashier/Cashier";
import { requireUser } from "@/lib/auth";
import { listCategories, listProducts } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

export const instant = false;

export default async function CashierPage() {
  const user = await requireUser();
  const products = (await listProducts())
    .filter((product) => product.is_active === 1)
    .map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      stock: product.stock,
      category_name: product.category_name,
    }));

  const categories = (await listCategories())
    .filter((category) => category.total > 0)
    .map((category) => category.name);

  const settings = await getSettings();

  return (
    <Cashier
      products={products}
      categories={categories}
      cashierName={user.name}
      storeName={settings.store_name}
    />
  );
}
