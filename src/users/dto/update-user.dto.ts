import { IsString, IsOptional, IsEmail, IsNumber, Min, Max } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
  foto_perfil_url?: string;

  @IsOptional()
  @IsString()
  localizacao_geo?: string; // JSON: { latitude: number, longitude: number }

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(100)
  raio_maximo?: number; // Alcance máximo em km (5, 10, 20, 50, 100)
}
