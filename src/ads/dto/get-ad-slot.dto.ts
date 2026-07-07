import { IsString, MaxLength } from 'class-validator';

export class GetAdSlotDto {
  @IsString()
  @MaxLength(120)
  placement: string;
}
