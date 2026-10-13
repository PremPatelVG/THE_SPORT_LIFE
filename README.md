# SportLife - Tournament Scheduler

A comprehensive Flutter application for managing sports tournaments, teams, and matches built with **Clean Architecture** and **Cubit** state management.

## Features

- **Authentication System**
  - Phone number login with OTP verification
  - Social login (Google, Facebook) ready
  - Secure token-based authentication
  - Session management

- **Tournament Management**
  - Create and manage tournaments
  - View all tournaments
  - Tournament brackets and scheduling
  - Match management
  - Registration system

- **Team Management**
  - Create and manage teams
  - Team invitations
  - Member management
  - Team profiles

- **Player Profile**
  - Multi-step profile setup
  - Personal information (Name, Gender, Handedness)
  - Multiple sports selection (Pickleball, Paddle, Tennis, etc.)
  - Skill level tracking (Beginner, Intermediate, Advanced)
  - Dashboard with quick actions

## Tech Stack

- **Flutter SDK**: ^3.0.0
- **Architecture**: Clean Architecture (Domain, Data, Presentation layers)
- **State Management**: flutter_bloc (Cubit)
- **Dependency Injection**: get_it
- **Functional Programming**: dartz (Either for error handling)
- **Navigation**: go_router
- **HTTP Client**: dio
- **Local Storage**: shared_preferences, flutter_secure_storage
- **UI Components**: Material Design 3
- **Icons**: flutter_lucide

## Project Structure (Clean Architecture)

```
lib/
├── core/                            # Core utilities and configurations
│   ├── config/
│   │   └── app_config.dart         # App configuration and storage
│   ├── di/
│   │   └── injection_container.dart # Dependency injection setup
│   ├── error/
│   │   └── failures.dart           # Error handling
│   ├── router/
│   │   └── app_router.dart         # Navigation configuration
│   └── theme/
│       └── app_theme.dart          # App theme and styling
│
├── data/                            # Data Layer
│   ├── datasources/                # Data sources (API, Local DB)
│   │   ├── auth_remote_datasource.dart
│   │   └── profile_remote_datasource.dart
│   ├── models/                     # Data models (JSON serialization)
│   │   ├── user_model.dart
│   │   └── player_profile_model.dart
│   └── repositories/               # Repository implementations
│       ├── auth_repository_impl.dart
│       └── profile_repository_impl.dart
│
├── domain/                          # Domain Layer (Business Logic)
│   ├── entities/                   # Business entities
│   │   ├── user_entity.dart
│   │   └── player_profile_entity.dart
│   ├── repositories/               # Repository interfaces
│   │   ├── auth_repository.dart
│   │   └── profile_repository.dart
│   └── usecases/                   # Use cases
│       ├── auth/
│       │   ├── login_with_phone_usecase.dart
│       │   └── verify_otp_usecase.dart
│       └── profile/
│           └── create_profile_usecase.dart
│
├── presentation/                    # Presentation Layer (UI)
│   ├── cubits/                     # State management
│   │   ├── auth/
│   │   │   ├── auth_cubit.dart
│   │   │   └── auth_state.dart
│   │   └── profile/
│   │       ├── profile_cubit.dart
│   │       └── profile_state.dart
│   ├── pages/                      # UI screens
│   │   ├── splash_page.dart
│   │   ├── login_page.dart
│   │   ├── otp_verification_page.dart
│   │   ├── profile_setup_page.dart
│   │   └── dashboard_page.dart
│   └── widgets/                    # Reusable UI components
│
└── main.dart                        # App entry point
```

> **Note**: See `ARCHITECTURE.md` for detailed architecture documentation.

## Getting Started

### Prerequisites

- Flutter SDK (3.0.0 or higher)
- Dart SDK (3.0.0 or higher)
- Android Studio / VS Code with Flutter extensions
- iOS Simulator (for Mac) / Android Emulator

### Installation

1. **Clone the repository**
   ```bash
   cd /Users/maulik/Downloads/tournament-scheduler-flutter
   ```

2. **Install dependencies**
   ```bash
   flutter pub get
   ```

