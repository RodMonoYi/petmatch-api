import { IsString, IsIn } from 'class-validator';

export class CreateMatchDto {
  @IsString()
  fk_pet_id_2: string; // O pet que está sendo "curtido"

  @IsString()
  @IsIn(['like', 'dislike'])
  action: 'like' | 'dislike';
}

