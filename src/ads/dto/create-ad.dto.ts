import {
  ArrayNotEmpty,
  IsDateString,
  IsInt,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAdDto {
  @IsString()
  type: string;

  @IsString()
  @MaxLength(160)
  title: string;

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

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  placements: string[];

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;

  @IsInt()
  @Min(1)
  priority: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  competitionGroupId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  impressionsLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  clicksLimit?: number;
}
