import 'package:dartz/dartz.dart';
import '../../entities/user_entity.dart';
import '../../repositories/auth_repository.dart';
import '../../../core/error/failures.dart';

class LoginWithPhoneUseCase {
  final AuthRepository repository;

  LoginWithPhoneUseCase(this.repository);

  Future<Either<Failure, UserEntity>> call(String phoneNumber) async {
    return await repository.loginWithPhone(phoneNumber: phoneNumber);
  }
}
