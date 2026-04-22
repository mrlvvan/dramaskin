import { apiRequest } from "./client";

export type CatalogCategory = {
  id: number;
  name: string;
  slug: string;
};

/** Элемент JSON `Product.colorVariants` (см. админку / сид). */
export type CatalogProductColorVariant = {
  id: string;
  hex: string;
  label?: string;
  swatchImageUrl?: string;
  imageUrl?: string;
  imageClassName?: string;
  price?: string;
  stock?: number;
  productId?: number;
};

export type CatalogProduct = {
  id: number;
  name: string;
  slug: string;
  subcategory: string | null;
  description: string | null;
  usage: string | null;
  manufacturer: string | null;
  activeComponents: string | null;
  weightGr: number | null;
  country: string | null;
  barcode: string | null;
  characteristics: string | null;
  composition: string | null;
  price: string;
  stock: number;
  imageUrl: string | null;
  colorVariants?: CatalogProductColorVariant[] | null;
  isPublished: boolean;
  category: CatalogCategory;
};

export function getCategories() {
  return apiRequest<CatalogCategory[]>("/categories");
}

export function getProducts() {
  return apiRequest<CatalogProduct[]>("/products");
}

export function searchProducts(query: string) {
  return apiRequest<CatalogProduct[]>(`/products/search?q=${encodeURIComponent(query)}`);
}
