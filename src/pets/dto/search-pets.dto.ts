import { IsOptional, IsString, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';

const toBoolean = ({ value }: { value: unknown }) => {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
};

export class SearchPetsDto {
  @IsOptional()
  @IsString()
  especie?: string;

  @IsOptional()
  @IsString()
  raca?: string;

  @IsOptional()
  @IsString()
  genero?: string;

  @IsOptional()
  @IsString()
  porte?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  pedigree?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  vacinado?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  disponivel_reproducao?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  aceita_viagem?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(30)
  idade_min?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(30)
  idade_max?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  raio?: number; // em km

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
