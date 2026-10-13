import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/entities/player_profile_entity.dart';
import '../../../domain/usecases/profile/create_profile_usecase.dart';
import 'profile_state.dart';

class ProfileCubit extends Cubit<ProfileState> {
  final CreateProfileUseCase createProfileUseCase;
  
  PlayerProfileEntity? _currentProfile;

  ProfileCubit({
    required this.createProfileUseCase,
  }) : super(ProfileInitial());

  PlayerProfileEntity? get currentProfile => _currentProfile;

  // Create profile
  Future<void> createProfile({
    required String name,
    required String gender,
    required String handedness,
    required List<String> sports,
    required String sportLevel,
    String? avatar,
  }) async {
    try {
      emit(ProfileLoading());
      
      final result = await createProfileUseCase(
        name: name,
        gender: gender,
        handedness: handedness,
        sports: sports,
        sportLevel: sportLevel,
        avatar: avatar,
      );
      
      result.fold(
        (failure) {
          emit(ProfileError(failure.message));
        },
        (profile) {
          _currentProfile = profile;
          emit(ProfileCreated(profile));
        },
      );
    } catch (e) {
      emit(ProfileError(e.toString()));
    }
  }

  // Reset state
  void reset() {
    emit(ProfileInitial());
  }
}
