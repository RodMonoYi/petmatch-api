import { IsString } from 'class-validator';

export class UpdateAdStatusDto {
  @IsString()
  status: string;
}
