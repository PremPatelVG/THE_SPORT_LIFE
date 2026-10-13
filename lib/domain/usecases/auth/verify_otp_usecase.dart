import 'package:dartz/dartz.dart';
import '../../entities/user_entity.dart';
import '../../repositories/auth_repository.dart';
import '../../../core/error/failures.dart';

class VerifyOtpUseCase {
  final AuthRepository repository;

  VerifyOtpUseCase(this.repository);

  Future<Either<Failure, UserEntity>> call({
    required String phoneNumber,
    required String otp,
  }) async {
    return await repository.verifyOtp(
      phoneNumber: phoneNumber,
      otp: otp,
    );
  }
}
