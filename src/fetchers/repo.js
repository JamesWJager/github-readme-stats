// @ts-check

import { MissingParamError } from "../common/error.js";
import { request } from "../common/http.js";
import { retryer } from "../common/retryer.js";

/**
 * Repo data fetcher.
 *
 * @param {object} variables Fetcher variables.
 * @param {string} token GitHub token.
 * @returns {Promise<import('axios').AxiosResponse>} The response.
 */
const fetcher = (variables, token) => {
  return request(
    {
      query: `
      fragment RepoInfo on Repository {
        name
        nameWithOwner
        isPrivate
        isArchived
        isTemplate
        stargazers {
          totalCount
        }
        description
        primaryLanguage {
          color
          id
          name
        }
        forkCount
      }
      query getRepo($login: String!, $repo: String!) {
        user(login: $login) {
          repository(name: $repo) {
            ...RepoInfo
          }
        }
        organization(login: $login) {
          repository(name: $repo) {
            ...RepoInfo
          }
        }
      }
    `,
      variables,
    },
    {
      Authorization: `token ${token}`,
    },
  );
};

const urlExample = "/api/pin?username=USERNAME&amp;repo=REPO_NAME";

const privateReposAllowed = () => process.env.ALLOW_PRIVATE_REPOS === "true";

const getPatCount = () =>
  Object.keys(process.env).filter((key) => /^PAT_\d+$/.test(key)).length;

/**
 * @param {any} data GraphQL response data.
 * @returns {{ repository: any; ownerType: "user" | "org" } | null}
 */
const parseRepoFromData = (data) => {
  if (!data?.user && !data?.organization) {
    return null;
  }

  const isUser = data.organization === null && data.user;
  const isOrg = data.user === null && data.organization;

  if (isUser && data.user.repository) {
    return { repository: data.user.repository, ownerType: "user" };
  }

  if (isOrg && data.organization.repository) {
    return { repository: data.organization.repository, ownerType: "org" };
  }

  return null;
};

/**
 * @param {any} data GraphQL response data.
 * @returns {"user" | "org" | null}
 */
const getOwnerType = (data) => {
  if (!data?.user && !data?.organization) {
    return null;
  }

  if (data.organization === null && data.user) {
    return "user";
  }

  if (data.user === null && data.organization) {
    return "org";
  }

  return null;
};

/**
 * @typedef {import("./types").RepositoryData} RepositoryData Repository data.
 */

/**
 * Fetch repository data.
 *
 * @param {string} username GitHub username.
 * @param {string} reponame GitHub repository name.
 * @returns {Promise<RepositoryData>} Repository data.
 */
const fetchRepo = async (username, reponame) => {
  if (!username && !reponame) {
    throw new MissingParamError(["username", "repo"], urlExample);
  }
  if (!username) {
    throw new MissingParamError(["username"], urlExample);
  }
  if (!reponame) {
    throw new MissingParamError(["repo"], urlExample);
  }

  const patCount = getPatCount();
  const attempts = patCount || 1;
  let accountExists = false;
  /** @type {"user" | "org" | null} */
  let lastOwnerType = null;

  for (let i = 0; i < attempts; i++) {
    if (patCount && !process.env[`PAT_${i + 1}`]) {
      continue;
    }

    const res = await retryer(fetcher, { login: username, repo: reponame }, i);
    const data = res.data?.data;

    if (getOwnerType(data)) {
      accountExists = true;
      lastOwnerType = getOwnerType(data);
    }

    const parsed = parseRepoFromData(data);
    if (!parsed) {
      continue;
    }

    const { repository, ownerType } = parsed;

    if (!privateReposAllowed() && repository.isPrivate) {
      throw new Error(
        ownerType === "user"
          ? "User Repository Not found"
          : "Organization Repository Not found",
      );
    }

    return {
      ...repository,
      starCount: repository.stargazers.totalCount,
    };
  }

  if (!accountExists) {
    throw new Error("Not found");
  }

  throw new Error(
    lastOwnerType === "org"
      ? "Organization Repository Not found"
      : "User Repository Not found",
  );
};

export { fetchRepo };
export default fetchRepo;
