import { BadRequestException } from '@nestjs/common';
import { PlacesService } from './places.service';

function serviceWith(prisma: Record<string, unknown>) {
  return new PlacesService(prisma as never);
}

describe('PlacesService', () => {
  it('returns Israel cities with Hebrew names', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { id: 'city_IL_na_tel_aviv', nameEn: 'Tel Aviv', nameHe: 'תל אביב-יפו' },
    ]);
    const places = serviceWith({
      country: { findUnique: jest.fn().mockResolvedValue({ code: 'IL' }) },
      city: { findMany },
    });

    const rows = await places.listCities('IL');
    expect(rows[0].nameHe).toBe('תל אביב-יפו');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { countryCode: 'IL' },
        select: { id: true, nameEn: true, nameHe: true },
      }),
    );
  });

  it('rejects a US city list when the state is missing', async () => {
    const places = serviceWith({
      country: { findUnique: jest.fn().mockResolvedValue({ code: 'US' }) },
      city: { findMany: jest.fn() },
    });
    await expect(places.listCities('US')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns California cities without Hebrew names', async () => {
    const findMany = jest.fn().mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({
        id: `city_${i}`,
        nameEn: `City ${i}`,
        nameHe: null,
      })),
    );
    const places = serviceWith({
      country: { findUnique: jest.fn().mockResolvedValue({ code: 'US' }) },
      city: { findMany },
    });

    const rows = await places.listCities('US', 'CA');
    expect(rows).toHaveLength(10);
    expect(rows.every((row) => row.nameHe === null)).toBe(true);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { countryCode: 'US', usStateCode: 'CA' },
      }),
    );
  });

  it('writes city, country, and location label from the chosen city', async () => {
    const places = serviceWith({
      city: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'city_IL_na_tel_aviv',
          nameEn: 'Tel Aviv',
          countryCode: 'IL',
          usStateCode: null,
        }),
      },
    });
    const data: Record<string, unknown> = {};
    await places.applyPlaceSelection(
      { cityId: 'city_IL_na_tel_aviv', country: 'IL' },
      data as never,
      'update',
    );
    expect(data.city).toBe('Tel Aviv');
    expect(data.country).toBe('IL');
    expect(data.locationLabel).toBe('Tel Aviv, IL');
    expect(data.placeCity).toEqual({ connect: { id: 'city_IL_na_tel_aviv' } });
  });
});
