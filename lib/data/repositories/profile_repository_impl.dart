import 'package:dartz/dartz.dart';
import '../../domain/entities/player_profile_entity.dart';
import '../../domain/repositories/profile_repository.dart';
import '../../core/error/failures.dart';
import '../datasources/profile_remote_datasource.dart';

class ProfileRepositoryImpl implements ProfileRepository {
  final ProfileRemoteDataSource remoteDataSource;

  ProfileRepositoryImpl(this.remoteDataSource);

  @override
  Future<Either<Failure, PlayerProfileEntity>> createProfile({
    required String name,
    required String gender,
    required String handedness,
    required List<String> sports,
    required String sportLevel,
    String? avatar,
  }) async {
    try {
      final profile = await remoteDataSource.createProfile(
        name: name,
        gender: gender,
        handedness: handedness,
        sports: sports,
        sportLevel: sportLevel,
        avatar: avatar,
      );
      return Right(profile);
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, PlayerProfileEntity>> getProfile(String userId) async {
    try {
      final profile = await remoteDataSource.getProfile(userId);
      return Right(profile);
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, PlayerProfileEntity>> updateProfile({
    required String profileId,
    String? name,
    String? gender,
    String? handedness,
    List<String>? sports,
    String? sportLevel,
    String? avatar,
  }) async {
    try {
      final profile = await remoteDataSource.updateProfile(
        profileId: profileId,
        name: name,
        gender: gender,
        handedness: handedness,
        sports: sports,
        sportLevel: sportLevel,
        avatar: avatar,
      );
      return Right(profile);
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> deleteProfile(String profileId) async {
    try {
      await remoteDataSource.deleteProfile(profileId);
      return const Right(null);
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }
}
