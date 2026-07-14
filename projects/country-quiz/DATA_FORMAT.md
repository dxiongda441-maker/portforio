# World Country Quiz data formats

## Local state

Learning records are stored in IndexedDB under `world-country-quiz-db`. State schema version 3 contains per-country results, the first correct-answer timestamp used as a passport stamp, daily totals, session history, child/detailed mode preferences, and optional custom country master entries. Older records are migrated without removing answers; countries already answered correctly receive a passport stamp during migration.

## Backup

The app exports JSON with `format`, `formatVersion`, `exportedAt`, and `data`. Restore supports merging with the current record or replacing it completely.

Passport stamps are merged using the earliest valid stamp date so restoring a backup does not award a country twice.

## Country master

The bundled master is `data/countries.json`. It contains 193 UN member states plus Vatican City and Palestine. Country outlines and flags are bundled separately for offline use.

Custom master imports accept a `countries` or `entries` array. Each entry needs a stable three-letter `iso3` and `nameJa`. Optional fields include `iso2`, `nameEn`, `capital`, `region`, `subregion`, `latlng`, `area`, `languages`, `currencies`, `flag`, `flagPath`, and `feature`.

Country illustrations are generated locally from each country's region, `feature` text, and its unique GeoJSON outline. They do not download third-party photos and remain available offline.

The passport map is derived from `progress.byCountry[iso3].correct`: countries with at least one correct answer are colored, while unanswered and incorrect-only countries remain unfilled. Wrong answers may be inserted once later in the active quiz session; this temporary retry queue is not stored in backups.

Bundled country, flag, and boundary data is derived from [mledoze/countries](https://github.com/mledoze/countries) under ODbL-1.0. The source license is preserved in `data/LICENSE-countries.txt`.
