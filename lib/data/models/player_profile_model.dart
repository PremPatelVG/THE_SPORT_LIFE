import '../../domain/entities/player_profile_entity.dart';

class PlayerProfileModel extends PlayerProfileEntity {
  const PlayerProfileModel({
    super.id,
    required super.name,
    required super.gender,
    required super.handedness,
    required super.sports,
    required super.sportLevel,
    super.avatar,
    super.createdAt,
    super.updatedAt,
  });

  factory PlayerProfileModel.fromJson(Map<String, dynamic> json) {
    return PlayerProfileModel(
      id: json['_id'] ?? json['id'],
      name: json['name'] ?? '',
      gender: json['gender'] ?? '',
      handedness: json['handedness'] ?? '',
      sports: List<String>.from(json['sports'] ?? []),
      sportLevel: json['sportLevel'] ?? '',
      avatar: json['avatar'],
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt']) 
          : null,
      updatedAt: json['updatedAt'] != null 
          ? DateTime.parse(json['updatedAt']) 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'name': name,
      'gender': gender,
      'handedness': handedness,
      'sports': sports,
      'sportLevel': sportLevel,
      if (avatar != null) 'avatar': avatar,
      if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
    };
  }

  factory PlayerProfileModel.fromEntity(PlayerProfileEntity entity) {
    return PlayerProfileModel(
      id: entity.id,
      name: entity.name,
      gender: entity.gender,
      handedness: entity.handedness,
      sports: entity.sports,
      sportLevel: entity.sportLevel,
      avatar: entity.avatar,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    );
  }
}
