export const repoKeys = {
  all: ['repos'] as const,
  // Shared prefix for every org-list query, regardless of org — lets a consumer (e.g. scanning the
  // cache for a placeholder) match "any list query" without needing a specific org name.
  lists: () => [...repoKeys.all, 'list'] as const,
  // GitHub org/user/repo names are case-insensitive, so cache keys are normalized to lowercase —
  // otherwise "facebook" and "Facebook" would get separate, redundant cache entries.
  orgList: (org: string) => [...repoKeys.lists(), org.toLowerCase()] as const,
  detail: (owner: string, repo: string) =>
    [
      ...repoKeys.all,
      'detail',
      owner.toLowerCase(),
      repo.toLowerCase(),
    ] as const,
};
