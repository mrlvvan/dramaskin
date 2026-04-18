import { apiRequest } from "./client";
import type { CatalogProduct } from "./catalog";

export type FavoriteRow = {
  id: number;
  userId: number;
  productId: number;
  createdAt: string;
  product: CatalogProduct;
};

export function getFavorites() {
  return apiRequest<FavoriteRow[]>("/favorites", { auth: true });
}

export function addFavorite(productId: number) {
  return apiRequest<FavoriteRow>("/favorites", {
    method: "POST",
    auth: true,
    body: { productId },
  });
}

export function removeFavorite(productId: number) {
  return apiRequest<void>(`/favorites/${productId}`, {
    method: "DELETE",
    auth: true,
  });
}
