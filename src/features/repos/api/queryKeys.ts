export const repoKeys = {
  all: ['repos'] as const,
  // GitHub org/user/repo names are case-insensitive, so cache keys are normalized to lowercase —
  // otherwise "facebook" and "Facebook" would get separate, redundant cache entries.
  orgList: (org: string) =>
    [...repoKeys.all, 'list', org.toLowerCase()] as const,
  detail: (owner: string, repo: string) =>
    [
      ...repoKeys.all,
      'detail',
      owner.toLowerCase(),
      repo.toLowerCase(),
    ] as const,
};
