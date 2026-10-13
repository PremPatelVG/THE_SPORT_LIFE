import 'package:dartz/dartz.dart';
import '../../entities/player_profile_entity.dart';
import '../../repositories/profile_repository.dart';
import '../../../core/error/failures.dart';

class CreateProfileUseCase {
  final ProfileRepository repository;

  CreateProfileUseCase(this.repository);

  Future<Either<Failure, PlayerProfileEntity>> call({
    required String name,
    required String gender,
    required String handedness,
    required List<String> sports,
    required String sportLevel,
    String? avatar,
  }) async {
    return await repository.createProfile(
      name: name,
      gender: gender,
      handedness: handedness,
      sports: sports,
      sportLevel: sportLevel,
      avatar: avatar,
    );
  }
}
