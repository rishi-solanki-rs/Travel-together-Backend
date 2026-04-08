import '../src/config/env.js';
import mongoose from 'mongoose';
import { pathToFileURL } from 'url';
import { connect, disconnect } from '../src/config/database.js';
import City from '../src/shared/models/City.model.js';
import Country from '../src/shared/models/Country.model.js';
import State from '../src/shared/models/State.model.js';
import { slugify } from '../src/utils/slugify.js';
import {
  DEFAULT_SECTIONS,
  buildCanonicalFromCity,
} from '../src/modules/cities/cities.service.js';

const parseFlags = (argv = process.argv.slice(2)) => {
  const args = argv;
  return {
    dryRun: args.includes('--dry-run') || !args.includes('--apply'),
    apply: args.includes('--apply'),
  };
};

const buildLookupMaps = async () => {
  const [countries, states] = await Promise.all([
    Country.find({ isDeleted: false }).lean(),
    State.find({ isDeleted: false }).lean(),
  ]);

  const countryBySlug = new Map(countries.map((item) => [slugify(item.name), item]));
  const stateByCountryAndSlug = new Map(
    states.map((item) => [
      `${String(item.countryId)}:${slugify(item.name)}`,
      item,
    ])
  );

  return { countryBySlug, stateByCountryAndSlug };
};

const ensureUniqueSlug = async (desiredSlug, cityId) => {
  let candidate = desiredSlug || `city-${Date.now()}`;
  let suffix = 1;

  while (true) {
    const existing = await City.findOne({ slug: candidate, _id: { $ne: cityId } }).lean();
    if (!existing) return candidate;
    candidate = `${desiredSlug}-${suffix++}`;
  }
};

const mapCountryStateRefs = ({ city, lookups }) => {
  const updates = {};

  if (!city.countryId && city.country) {
    const country = lookups.countryBySlug.get(slugify(city.country));
    if (country) updates.countryId = country._id;
  }

  if (!city.stateId && city.state) {
    const countryIdForState = updates.countryId || city.countryId;
    if (countryIdForState) {
      const state = lookups.stateByCountryAndSlug.get(
        `${String(countryIdForState)}:${slugify(city.state)}`
      );
      if (state) updates.stateId = state._id;
    }
  }

  return updates;
};

const buildPatchForCity = async (city, lookups) => {
  const canonical = buildCanonicalFromCity(city);

  const normalizedContent = {
    banner: { ...DEFAULT_SECTIONS.banner, ...canonical.banner },
    story: { ...DEFAULT_SECTIONS.story, ...canonical.story },
    introduction: { ...DEFAULT_SECTIONS.introduction, ...canonical.introduction },
    fraud: { ...DEFAULT_SECTIONS.fraud, ...canonical.fraud },
    attractions: { ...DEFAULT_SECTIONS.attractions, ...canonical.attractions },
    experiences: { ...DEFAULT_SECTIONS.experiences, ...canonical.experiences },
    gallery: { ...DEFAULT_SECTIONS.gallery, ...canonical.gallery },
    throughTheLenses: { ...DEFAULT_SECTIONS.gallery, ...canonical.gallery },
    faqs: { ...DEFAULT_SECTIONS.faqs, ...canonical.faqs },
    modules: { ...DEFAULT_SECTIONS.modules, ...canonical.modules },
  };

  const slug = city.slug ? city.slug : slugify(city.name || city._id.toString());
  const uniqueSlug = await ensureUniqueSlug(slug, city._id);
  const refUpdates = mapCountryStateRefs({ city, lookups });

  return {
    slug: uniqueSlug,
    content: normalizedContent,
    ...refUpdates,
  };
};

const runMigration = async (argv = process.argv.slice(2)) => {
  const flags = parseFlags(argv);
  await connect();

  const lookups = await buildLookupMaps();
  const cities = await City.find({ isDeleted: false }).lean();

  const summary = {
    scanned: cities.length,
    wouldUpdate: 0,
    updated: 0,
    skipped: 0,
  };

  const operations = [];

  for (const city of cities) {
    const patch = await buildPatchForCity(city, lookups);
    const hasChanges =
      JSON.stringify(city.content || {}) !== JSON.stringify(patch.content) ||
      city.slug !== patch.slug ||
      String(city.countryId || '') !== String(patch.countryId || '') ||
      String(city.stateId || '') !== String(patch.stateId || '');

    if (!hasChanges) {
      summary.skipped += 1;
      continue;
    }

    summary.wouldUpdate += 1;

    operations.push({
      updateOne: {
        filter: { _id: city._id },
        update: {
          $set: {
            slug: patch.slug,
            content: patch.content,
            ...(patch.countryId ? { countryId: patch.countryId } : {}),
            ...(patch.stateId ? { stateId: patch.stateId } : {}),
          },
        },
      },
    });
  }

  if (flags.apply && operations.length) {
    const result = await City.bulkWrite(operations, { ordered: false });
    summary.updated = result.modifiedCount || 0;
  }

  console.log(JSON.stringify({ mode: flags.apply ? 'apply' : 'dry-run', summary }, null, 2));

  await disconnect();
  await mongoose.connection.close();
};

export { parseFlags, mapCountryStateRefs, buildPatchForCity, runMigration };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMigration().catch(async (error) => {
    console.error('City Geo CMS v2 migration failed:', error);
    await disconnect();
    process.exit(1);
  });
}
