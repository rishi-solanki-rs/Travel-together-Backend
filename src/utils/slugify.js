import slugifyLib from 'slugify';

const slugify = (text, options = {}) => {
  return slugifyLib(text, {
    lower: true,
    strict: true,
    trim: true,
    replacement: '-',
    ...options,
  });
};

const generateUniqueSlug = async (text, Model, field = 'slug', excludeId = null) => {
  let slug = slugify(text);
  let counter = 0;
  let isUnique = false;

  while (!isUnique) {
    const query = { [field]: slug };
    if (excludeId) query._id = { $ne: excludeId };
    const existing = await Model.findOne(query).lean();
    if (!existing) {
      isUnique = true;
    } else {
      counter++;
      slug = `${slugify(text)}-${counter}`;
    }
  }

  return slug;
};

export { slugify, generateUniqueSlug };
