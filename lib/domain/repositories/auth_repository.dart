import 'package:dartz/dartz.dart';
import '../entities/user_entity.dart';
import '../../core/error/failures.dart';

abstract class AuthRepository {
  Future<Either<Failure, UserEntity>> login({
    required String email,
    required String password,
  });

  Future<Either<Failure, UserEntity>> loginWithPhone({
    required String phoneNumber,
  });

  Future<Either<Failure, UserEntity>> verifyOtp({
    required String phoneNumber,
    required String otp,
  });

  Future<Either<Failure, UserEntity>> register({
    required String email,
    required String password,
    required String name,
  });

  Future<Either<Failure, void>> logout();

  Future<Either<Failure, UserEntity>> getCurrentUser();

  Future<Either<Failure, bool>> isAuthenticated();
}
