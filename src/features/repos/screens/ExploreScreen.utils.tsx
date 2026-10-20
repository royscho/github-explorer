import React from 'react';
import type { ListRenderItemInfo } from '@shopify/flash-list';

import { NetworkError, NotFoundError, type GitHubApiError } from '@shared/api';

import { RepoCard, RepoCardSkeleton } from '../components';
import type { Repo } from '../types';

export function formatResetTime(resetAt: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(resetAt);
}

export function getErrorMessage(error: GitHubApiError): string {
  if (error instanceof NetworkError) {
    return 'No connection';
  }
  if (error instanceof NotFoundError) {
    return 'Organization not found';
  }
  return 'Something went wrong';
}

export function keyExtractor(item: Repo): string {
  return String(item.id);
}

export function renderItem({
  item,
}: ListRenderItemInfo<Repo>): React.JSX.Element {
  return <RepoCard repo={item} />;
}

export function renderSkeleton(index: number): React.JSX.Element {
  return <RepoCardSkeleton key={index} />;
}
