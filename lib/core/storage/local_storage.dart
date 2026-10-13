import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

/// Local storage manager for handling secure and non-secure data
/// Uses FlutterSecureStorage for sensitive data (tokens)
/// Uses SharedPreferences for general app data
class LocalStorage {
  final FlutterSecureStorage _secureStorage;
  final SharedPreferences _prefs;

  LocalStorage({
    required FlutterSecureStorage secureStorage,
    required SharedPreferences prefs,
  })  : _secureStorage = secureStorage,
        _prefs = prefs;

  // ==================== Token Management ====================
  
  static const String _tokenKey = 'auth_token';
  static const String _refreshTokenKey = 'refresh_token';

  Future<void> saveToken(String token) async {
    await _secureStorage.write(key: _tokenKey, value: token);
  }

  Future<String?> getToken() async {
    return await _secureStorage.read(key: _tokenKey);
  }

  Future<void> saveRefreshToken(String token) async {
    await _secureStorage.write(key: _refreshTokenKey, value: token);
  }

  Future<String?> getRefreshToken() async {
    return await _secureStorage.read(key: _refreshTokenKey);
  }

  Future<void> clearAuth() async {
    await _secureStorage.delete(key: _tokenKey);
    await _secureStorage.delete(key: _refreshTokenKey);
    await _prefs.remove(_userDataKey);
  }

  // ==================== User Data Management ====================
  
  static const String _userDataKey = 'user_data';

  Future<void> saveUserData(Map<String, dynamic> userData) async {
    final userJson = jsonEncode(userData);
    await _prefs.setString(_userDataKey, userJson);
  }

  Future<Map<String, dynamic>?> getUserData() async {
    final userJson = _prefs.getString(_userDataKey);
    if (userJson != null && userJson.isNotEmpty) {
      return jsonDecode(userJson) as Map<String, dynamic>;
    }
    return null;
  }

  Future<void> clearUserData() async {
    await _prefs.remove(_userDataKey);
  }

  // ==================== Profile Data Management ====================
  
  static const String _profileDataKey = 'profile_data';

  Future<void> saveProfileData(Map<String, dynamic> profileData) async {
    final profileJson = jsonEncode(profileData);
    await _prefs.setString(_profileDataKey, profileJson);
  }

  Future<Map<String, dynamic>?> getProfileData() async {
    final profileJson = _prefs.getString(_profileDataKey);
    if (profileJson != null && profileJson.isNotEmpty) {
      return jsonDecode(profileJson) as Map<String, dynamic>;
    }
    return null;
  }

  Future<void> clearProfileData() async {
    await _prefs.remove(_profileDataKey);
  }

  // ==================== App Settings ====================
  
  static const String _themeKey = 'theme_mode';
  static const String _languageKey = 'language';
  static const String _onboardingKey = 'onboarding_completed';

  Future<void> saveThemeMode(String themeMode) async {
    await _prefs.setString(_themeKey, themeMode);
  }

  Future<String?> getThemeMode() async {
    return _prefs.getString(_themeKey);
  }

  Future<void> saveLanguage(String languageCode) async {
    await _prefs.setString(_languageKey, languageCode);
  }

  Future<String?> getLanguage() async {
    return _prefs.getString(_languageKey);
  }

  Future<void> setOnboardingCompleted(bool completed) async {
    await _prefs.setBool(_onboardingKey, completed);
  }

  Future<bool> isOnboardingCompleted() async {
    return _prefs.getBool(_onboardingKey) ?? false;
  }

  // ==================== Generic Storage Methods ====================
  
  // String
  Future<void> saveString(String key, String value) async {
    await _prefs.setString(key, value);
  }

  String? getString(String key) {
    return _prefs.getString(key);
  }

  // Int
  Future<void> saveInt(String key, int value) async {
    await _prefs.setInt(key, value);
  }

  int? getInt(String key) {
    return _prefs.getInt(key);
  }

  // Bool
  Future<void> saveBool(String key, bool value) async {
    await _prefs.setBool(key, value);
  }

  bool? getBool(String key) {
    return _prefs.getBool(key);
  }

  // Double
  Future<void> saveDouble(String key, double value) async {
    await _prefs.setDouble(key, value);
  }

  double? getDouble(String key) {
    return _prefs.getDouble(key);
  }

  // List<String>
  Future<void> saveStringList(String key, List<String> value) async {
    await _prefs.setStringList(key, value);
  }

  List<String>? getStringList(String key) {
    return _prefs.getStringList(key);
  }

  // JSON Object
  Future<void> saveJson(String key, Map<String, dynamic> value) async {
    final jsonString = jsonEncode(value);
    await _prefs.setString(key, jsonString);
  }

  Map<String, dynamic>? getJson(String key) {
    final jsonString = _prefs.getString(key);
    if (jsonString != null && jsonString.isNotEmpty) {
      return jsonDecode(jsonString) as Map<String, dynamic>;
    }
    return null;
  }

  // Secure String (for sensitive data)
  Future<void> saveSecureString(String key, String value) async {
    await _secureStorage.write(key: key, value: value);
  }

  Future<String?> getSecureString(String key) async {
    return await _secureStorage.read(key: key);
  }

  Future<void> deleteSecureString(String key) async {
    await _secureStorage.delete(key: key);
  }

  // Remove specific key
  Future<void> remove(String key) async {
    await _prefs.remove(key);
  }

  // Check if key exists
  bool containsKey(String key) {
    return _prefs.containsKey(key);
  }

  // ==================== Clear All Data ====================
  
  Future<void> clearAll() async {
    await _secureStorage.deleteAll();
    await _prefs.clear();
  }

  Future<void> clearAllExceptSettings() async {
    final themeMode = getThemeMode();
    final language = getLanguage();
    final onboardingCompleted = isOnboardingCompleted();

    await clearAll();

    // Restore settings
    if (await themeMode != null) {
      await saveThemeMode((await themeMode)!);
    }
    if (await language != null) {
      await saveLanguage((await language)!);
    }
    await setOnboardingCompleted(await onboardingCompleted);
  }
}
