-- Seed main cities for onboarding countries that previously had none
-- (English/Spanish/EU filter beyond US/IL/GB/ES/FR/DE/IT/NL/PL/PT)

INSERT INTO "city" ("id", "country_code", "us_state_code", "name_en", "name_he", "lat", "lng") VALUES
-- Canada
('city_CA_na_toronto', 'CA', NULL, 'Toronto', NULL, 43.653226, -79.383184),
('city_CA_na_vancouver', 'CA', NULL, 'Vancouver', NULL, 49.282729, -123.120738),
('city_CA_na_montreal', 'CA', NULL, 'Montreal', NULL, 45.501689, -73.567256),
('city_CA_na_calgary', 'CA', NULL, 'Calgary', NULL, 51.044733, -114.071883),
('city_CA_na_ottawa', 'CA', NULL, 'Ottawa', NULL, 45.421530, -75.697193),
('city_CA_na_edmonton', 'CA', NULL, 'Edmonton', NULL, 53.546124, -113.493823),
('city_CA_na_winnipeg', 'CA', NULL, 'Winnipeg', NULL, 49.895136, -97.138374),
('city_CA_na_quebec_city', 'CA', NULL, 'Quebec City', NULL, 46.813878, -71.207981),
-- Australia
('city_AU_na_sydney', 'AU', NULL, 'Sydney', NULL, -33.868820, 151.209296),
('city_AU_na_melbourne', 'AU', NULL, 'Melbourne', NULL, -37.813628, 144.963058),
('city_AU_na_brisbane', 'AU', NULL, 'Brisbane', NULL, -27.469771, 153.025124),
('city_AU_na_perth', 'AU', NULL, 'Perth', NULL, -31.950527, 115.860458),
('city_AU_na_adelaide', 'AU', NULL, 'Adelaide', NULL, -34.928499, 138.600746),
('city_AU_na_canberra', 'AU', NULL, 'Canberra', NULL, -35.280937, 149.130009),
('city_AU_na_gold_coast', 'AU', NULL, 'Gold Coast', NULL, -28.016667, 153.400000),
('city_AU_na_hobart', 'AU', NULL, 'Hobart', NULL, -42.882137, 147.327195),
-- New Zealand
('city_NZ_na_auckland', 'NZ', NULL, 'Auckland', NULL, -36.848461, 174.763336),
('city_NZ_na_wellington', 'NZ', NULL, 'Wellington', NULL, -41.286460, 174.776236),
('city_NZ_na_christchurch', 'NZ', NULL, 'Christchurch', NULL, -43.532054, 172.636225),
('city_NZ_na_hamilton', 'NZ', NULL, 'Hamilton', NULL, -37.787001, 175.279343),
('city_NZ_na_dunedin', 'NZ', NULL, 'Dunedin', NULL, -45.878761, 170.502798),
-- Ireland
('city_IE_na_dublin', 'IE', NULL, 'Dublin', NULL, 53.349805, -6.260310),
('city_IE_na_cork', 'IE', NULL, 'Cork', NULL, 51.896893, -8.486316),
('city_IE_na_galway', 'IE', NULL, 'Galway', NULL, 53.270668, -9.056791),
('city_IE_na_limerick', 'IE', NULL, 'Limerick', NULL, 52.663857, -8.626773),
('city_IE_na_waterford', 'IE', NULL, 'Waterford', NULL, 52.259319, -7.110070),
-- Mexico
('city_MX_na_mexico_city', 'MX', NULL, 'Mexico City', NULL, 19.432608, -99.133209),
('city_MX_na_guadalajara', 'MX', NULL, 'Guadalajara', NULL, 20.659699, -103.349609),
('city_MX_na_monterrey', 'MX', NULL, 'Monterrey', NULL, 25.686613, -100.316116),
('city_MX_na_puebla', 'MX', NULL, 'Puebla', NULL, 19.041440, -98.206273),
('city_MX_na_tijuana', 'MX', NULL, 'Tijuana', NULL, 32.514946, -117.038247),
('city_MX_na_cancun', 'MX', NULL, 'Cancun', NULL, 21.161908, -86.851528),
-- Argentina
('city_AR_na_buenos_aires', 'AR', NULL, 'Buenos Aires', NULL, -34.603684, -58.381559),
('city_AR_na_cordoba', 'AR', NULL, 'Cordoba', NULL, -31.420083, -64.188776),
('city_AR_na_rosario', 'AR', NULL, 'Rosario', NULL, -32.944641, -60.650538),
('city_AR_na_mendoza', 'AR', NULL, 'Mendoza', NULL, -32.889459, -68.845839),
('city_AR_na_la_plata', 'AR', NULL, 'La Plata', NULL, -34.920495, -57.953566),
-- Chile
('city_CL_na_santiago', 'CL', NULL, 'Santiago', NULL, -33.448890, -70.669265),
('city_CL_na_valparaiso', 'CL', NULL, 'Valparaiso', NULL, -33.047238, -71.612686),
('city_CL_na_concepcion', 'CL', NULL, 'Concepcion', NULL, -36.820135, -73.044390),
('city_CL_na_antofagasta', 'CL', NULL, 'Antofagasta', NULL, -23.650930, -70.397502),
-- Colombia
('city_CO_na_bogota', 'CO', NULL, 'Bogota', NULL, 4.710989, -74.072092),
('city_CO_na_medellin', 'CO', NULL, 'Medellin', NULL, 6.244203, -75.581215),
('city_CO_na_cali', 'CO', NULL, 'Cali', NULL, 3.451647, -76.531985),
('city_CO_na_barranquilla', 'CO', NULL, 'Barranquilla', NULL, 10.968540, -74.781319),
('city_CO_na_cartagena', 'CO', NULL, 'Cartagena', NULL, 10.391049, -75.479426),
-- Peru
('city_PE_na_lima', 'PE', NULL, 'Lima', NULL, -12.046374, -77.042793),
('city_PE_na_arequipa', 'PE', NULL, 'Arequipa', NULL, -16.409047, -71.537451),
('city_PE_na_cusco', 'PE', NULL, 'Cusco', NULL, -13.531950, -71.967463),
('city_PE_na_trujillo', 'PE', NULL, 'Trujillo', NULL, -8.111679, -79.028740),
-- Austria
('city_AT_na_vienna', 'AT', NULL, 'Vienna', NULL, 48.208174, 16.373819),
('city_AT_na_graz', 'AT', NULL, 'Graz', NULL, 47.070714, 15.439504),
('city_AT_na_linz', 'AT', NULL, 'Linz', NULL, 48.306940, 14.285830),
('city_AT_na_salzburg', 'AT', NULL, 'Salzburg', NULL, 47.809490, 13.055010),
-- Belgium
('city_BE_na_brussels', 'BE', NULL, 'Brussels', NULL, 50.850346, 4.351721),
('city_BE_na_antwerp', 'BE', NULL, 'Antwerp', NULL, 51.219448, 4.402464),
('city_BE_na_ghent', 'BE', NULL, 'Ghent', NULL, 51.054342, 3.717424),
('city_BE_na_bruges', 'BE', NULL, 'Bruges', NULL, 51.209348, 3.224700),
-- Czech Republic
('city_CZ_na_prague', 'CZ', NULL, 'Prague', NULL, 50.075538, 14.437800),
('city_CZ_na_brno', 'CZ', NULL, 'Brno', NULL, 49.195060, 16.606837),
('city_CZ_na_ostrava', 'CZ', NULL, 'Ostrava', NULL, 49.820923, 18.262524),
-- Denmark
('city_DK_na_copenhagen', 'DK', NULL, 'Copenhagen', NULL, 55.676098, 12.568337),
('city_DK_na_aarhus', 'DK', NULL, 'Aarhus', NULL, 56.162939, 10.203921),
('city_DK_na_odense', 'DK', NULL, 'Odense', NULL, 55.403756, 10.402370),
-- Finland
('city_FI_na_helsinki', 'FI', NULL, 'Helsinki', NULL, 60.169856, 24.938379),
('city_FI_na_espoo', 'FI', NULL, 'Espoo', NULL, 60.205491, 24.655891),
('city_FI_na_tampere', 'FI', NULL, 'Tampere', NULL, 61.497752, 23.760954),
-- Greece
('city_GR_na_athens', 'GR', NULL, 'Athens', NULL, 37.983810, 23.727539),
('city_GR_na_thessaloniki', 'GR', NULL, 'Thessaloniki', NULL, 40.640063, 22.944419),
('city_GR_na_patras', 'GR', NULL, 'Patras', NULL, 38.246640, 21.734574),
-- Hungary
('city_HU_na_budapest', 'HU', NULL, 'Budapest', NULL, 47.497912, 19.040235),
('city_HU_na_debrecen', 'HU', NULL, 'Debrecen', NULL, 47.531605, 21.627312),
('city_HU_na_szeged', 'HU', NULL, 'Szeged', NULL, 46.253000, 20.141425),
-- Romania
('city_RO_na_bucharest', 'RO', NULL, 'Bucharest', NULL, 44.426767, 26.102538),
('city_RO_na_cluj', 'RO', NULL, 'Cluj-Napoca', NULL, 46.771210, 23.623635),
('city_RO_na_timisoara', 'RO', NULL, 'Timisoara', NULL, 45.748872, 21.208679),
-- Sweden
('city_SE_na_stockholm', 'SE', NULL, 'Stockholm', NULL, 59.329323, 18.068581),
('city_SE_na_gothenburg', 'SE', NULL, 'Gothenburg', NULL, 57.708870, 11.974560),
('city_SE_na_malmo', 'SE', NULL, 'Malmo', NULL, 55.604981, 13.003822)
ON CONFLICT ("id") DO NOTHING;
