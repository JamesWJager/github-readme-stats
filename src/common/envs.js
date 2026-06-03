// @ts-check

const parseCommaSeparatedEnv = (value) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const whitelist = process.env.WHITELIST
  ? parseCommaSeparatedEnv(process.env.WHITELIST)
  : undefined;

const gistWhitelist = process.env.GIST_WHITELIST
  ? parseCommaSeparatedEnv(process.env.GIST_WHITELIST)
  : undefined;

const excludeRepositories = process.env.EXCLUDE_REPO
  ? parseCommaSeparatedEnv(process.env.EXCLUDE_REPO)
  : [];

export { whitelist, gistWhitelist, excludeRepositories };
