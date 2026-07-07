import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAdCompetitionGroupDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}
