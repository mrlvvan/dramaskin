import { apiRequest } from "./client";
import type { CatalogProduct } from "./catalog";

export type ApiOrderStatus =
  | "NEW"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELLED";

export type ApiOrderItem = {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: string;
  product: CatalogProduct;
};

export type ApiOrder = {
  id: number;
  status: ApiOrderStatus;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  addressLine: string;
  apartment?: string | null;
  entrance?: string | null;
  intercom?: string | null;
  floor?: string | null;
  promoCode?: string | null;
  comment: string | null;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
  items: ApiOrderItem[];
};

export type CreateOrderPayload = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  addressLine: string;
  comment?: string | null;
  promoCode?: string | null;
  apartment?: string | null;
  entrance?: string | null;
  intercom?: string | null;
  floor?: string | null;
};

export function getMyOrders() {
  return apiRequest<ApiOrder[]>("/orders/me", { auth: true });
}

export function createOrder(payload: CreateOrderPayload) {
  return apiRequest<ApiOrder>("/orders", {
    method: "POST",
    auth: true,
    body: payload,
  });
}
