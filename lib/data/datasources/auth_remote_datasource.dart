import 'package:dio/dio.dart';
import '../models/user_model.dart';
import '../../core/config/app_config.dart';
import '../../core/storage/local_storage.dart';

abstract class AuthRemoteDataSource {
  Future<UserModel> loginWithPhone(String phoneNumber);
  Future<UserModel> verifyOtp(String phoneNumber, String otp);
  Future<UserModel> login(String email, String password);
  Future<UserModel> register(String email, String password, String name);
  Future<void> logout();
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final Dio dio;
  final LocalStorage localStorage;

  AuthRemoteDataSourceImpl(this.dio, this.localStorage);

  @override
  Future<UserModel> loginWithPhone(String phoneNumber) async {
    try {
      final response = await dio.post(
        '${AppConfig.apiBaseUrl}${AppConfig.loginEndpoint}/phone',
        data: {'phoneNumber': phoneNumber},
      );

      if (response.statusCode == 200) {
        return UserModel.fromJson(response.data['user']);
      } else {
        throw Exception('Failed to send OTP');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  @override
  Future<UserModel> verifyOtp(String phoneNumber, String otp) async {
    try {
      final response = await dio.post(
        '${AppConfig.apiBaseUrl}${AppConfig.loginEndpoint}/verify-otp',
        data: {
          'phoneNumber': phoneNumber,
          'otp': otp,
        },
      );

      if (response.statusCode == 200) {
        // Save tokens
        final tokens = AuthTokensModel.fromJson(response.data['tokens']);
        await localStorage.saveToken(tokens.accessToken);
        await localStorage.saveRefreshToken(tokens.refreshToken);

        return UserModel.fromJson(response.data['user']);
      } else {
        throw Exception('Invalid OTP');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  @override
  Future<UserModel> login(String email, String password) async {
    try {
      final response = await dio.post(
        '${AppConfig.apiBaseUrl}${AppConfig.loginEndpoint}',
        data: {
          'email': email,
          'password': password,
        },
      );

      if (response.statusCode == 200) {
        final tokens = AuthTokensModel.fromJson(response.data['tokens']);
        await localStorage.saveToken(tokens.accessToken);
        await localStorage.saveRefreshToken(tokens.refreshToken);

        return UserModel.fromJson(response.data['user']);
      } else {
        throw Exception('Login failed');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  @override
  Future<UserModel> register(String email, String password, String name) async {
    try {
      final response = await dio.post(
        '${AppConfig.apiBaseUrl}${AppConfig.registerEndpoint}',
        data: {
          'email': email,
          'password': password,
          'name': name,
        },
      );

      if (response.statusCode == 201) {
        final tokens = AuthTokensModel.fromJson(response.data['tokens']);
        await localStorage.saveToken(tokens.accessToken);
        await localStorage.saveRefreshToken(tokens.refreshToken);

        return UserModel.fromJson(response.data['user']);
      } else {
        throw Exception('Registration failed');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  @override
  Future<void> logout() async {
    try {
      // Token is automatically added by DioClient interceptor
      await dio.post('${AppConfig.apiBaseUrl}${AppConfig.logoutEndpoint}');
      await localStorage.clearAuth();
    } catch (e) {
      // Even if API call fails, clear local data
      await localStorage.clearAuth();
    }
  }
}
