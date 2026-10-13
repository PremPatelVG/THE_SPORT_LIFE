import 'package:equatable/equatable.dart';

class UserEntity extends Equatable {
  final String id;
  final String email;
  final String? name;
  final String? phone;
  final String? avatar;
  final String? role;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const UserEntity({
    required this.id,
    required this.email,
    this.name,
    this.phone,
    this.avatar,
    this.role,
    this.createdAt,
    this.updatedAt,
  });

  @override
  List<Object?> get props => [id, email, name, phone, avatar, role, createdAt, updatedAt];
}
