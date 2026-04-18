import { apiRequest } from "./client";
import type { CatalogProduct } from "./catalog";

export type CartItem = {
  id: number;
  productId: number;
  quantity: number;
  product: CatalogProduct;
};

export function getCart() {
  return apiRequest<CartItem[]>("/cart", { auth: true });
}

export function addToCart(productId: number, quantity = 1) {
  return apiRequest<CartItem>("/cart", {
    method: "POST",
    auth: true,
    body: { productId, quantity },
  });
}

export function updateCartItem(productId: number, quantity: number) {
  return apiRequest<CartItem>(`/cart/${productId}`, {
    method: "PATCH",
    auth: true,
    body: { quantity },
  });
}

export function removeCartItem(productId: number) {
  return apiRequest<void>(`/cart/${productId}`, {
    method: "DELETE",
    auth: true,
  });
}
