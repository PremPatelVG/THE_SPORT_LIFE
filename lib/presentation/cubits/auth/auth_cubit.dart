import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/entities/user_entity.dart';
import '../../../domain/usecases/auth/login_with_phone_usecase.dart';
import '../../../domain/usecases/auth/verify_otp_usecase.dart';
import '../../../domain/repositories/auth_repository.dart';
import 'auth_state.dart';

class AuthCubit extends Cubit<AuthState> {
  final AuthRepository authRepository;
  final LoginWithPhoneUseCase loginWithPhoneUseCase;
  final VerifyOtpUseCase verifyOtpUseCase;
  
  UserEntity? _currentUser;

  AuthCubit({
    required this.authRepository,
    required this.loginWithPhoneUseCase,
    required this.verifyOtpUseCase,
  }) : super(AuthInitial()) {
    _checkAuthStatus();
  }

  UserEntity? get currentUser => _currentUser;

  // Check if user is already authenticated
  Future<void> _checkAuthStatus() async {
    final result = await authRepository.isAuthenticated();
    result.fold(
      (failure) => emit(AuthUnauthenticated()),
      (isAuth) async {
        if (isAuth) {
          final userResult = await authRepository.getCurrentUser();
          userResult.fold(
            (failure) => emit(AuthUnauthenticated()),
            (user) {
              _currentUser = user;
              emit(AuthAuthenticated(user));
            },
          );
        } else {
          emit(AuthUnauthenticated());
        }
      },
    );
  }

  // Login with phone number
  Future<void> loginWithPhone(String phoneNumber) async {
    try {
      emit(AuthLoading());
      
      final result = await loginWithPhoneUseCase(phoneNumber);
      
      result.fold(
        (failure) {
          emit(AuthError(failure.message));
          emit(AuthUnauthenticated());
        },
        (user) {
          // OTP sent successfully, don't authenticate yet
          emit(AuthOtpSent(phoneNumber));
        },
      );
    } catch (e) {
      emit(AuthError(e.toString()));
      emit(AuthUnauthenticated());
    }
  }

  // Verify OTP
  Future<void> verifyOtp(String phoneNumber, String otp) async {
    try {
      emit(AuthLoading());
      
      final result = await verifyOtpUseCase(
        phoneNumber: phoneNumber,
        otp: otp,
      );
      
      result.fold(
        (failure) {
          emit(AuthError(failure.message));
          emit(AuthUnauthenticated());
        },
        (user) {
          _currentUser = user;
          emit(AuthAuthenticated(user));
        },
      );
    } catch (e) {
      emit(AuthError(e.toString()));
      emit(AuthUnauthenticated());
    }
  }

  // Logout
  Future<void> logout() async {
    try {
      emit(AuthLoading());
      
      final result = await authRepository.logout();
      
      result.fold(
        (failure) {
          emit(AuthError(failure.message));
        },
        (_) {
          _currentUser = null;
          emit(AuthUnauthenticated());
        },
      );
    } catch (e) {
      emit(AuthError(e.toString()));
      _currentUser = null;
      emit(AuthUnauthenticated());
    }
  }

  // Refresh auth status
  Future<void> refreshAuthStatus() async {
    await _checkAuthStatus();
  }
}
