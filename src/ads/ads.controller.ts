import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AdsService } from './ads.service';
import { GetAdSlotDto } from './dto/get-ad-slot.dto';
import { TrackAdEventDto } from './dto/track-ad-event.dto';

@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get()
  getAdForPlacement(@Query() query: GetAdSlotDto) {
    return this.adsService.getAdForPlacement(query.placement);
  }

  @Post(':id/impression')
  trackImpression(
    @Param('id') id: string,
    @Body() trackAdEventDto: TrackAdEventDto,
  ) {
    return this.adsService.trackImpression(id, trackAdEventDto);
  }

  @Post(':id/click')
  trackClick(@Param('id') id: string, @Body() trackAdEventDto: TrackAdEventDto) {
    return this.adsService.trackClick(id, trackAdEventDto);
  }
}
