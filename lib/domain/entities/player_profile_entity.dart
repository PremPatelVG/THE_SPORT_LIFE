import 'package:equatable/equatable.dart';

class PlayerProfileEntity extends Equatable {
  final String? id;
  final String name;
  final String gender;
  final String handedness;
  final List<String> sports;
  final String sportLevel;
  final String? avatar;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const PlayerProfileEntity({
    this.id,
    required this.name,
    required this.gender,
    required this.handedness,
    required this.sports,
    required this.sportLevel,
    this.avatar,
    this.createdAt,
    this.updatedAt,
  });

  @override
  List<Object?> get props => [
        id,
        name,
        gender,
        handedness,
        sports,
        sportLevel,
        avatar,
        createdAt,
        updatedAt,
      ];
}
