import 'package:dartz/dartz.dart';
import '../entities/player_profile_entity.dart';
import '../../core/error/failures.dart';

abstract class ProfileRepository {
  Future<Either<Failure, PlayerProfileEntity>> createProfile({
    required String name,
    required String gender,
    required String handedness,
    required List<String> sports,
    required String sportLevel,
    String? avatar,
  });

  Future<Either<Failure, PlayerProfileEntity>> getProfile(String userId);

  Future<Either<Failure, PlayerProfileEntity>> updateProfile({
    required String profileId,
    String? name,
    String? gender,
    String? handedness,
    List<String>? sports,
    String? sportLevel,
    String? avatar,
  });

  Future<Either<Failure, void>> deleteProfile(String profileId);
}