3. **Configure API endpoint**
   
   Create a `.env` file or configure the API base URL in `lib/core/config/app_config.dart`:
   ```dart
   static const String apiBaseUrl = 'http://your-api-url/api/v1';
   ```

4. **Add fonts (Optional)**
   
   Download Inter font family and place in `fonts/` directory:
   - Inter-Regular.ttf
   - Inter-Medium.ttf
   - Inter-SemiBold.ttf
   - Inter-Bold.ttf

5. **Run the app**
   ```bash
   flutter run
   ```

## Configuration

### API Configuration

Update the API base URL in `lib/core/config/app_config.dart`:

```dart
static const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://localhost:3000/api/v1',
);
```

Or pass it as a build argument:
```bash
flutter run --dart-define=API_BASE_URL=https://your-api.com/api/v1
```

### Theme Customization

Modify colors and styles in `lib/core/theme/app_theme.dart`:

```dart
static const Color primaryColor = Color(0xFF059669); // emerald-600
static const Color secondaryColor = Color(0xFF0D9488); // teal-600
```

## State Management with Cubit

This app uses **flutter_bloc** with **Cubit** for state management. Each feature has its own Cubit:

### Example: Auth Cubit Usage

```dart
// Login
context.read<AuthCubit>().login(email, password);

// Listen to state changes
BlocListener<AuthCubit, AuthState>(
  listener: (context, state) {
    if (state is AuthAuthenticated) {
      // Navigate to dashboard
    } else if (state is AuthError) {
      // Show error message
    }
  },
  child: YourWidget(),
)

// Build UI based on state
BlocBuilder<AuthCubit, AuthState>(
  builder: (context, state) {
    if (state is AuthLoading) {
      return CircularProgressIndicator();
    }
    // ... other states
  },
)
```

## API Integration

All API calls are handled through service classes in the `services/` directory. The `ApiClient` class handles:

- Automatic token injection
- Request/response interceptors
- Error handling
- Token refresh logic

### Example API Call

```dart
// In a service
Future<List<dynamic>> getTournaments() async {
  try {
    final response = await _apiClient.get('/tournaments');
    return response.data['data'] ?? [];
  } catch (e) {
    rethrow;
  }
}

// In a cubit
Future<void> getTournaments() async {
  try {
    emit(TournamentLoading());
    final tournaments = await _tournamentService.getTournaments();
    emit(TournamentLoaded(tournaments));
  } catch (e) {
    emit(TournamentError(e.toString()));
  }
}
```

## Navigation

The app uses **go_router** for navigation. Routes are defined in `lib/core/router/app_router.dart`.

### Navigation Examples

```dart
// Navigate to a route
context.go('/tournaments');

// Navigate with parameters
context.go('/tournaments/${tournamentId}');

// Go back
context.pop();
```

## Building for Production

### Android

```bash
flutter build apk --release
# or
flutter build appbundle --release
```

### iOS

```bash
flutter build ios --release
```

### Web

```bash
flutter build web --release
```

## Development Status

### ✅ Completed
- **Clean Architecture implementation** with proper layer separation
- **Dependency Injection** using GetIt
- **Authentication flow** with phone number & OTP verification
- **Player profile setup** with multi-step form
- **Multiple sports selection** with skill level tracking
- Splash screen with branding
- Theme and styling with Material Design 3
- Navigation setup with GoRouter
- Error handling with Either pattern

### 🚧 In Progress / To Be Implemented
- Complete migration of remaining features to Clean Architecture
- Tournament CRUD operations
- Team CRUD operations
- Match scheduling
- Bracket visualization
- Image upload for profiles
- Push notifications
- Offline support
- Comprehensive unit and widget tests

### 📚 Documentation
- `ARCHITECTURE.md` - Complete Clean Architecture documentation
- `CLEAN_ARCHITECTURE_GUIDE.md` - Quick reference and examples
- `MIGRATION_TODO.md` - Migration checklist and progress tracking

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, email support@sportlife.com or open an issue in the repository.

## Acknowledgments

- Original React application design and functionality
- Flutter and Dart teams for excellent documentation
- Community packages and contributors
