// 도메인 에러 클래스 모음
// route에서 catch 후 HTTP 상태코드로 매핑

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
  }
}

export class MailDeliveryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MailDeliveryError'
  }
}

// route catch 블록에서 에러 종류를 HTTP 상태코드로 변환
export function httpStatusFromError(e: unknown): number {
  if (e instanceof NotFoundError) return 404
  if (e instanceof ForbiddenError) return 403
  if (e instanceof ValidationError) return 400
  if (e instanceof RateLimitError) return 503
  if (e instanceof MailDeliveryError) return 500
  return 500
}
