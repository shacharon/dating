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

  describe('listCountries with filter', () => {
    it('returns all countries without filter', async () => {
      const findMany = jest.fn().mockResolvedValue(
        Array.from({ length: 249 }, (_, i) => ({
          code: `C${i}`,
          nameEn: `Country ${i}`,
        })),
      );
      const places = serviceWith({ country: { findMany } });

      const countries = await places.listCountries();

      expect(countries).toHaveLength(249);
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: undefined,
          orderBy: { nameEn: 'asc' },
        }),
      );
    });

    it('returns 28 countries with onboarding filter', async () => {
      const findMany = jest.fn().mockResolvedValue([
        { code: 'AU', nameEn: 'Australia' },
        { code: 'CA', nameEn: 'Canada' },
        { code: 'GB', nameEn: 'United Kingdom' },
        { code: 'US', nameEn: 'United States' },
        { code: 'ES', nameEn: 'Spain' },
        { code: 'FR', nameEn: 'France' },
        { code: 'DE', nameEn: 'Germany' },
      ]);
      const places = serviceWith({ country: { findMany } });

      const countries = await places.listCountries('onboarding');

      expect(countries.length).toBeGreaterThan(0);
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            code: {
              in: expect.arrayContaining([
                'US',
                'GB',
                'CA',
                'AU',
                'ES',
                'FR',
                'DE',
                'IL',
              ]),
            },
          },
        }),
      );
    });

    it('moves US to first position when present', async () => {
      const findMany = jest.fn().mockResolvedValue([
        { code: 'AU', nameEn: 'Australia' },
        { code: 'CA', nameEn: 'Canada' },
        { code: 'GB', nameEn: 'United Kingdom' },
        { code: 'US', nameEn: 'United States' },
      ]);
      const places = serviceWith({ country: { findMany } });

      const countries = await places.listCountries('onboarding');

      expect(countries[0].code).toBe('US');
      expect(countries[0].nameEn).toBe('United States');
    });

    it('includes expected English-speaking countries in filter', async () => {
      const findMany = jest.fn().mockResolvedValue([
        { code: 'US', nameEn: 'United States' },
        { code: 'GB', nameEn: 'United Kingdom' },
        { code: 'CA', nameEn: 'Canada' },
        { code: 'AU', nameEn: 'Australia' },
        { code: 'NZ', nameEn: 'New Zealand' },
        { code: 'IE', nameEn: 'Ireland' },
      ]);
      const places = serviceWith({ country: { findMany } });

      const countries = await places.listCountries('onboarding');

      const codes = countries.map((c) => c.code);
      expect(codes).toContain('GB');
      expect(codes).toContain('CA');
      expect(codes).toContain('AU');
      expect(codes).toContain('NZ');
      expect(codes).toContain('IE');
    });

    it('includes expected Spanish-speaking countries in filter', async () => {
      const findMany = jest.fn().mockResolvedValue([
        { code: 'US', nameEn: 'United States' },
        { code: 'ES', nameEn: 'Spain' },
        { code: 'MX', nameEn: 'Mexico' },
        { code: 'AR', nameEn: 'Argentina' },
        { code: 'CO', nameEn: 'Colombia' },
        { code: 'PE', nameEn: 'Peru' },
        { code: 'CL', nameEn: 'Chile' },
      ]);
      const places = serviceWith({ country: { findMany } });

      const countries = await places.listCountries('onboarding');

      const codes = countries.map((c) => c.code);
      expect(codes).toContain('ES');
      expect(codes).toContain('MX');
      expect(codes).toContain('AR');
      expect(codes).toContain('CO');
      expect(codes).toContain('PE');
      expect(codes).toContain('CL');
    });

    it('includes expected EU countries in filter', async () => {
      const findMany = jest.fn().mockResolvedValue([
        { code: 'US', nameEn: 'United States' },
        { code: 'FR', nameEn: 'France' },
        { code: 'DE', nameEn: 'Germany' },
        { code: 'IT', nameEn: 'Italy' },
        { code: 'NL', nameEn: 'Netherlands' },
        { code: 'BE', nameEn: 'Belgium' },
        { code: 'SE', nameEn: 'Sweden' },
        { code: 'PL', nameEn: 'Poland' },
      ]);
      const places = serviceWith({ country: { findMany } });

      const countries = await places.listCountries('onboarding');

      const codes = countries.map((c) => c.code);
      expect(codes).toContain('FR');
      expect(codes).toContain('DE');
      expect(codes).toContain('IT');
      expect(codes).toContain('NL');
      expect(codes).toContain('BE');
      expect(codes).toContain('SE');
      expect(codes).toContain('PL');
    });
  });
});
