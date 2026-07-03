import {
  IsString,
  IsDateString,
  IsBoolean,
  IsOptional,
  IsArray,
} from 'class-validator';

export class CreatePetDto {
  @IsString()
  nome: string;

  @IsString()
  especie: string;

  @IsString()
  raca: string;

  @IsDateString()
  data_nascimento: string;

  @IsString()
  genero: string;

  @IsString()
  porte: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsArray()
  fotos?: string[];

  @IsOptional()
  @IsBoolean()
  pedigree?: boolean;

  @IsOptional()
  dados_saude?: any;

  @IsOptional()
  @IsBoolean()
  disponivel_reproducao?: boolean;

  @IsOptional()
  @IsBoolean()
  aceita_viagem?: boolean;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
