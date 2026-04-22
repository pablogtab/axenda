import { ExecutionContext, CallHandler } from '@nestjs/common'
import { ResponseInterceptor } from './response.interceptor'
import { of } from 'rxjs'

const mockExecutionContext = (statusCode = 200): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getResponse: () => ({ statusCode }),
      getRequest: () => ({}),
    }),
  }) as unknown as ExecutionContext

const mockCallHandler = (data: unknown): CallHandler => ({
  handle: () => of(data),
})

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<unknown>

  beforeEach(() => {
    interceptor = new ResponseInterceptor()
  })

  it('should wrap response in standard envelope', (done) => {
    const ctx = mockExecutionContext(200)
    const handler = mockCallHandler({ id: 1, name: 'Test' })

    interceptor.intercept(ctx, handler).subscribe((result) => {
      expect(result).toMatchObject({
        data: { id: 1, name: 'Test' },
        statusCode: 200,
      })
      expect(result.timestamp).toBeDefined()
      expect(new Date(result.timestamp).getTime()).not.toBeNaN()
      done()
    })
  })

  it('should preserve the HTTP status code in the envelope', (done) => {
    const ctx = mockExecutionContext(201)
    const handler = mockCallHandler({ created: true })

    interceptor.intercept(ctx, handler).subscribe((result) => {
      expect(result.statusCode).toBe(201)
      done()
    })
  })

  it('should handle null data', (done) => {
    const ctx = mockExecutionContext(204)
    const handler = mockCallHandler(null)

    interceptor.intercept(ctx, handler).subscribe((result) => {
      expect(result.data).toBeNull()
      expect(result.statusCode).toBe(204)
      done()
    })
  })

  it('should handle array data', (done) => {
    const ctx = mockExecutionContext(200)
    const handler = mockCallHandler([1, 2, 3])

    interceptor.intercept(ctx, handler).subscribe((result) => {
      expect(result.data).toEqual([1, 2, 3])
      done()
    })
  })
})
