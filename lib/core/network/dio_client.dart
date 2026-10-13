import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../storage/local_storage.dart';

class DioClient {
  late final Dio _dio;
  final LocalStorage _localStorage;

  DioClient(this._localStorage) {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: AppConfig.connectTimeout,
        receiveTimeout: AppConfig.receiveTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.addAll([
      _loggingInterceptor(),
      _authInterceptor(),
      _errorInterceptor(),
    ]);
  }

  Dio get dio => _dio;

  // Logging Interceptor
  Interceptor _loggingInterceptor() {
    return InterceptorsWrapper(
      onRequest: (options, handler) {
        if (AppConfig.isDebugMode) {
          print('┌─────────────────────────────────────────────────────');
          print('│ REQUEST: ${options.method} ${options.uri}');
          print('│ Headers: ${options.headers}');
          if (options.data != null) {
            print('│ Body: ${options.data}');
          }
          print('└─────────────────────────────────────────────────────');
        }
        return handler.next(options);
      },
      onResponse: (response, handler) {
        if (AppConfig.isDebugMode) {
          print('┌─────────────────────────────────────────────────────');
          print('│ RESPONSE: ${response.statusCode} ${response.requestOptions.uri}');
          print('│ Data: ${response.data}');
          print('└─────────────────────────────────────────────────────');
        }
        return handler.next(response);
      },
      onError: (error, handler) {
        if (AppConfig.isDebugMode) {
          print('┌─────────────────────────────────────────────────────');
          print('│ ERROR: ${error.response?.statusCode} ${error.requestOptions.uri}');
          print('│ Message: ${error.message}');
          if (error.response?.data != null) {
            print('│ Data: ${error.response?.data}');
          }
          print('└─────────────────────────────────────────────────────');
        }
        return handler.next(error);
      },
    );
  }

  // Auth Interceptor - Adds token to requests
  Interceptor _authInterceptor() {
    return InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Skip token for login/register endpoints
        final skipAuth = options.path.contains('/login') ||
            options.path.contains('/register') ||
            options.path.contains('/verify-otp');

        if (!skipAuth) {
          final token = await _localStorage.getToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
        }
        return handler.next(options);
      },
      onError: (error, handler) async {
        // Handle 401 Unauthorized - Token expired
        if (error.response?.statusCode == 401) {
          final refreshToken = await _localStorage.getRefreshToken();
          
          if (refreshToken != null && refreshToken.isNotEmpty) {
            try {
              // Try to refresh token
              final response = await _dio.post(
                AppConfig.refreshTokenEndpoint,
                data: {'refreshToken': refreshToken},
              );

              if (response.statusCode == 200) {
                final newToken = response.data['accessToken'];
                await _localStorage.saveToken(newToken);

                // Retry the original request with new token
                final options = error.requestOptions;
                options.headers['Authorization'] = 'Bearer $newToken';
                
                final retryResponse = await _dio.fetch(options);
                return handler.resolve(retryResponse);
              }
            } catch (e) {
              // Refresh failed, clear tokens and redirect to login
              await _localStorage.clearAuth();
              return handler.next(error);
            }
          } else {
            // No refresh token, clear auth
            await _localStorage.clearAuth();
          }
        }
        return handler.next(error);
      },
    );
  }

  // Error Interceptor - Standardize error handling
  Interceptor _errorInterceptor() {
    return InterceptorsWrapper(
      onError: (error, handler) {
        String errorMessage = 'An unexpected error occurred';

        if (error.type == DioExceptionType.connectionTimeout ||
            error.type == DioExceptionType.receiveTimeout) {
          errorMessage = 'Connection timeout. Please check your internet connection.';
        } else if (error.type == DioExceptionType.badResponse) {
          final statusCode = error.response?.statusCode;
          final data = error.response?.data;

          switch (statusCode) {
            case 400:
              errorMessage = data?['message'] ?? 'Bad request';
              break;
            case 401:
              errorMessage = data?['message'] ?? 'Unauthorized. Please login again.';
              break;
            case 403:
              errorMessage = data?['message'] ?? 'Access forbidden';
              break;
            case 404:
              errorMessage = data?['message'] ?? 'Resource not found';
              break;
            case 500:
              errorMessage = data?['message'] ?? 'Server error. Please try again later.';
              break;
            default:
              errorMessage = data?['message'] ?? 'Error: $statusCode';
          }
        } else if (error.type == DioExceptionType.cancel) {
          errorMessage = 'Request cancelled';
        } else if (error.type == DioExceptionType.unknown) {
          errorMessage = 'No internet connection';
        }

        // Create a new DioException with custom message
        final customError = DioException(
          requestOptions: error.requestOptions,
          response: error.response,
          type: error.type,
          error: errorMessage,
          message: errorMessage,
        );

        return handler.next(customError);
      },
    );
  }

  // Helper methods for common HTTP operations
  Future<Response> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return await _dio.get(
      path,
      queryParameters: queryParameters,
      options: options,
    );
  }

  Future<Response> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return await _dio.post(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }

  Future<Response> put(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return await _dio.put(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }

  Future<Response> delete(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return await _dio.delete(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }

  Future<Response> patch(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return await _dio.patch(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }
}
