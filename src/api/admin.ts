import { apiRequest, API_BASE_URL, authenticatedUpload } from "./client";
import type { CatalogProduct } from "./catalog";
import type { ApiOrder, ApiOrderStatus } from "./orders";

export type AdminProductPayload = {
  name?: string;
  slug?: string;
  subcategory?: string | null;
  description?: string | null;
  usage?: string | null;
  manufacturer?: string | null;
  activeComponents?: string | null;
  weightGr?: number | null;
  country?: string | null;
  barcode?: string | null;
  characteristics?: string | null;
  composition?: string | null;
  /** При сохранении передаём null, чтобы в БД не оставались старые кастомные подписи вкладок. */
  tabLabelDescription?: string | null;
  tabLabelCharacteristics?: string | null;
  tabLabelComposition?: string | null;
  price?: number;
  stock?: number;
  imageUrl?: string | null;
  isPublished?: boolean;
  categoryId?: number;
};

export type AdminUser = {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  role: "USER" | "ADMIN";
  loyaltyPoints: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminUserPayload = {
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  role?: "USER" | "ADMIN";
};

export function adminGetProducts() {
  return apiRequest<CatalogProduct[]>("/admin/products", { auth: true });
}

export async function adminUploadProductImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("image", file);
  const response = await authenticatedUpload("/admin/upload-product-image", formData);
  if (!response.ok) {
    let message = "Не удалось загрузить файл";
    try {
      const data = (await response.json()) as { message?: string };
      if (data?.message) message = data.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return (await response.json()) as { url: string };
}

export function adminCreateProduct(payload: AdminProductPayload) {
  return apiRequest<CatalogProduct>("/admin/products", {
    method: "POST",
    auth: true,
    body: payload,
  });
}

export function adminUpdateProduct(productId: number, payload: AdminProductPayload) {
  return apiRequest<CatalogProduct>(`/admin/products/${productId}`, {
    method: "PATCH",
    auth: true,
    body: payload,
  });
}

export function adminSetProductPublish(productId: number, isPublished: boolean) {
  return apiRequest<CatalogProduct>(`/admin/products/${productId}/publish`, {
    method: "PATCH",
    auth: true,
    body: { isPublished },
  });
}

export function adminDeleteProduct(productId: number) {
  return apiRequest<void>(`/admin/products/${productId}`, {
    method: "DELETE",
    auth: true,
  });
}

export function adminGetOrders() {
  return apiRequest<ApiOrder[]>("/admin/orders", { auth: true });
}

export function adminGetUsers() {
  return apiRequest<AdminUser[]>("/admin/users", { auth: true });
}

export function adminUpdateUser(userId: number, payload: AdminUserPayload) {
  return apiRequest<AdminUser>(`/admin/users/${userId}`, {
    method: "PATCH",
    auth: true,
    body: payload,
  });
}

export function adminDeleteUser(userId: number) {
  return apiRequest<void>(`/admin/users/${userId}`, {
    method: "DELETE",
    auth: true,
  });
}

export function adminSetOrderStatus(orderId: number, status: ApiOrderStatus) {
  return apiRequest<ApiOrder>(`/admin/orders/${orderId}/status`, {
    method: "PATCH",
    auth: true,
    body: { status },
  });
}

export function adminCancelOrder(orderId: number) {
  return apiRequest<ApiOrder>(`/admin/orders/${orderId}/cancel`, {
    method: "PATCH",
    auth: true,
  });
}

export function adminDeleteOrder(orderId: number) {
  return apiRequest<void>(`/admin/orders/${orderId}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function adminDownloadOrderTxt(orderId: number) {
  const accessToken = localStorage.getItem("dramma_access_token");
  const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/txt`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (!response.ok) {
    throw new Error("Не удалось скачать заказ в формате txt");
  }
  return await response.text();
}
