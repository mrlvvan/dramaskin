export function notFoundMiddleware(req, res) {
  res.status(404).json({
    message: `Маршрут не найден: ${req.method} ${req.originalUrl}`,
  });
}
