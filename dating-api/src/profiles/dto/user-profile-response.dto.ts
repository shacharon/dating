export interface UserProfileResponseDto {
  id: string;
  name: string;
  aboutMe: string;
  aboutPartner: string | null;
  aboutRelationship: string | null;
  createdAt: string;
  updatedAt: string;
}
