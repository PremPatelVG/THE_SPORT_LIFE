import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

// Core
import '../network/dio_client.dart';
import '../storage/local_storage.dart';

// Data sources
import '../../data/datasources/auth_remote_datasource.dart';
import '../../data/datasources/profile_remote_datasource.dart';

// Repositories
import '../../data/repositories/auth_repository_impl.dart';
import '../../data/repositories/profile_repository_impl.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/repositories/profile_repository.dart';

// Use cases
import '../../domain/usecases/auth/login_with_phone_usecase.dart';
import '../../domain/usecases/auth/verify_otp_usecase.dart';
import '../../domain/usecases/profile/create_profile_usecase.dart';

// Cubits
import '../../presentation/cubits/auth/auth_cubit.dart';
import '../../presentation/cubits/profile/profile_cubit.dart';

final sl = GetIt.instance;

Future<void> init() async {
  // ===== External Dependencies =====
  // Initialize SharedPreferences
  final sharedPreferences = await SharedPreferences.getInstance();
  sl.registerLazySingleton(() => sharedPreferences);

  // Initialize FlutterSecureStorage
  const secureStorage = FlutterSecureStorage();
  sl.registerLazySingleton(() => secureStorage);

  // ===== Core =====
  // Local Storage
  sl.registerLazySingleton(
    () => LocalStorage(
      secureStorage: sl(),
      prefs: sl(),
    ),
  );

  // Dio Client
  sl.registerLazySingleton(() => DioClient(sl()));

  // ===== Cubits =====
  sl.registerFactory(
    () => AuthCubit(
      authRepository: sl(),
      loginWithPhoneUseCase: sl(),
      verifyOtpUseCase: sl(),
    ),
  );

  sl.registerFactory(
    () => ProfileCubit(
      createProfileUseCase: sl(),
    ),
  );

  // ===== Use Cases =====
  // Auth
  sl.registerLazySingleton(() => LoginWithPhoneUseCase(sl()));
  sl.registerLazySingleton(() => VerifyOtpUseCase(sl()));

  // Profile
  sl.registerLazySingleton(() => CreateProfileUseCase(sl()));

  // ===== Repositories =====
  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(sl(), sl()),
  );

  sl.registerLazySingleton<ProfileRepository>(
    () => ProfileRepositoryImpl(sl()),
  );

  // ===== Data Sources =====
  sl.registerLazySingleton<AuthRemoteDataSource>(
    () => AuthRemoteDataSourceImpl(sl<DioClient>().dio, sl()),
  );

  sl.registerLazySingleton<ProfileRemoteDataSource>(
    () => ProfileRemoteDataSourceImpl(sl<DioClient>().dio, sl()),
  );
}
