import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { PetDictionaryCategory } from '../../entities/pet-dictionary-entry.entity';

export class CreatePetDictionaryEntryDto {
  @IsIn(['species', 'breed'])
  category: PetDictionaryCategory;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  speciesCanonicalKey?: string;

  @IsString()
  @MaxLength(120)
  label: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  canonicalKey?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
