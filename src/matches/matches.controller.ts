import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Post('swipe/:petId')
  swipe(
    @Param('petId') petId: string,
    @Body() createMatchDto: CreateMatchDto,
  ) {
    return this.matchesService.swipe(createMatchDto, petId);
  }

  @Get('my-matches')
  findMyMatches(@Request() req) {
    return this.matchesService.findUserMatches(req.user.id);
  }

  @Get('potential/:petId')
  getPotentialMatches(
    @Param('petId') petId: string,
    @Query('limit') limit?: number,
  ) {
    return this.matchesService.getPotentialMatches(petId, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.matchesService.findOne(id);
  }
}

