import {
  IsDateString,
  IsInt,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateAdDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  imageMobileUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  imageAltText?: string;

  @IsOptional()
  @IsString()
  displayMode?: string;

  @IsOptional()
  @IsString()
  creativeSize?: string;

  @IsOptional()
  @IsString()
  targetUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  placements?: string[];

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  priority?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  competitionGroupId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  impressionsLimit?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  clicksLimit?: number | null;
}
