# Story 5: Fill the MVP place tables

**Status:** Done  
**Shipped on main:** `e6a9a0f`  
**Feature tip ahead of main:** 0  
**Depends on:** none  
**Blocks:** Story 6 (the location control reads these tables)

## Why

Proximity is a matching dimension, and profiles store `maxDistanceKm`. The check does not measure kilometers today because a profile has no coordinates. A city list with lat/lng is the data that can feed that check later. This story only fills the tables.

## What

**As a** product owner preparing location  
**I want** countries, US states, and the agreed city lists stored in tables  
**So that** Story 6 can offer a city dropdown with coordinates

### Tables

`country` — `code` (ISO alpha-2, PK), `name_en`

`us_state` — `code` (USPS, PK), `name_en`

`city` — `id`, `country_code`, `us_state_code` (null outside the US), `name_en`, `name_he` (required for Israel, null elsewhere), `lat`, `lng`

### Acceptance criteria

- [x] Every ISO country is in `country`, English name only (249)
- [x] All 50 US states plus DC are in `us_state` (51)
- [x] Main cities, not every town, for these US states: California, Texas, Florida, New York, Pennsylvania, Illinois, Ohio, Georgia, North Carolina, Michigan (10 each)
- [x] Israel’s main cities have `name_en` and `name_he` (15)
- [x] Main cities for Britain, Spain, France, Germany, Italy, Poland, the Netherlands, and Portugal (10 each)
- [x] Every city row has `lat` and `lng`
- [x] No Hebrew names except Israel cities

### Out of scope

- The Basics dropdown (Story 6)
- Saving a chosen city on the profile
- Changing `evalProximity` to use these coordinates
- Cities in countries not listed above
- Hebrew names for countries or for non-Israel cities

## Definition of done

- [x] Migration creates the three tables (`20260922160000_place_tables`)
- [x] Seed data matches the lists above (195 cities)
- [x] A query can return cities for `IL` with Hebrew names and cities for `US` + `CA` with coordinates
