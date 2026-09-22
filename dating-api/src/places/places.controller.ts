import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PlacesService } from './places.service';

@Controller('api/v1/places')
@UseGuards(AuthGuard)
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @Get('countries')
  async countries() {
    const countries = await this.places.listCountries();
    return { countries };
  }

  @Get('us-states')
  async usStates() {
    const states = await this.places.listUsStates();
    return { states };
  }

  @Get('cities')
  async cities(
    @Query('country') country: string,
    @Query('usState') usState?: string,
  ) {
    const cities = await this.places.listCities(country ?? '', usState);
    return { cities };
  }
}
