import 'package:equatable/equatable.dart';
import '../../../domain/entities/player_profile_entity.dart';

abstract class ProfileState extends Equatable {
  const ProfileState();
  
  @override
  List<Object?> get props => [];
}

class ProfileInitial extends ProfileState {}

class ProfileLoading extends ProfileState {}

class ProfileCreated extends ProfileState {
  final PlayerProfileEntity profile;
  
  const ProfileCreated(this.profile);
  
  @override
  List<Object?> get props => [profile];
}

class ProfileLoaded extends ProfileState {
  final PlayerProfileEntity profile;
  
  const ProfileLoaded(this.profile);
  
  @override
  List<Object?> get props => [profile];
}

class ProfileError extends ProfileState {
  final String message;
  
  const ProfileError(this.message);
  
  @override
  List<Object?> get props => [message];
}
