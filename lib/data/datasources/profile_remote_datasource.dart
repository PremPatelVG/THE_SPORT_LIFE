import 'package:dio/dio.dart';
import '../models/player_profile_model.dart';
import '../../core/config/app_config.dart';
import '../../core/storage/local_storage.dart';

abstract class ProfileRemoteDataSource {
  Future<PlayerProfileModel> createProfile({
    required String name,
    required String gender,
    required String handedness,
    required List<String> sports,
    required String sportLevel,
    String? avatar,
  });

  Future<PlayerProfileModel> getProfile(String userId);

  Future<PlayerProfileModel> updateProfile({
    required String profileId,
    String? name,
    String? gender,
    String? handedness,
    List<String>? sports,
    String? sportLevel,
    String? avatar,
  });

  Future<void> deleteProfile(String profileId);
}

class ProfileRemoteDataSourceImpl implements ProfileRemoteDataSource {
  final Dio dio;
  final LocalStorage localStorage;

  ProfileRemoteDataSourceImpl(this.dio, this.localStorage);

  @override
  Future<PlayerProfileModel> createProfile({
    required String name,
    required String gender,
    required String handedness,
    required List<String> sports,
    required String sportLevel,
    String? avatar,
  }) async {
    try {
      final token = await localStorage.getToken();
      final response = await dio.post(
        '${AppConfig.apiBaseUrl}/profiles',
        data: {
          'name': name,
          'gender': gender,
          'handedness': handedness,
          'sports': sports,
          'sportLevel': sportLevel,
          if (avatar != null) 'avatar': avatar,
        },
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );

      if (response.statusCode == 201) {
        return PlayerProfileModel.fromJson(response.data['profile']);
      } else {
        throw Exception('Failed to create profile');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  @override
  Future<PlayerProfileModel> getProfile(String userId) async {
    try {
      final token = await localStorage.getToken();
      final response = await dio.get(
        '${AppConfig.apiBaseUrl}/profiles/$userId',
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );

      if (response.statusCode == 200) {
        return PlayerProfileModel.fromJson(response.data['profile']);
      } else {
        throw Exception('Failed to get profile');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  @override
  Future<PlayerProfileModel> updateProfile({
    required String profileId,
    String? name,
    String? gender,
    String? handedness,
    List<String>? sports,
    String? sportLevel,
    String? avatar,
  }) async {
    try {
      final token = await localStorage.getToken();
      final response = await dio.put(
        '${AppConfig.apiBaseUrl}/profiles/$profileId',
        data: {
          if (name != null) 'name': name,
          if (gender != null) 'gender': gender,
          if (handedness != null) 'handedness': handedness,
          if (sports != null) 'sports': sports,
          if (sportLevel != null) 'sportLevel': sportLevel,
          if (avatar != null) 'avatar': avatar,
        },
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );

      if (response.statusCode == 200) {
        return PlayerProfileModel.fromJson(response.data['profile']);
      } else {
        throw Exception('Failed to update profile');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  @override
  Future<void> deleteProfile(String profileId) async {
    try {
      final token = await localStorage.getToken();
      final response = await dio.delete(
        '${AppConfig.apiBaseUrl}/profiles/$profileId',
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to delete profile');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }
}
