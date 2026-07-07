import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAdCompetitionGroupDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
