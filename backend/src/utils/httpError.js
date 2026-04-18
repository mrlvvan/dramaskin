export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function badRequest(message) {
  return new HttpError(400, message);
}

export function unauthorized(message = "Нет доступа") {
  return new HttpError(401, message);
}

export function forbidden(message = "Доступ запрещён") {
  return new HttpError(403, message);
}

export function notFound(message = "Не найдено") {
  return new HttpError(404, message);
}

export function serviceUnavailable(message = "Сервис временно недоступен") {
  return new HttpError(503, message);
}
