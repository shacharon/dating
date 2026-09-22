import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type PlaceWriteBody = {
  cityId?: string | null;
  usStateCode?: string | null;
  country?: string | null;
};

@Injectable()
export class PlacesService {
  constructor(private readonly prisma: PrismaService) {}

  listCountries() {
    return this.prisma.country.findMany({
      orderBy: { nameEn: 'asc' },
      select: { code: true, nameEn: true },
    });
  }

  async listUsStates() {
    const states = await this.prisma.usState.findMany({
      orderBy: { nameEn: 'asc' },
      include: { _count: { select: { cities: true } } },
    });
    return states.map((state) => ({
      code: state.code,
      nameEn: state.nameEn,
      hasCities: state._count.cities > 0,
    }));
  }

  async listCities(country: string, usState?: string) {
    const code = country.trim().toUpperCase();
    const countryRow = await this.prisma.country.findUnique({
      where: { code },
    });
    if (!countryRow) {
      throw new BadRequestException({ error: 'unknown_country' });
    }
    if (code === 'US' && !usState?.trim()) {
      throw new BadRequestException({ error: 'us_state_required' });
    }
    const rows = await this.prisma.city.findMany({
      where: {
        countryCode: code,
        ...(code === 'US' ? { usStateCode: usState!.trim().toUpperCase() } : {}),
      },
      orderBy: { nameEn: 'asc' },
      select: { id: true, nameEn: true, nameHe: true },
    });
    return rows;
  }

  /**
   * When the client sends cityId, replace free-text location with the place row.
   * Create cannot disconnect a relation that was never set.
   */
  async applyPlaceSelection(
    body: PlaceWriteBody,
    data: Prisma.UserProfileUpdateInput,
    mode: 'create' | 'update',
  ): Promise<void> {
    if (body.cityId === undefined) return;

    if (body.cityId) {
      const city = await this.prisma.city.findUnique({
        where: { id: body.cityId },
      });
      if (!city) {
        throw new BadRequestException({ error: 'unknown_city' });
      }
      if (body.country && body.country.toUpperCase() !== city.countryCode) {
        throw new BadRequestException({ error: 'city_country_mismatch' });
      }
      if (
        body.usStateCode &&
        body.usStateCode.toUpperCase() !== (city.usStateCode ?? '')
      ) {
        throw new BadRequestException({ error: 'city_state_mismatch' });
      }
      data.placeCity = { connect: { id: city.id } };
      data.usState = city.usStateCode
        ? { connect: { code: city.usStateCode } }
        : mode === 'update'
          ? { disconnect: true }
          : undefined;
      data.country = city.countryCode;
      data.city = city.nameEn;
      data.locationLabel = city.usStateCode
        ? `${city.nameEn}, ${city.usStateCode}`
        : `${city.nameEn}, ${city.countryCode}`;
      return;
    }

    const countryCode = body.country?.trim().toUpperCase() || null;
    if (!countryCode) {
      data.city = null;
      data.country = null;
      data.locationLabel = null;
      if (mode === 'update') {
        data.placeCity = { disconnect: true };
        data.usState = { disconnect: true };
      }
      return;
    }

    const country = await this.prisma.country.findUnique({
      where: { code: countryCode },
    });
    if (!country) {
      throw new BadRequestException({ error: 'unknown_country' });
    }

    if (countryCode === 'US') {
      const stateCode = body.usStateCode?.trim().toUpperCase();
      if (!stateCode) {
        throw new BadRequestException({ error: 'us_state_required' });
      }
      const state = await this.prisma.usState.findUnique({
        where: { code: stateCode },
      });
      if (!state) {
        throw new BadRequestException({ error: 'unknown_us_state' });
      }
      const cityCount = await this.prisma.city.count({
        where: { countryCode: 'US', usStateCode: stateCode },
      });
      if (cityCount > 0) {
        throw new BadRequestException({ error: 'city_required' });
      }
      data.city = null;
      data.country = 'US';
      data.locationLabel = `${state.nameEn}, US`;
      data.usState = { connect: { code: stateCode } };
      if (mode === 'update') data.placeCity = { disconnect: true };
      return;
    }

    const cityCount = await this.prisma.city.count({
      where: { countryCode },
    });
    if (cityCount > 0) {
      throw new BadRequestException({ error: 'city_required' });
    }
    data.city = null;
    data.country = country.code;
    data.locationLabel = country.nameEn;
    data.usState = mode === 'update' ? { disconnect: true } : undefined;
    if (mode === 'update') data.placeCity = { disconnect: true };
  }
}
