import { IsString } from 'class-validator';

export class TrackAdEventDto {
  @IsString()
  trackingToken: string;
}
