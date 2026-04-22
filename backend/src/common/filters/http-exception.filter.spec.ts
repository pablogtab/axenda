import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common'
import { HttpExceptionFilter } from './http-exception.filter'

const mockArgumentsHost = (url = '/test'): ArgumentsHost => {
  const json = jest.fn()
  const status = jest.fn().mockReturnValue({ json })

  return {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url, method: 'GET' }),
    }),
  } as unknown as ArgumentsHost
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter

  beforeEach(() => {
    filter = new HttpExceptionFilter()
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should format a 404 HttpException correctly', () => {
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND)
    const host = mockArgumentsHost('/api/missing')
    const res = host.switchToHttp().getResponse<{ status: jest.Mock }>()
    const statusSpy = res.status as jest.Mock
    const jsonSpy = statusSpy.mockReturnValue({ json: jest.fn() })

    filter.catch(exception, host)

    expect(statusSpy).toHaveBeenCalledWith(404)
  })

  it('should return 500 for unknown errors', () => {
    const exception = new Error('Something exploded')
    const host = mockArgumentsHost()
    const res = host.switchToHttp().getResponse<{ status: jest.Mock }>()

    filter.catch(exception, host)

    expect(res.status).toHaveBeenCalledWith(500)
  })

  it('should include path and timestamp in the error response', () => {
    const exception = new HttpException('Bad Request', HttpStatus.BAD_REQUEST)
    const json = jest.fn()
    const status = jest.fn().mockReturnValue({ json })
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/api/test', method: 'POST' }),
      }),
    } as unknown as ArgumentsHost

    filter.catch(exception, host)

    const jsonArg = json.mock.calls[0][0]
    expect(jsonArg.statusCode).toBe(400)
    expect(jsonArg.path).toBe('/api/test')
    expect(jsonArg.timestamp).toBeDefined()
  })

  it('should handle HttpException with object message', () => {
    const exception = new HttpException(
      { message: ['field is required'], error: 'Bad Request' },
      HttpStatus.BAD_REQUEST,
    )
    const json = jest.fn()
    const status = jest.fn().mockReturnValue({ json })
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/api/test', method: 'POST' }),
      }),
    } as unknown as ArgumentsHost

    filter.catch(exception, host)

    const jsonArg = json.mock.calls[0][0]
    expect(jsonArg.error).toHaveProperty('message')
  })
})
