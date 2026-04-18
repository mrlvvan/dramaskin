/** Prisma Decimal в JSON для Express — приводим к строке */
export function toJsonProduct(product) {
  if (!product) return product;
  return {
    ...product,
    price: product.price != null ? String(product.price) : product.price,
  };
}

export function toJsonProductList(products) {
  return products.map(toJsonProduct);
}
