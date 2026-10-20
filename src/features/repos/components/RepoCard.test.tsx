import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { ThemeProvider } from '@shared/theme';

import type { Repo } from '../types';
import { RepoCard } from './RepoCard';

const baseRepo: Repo = {
  id: 1,
  name: 'react',
  fullName: 'facebook/react',
  owner: {
    login: 'facebook',
    avatarUrl: 'https://example.com/a.png',
    htmlUrl: 'https://github.com/facebook',
  },
  description: 'The library for web and native user interfaces.',
  htmlUrl: 'https://github.com/facebook/react',
  language: 'JavaScript',
  stars: 220000,
  forks: 45000,
  openIssues: 900,
  createdAt: '2013-05-24T16:15:54Z',
  updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
};

function renderCard(
  repo: Repo,
  props: Partial<
    Pick<React.ComponentProps<typeof RepoCard>, 'onPress' | 'onPressIn'>
  > = {},
) {
  return render(
    <ThemeProvider>
      <RepoCard repo={repo} onPress={jest.fn()} {...props} />
    </ThemeProvider>,
  );
}

describe('RepoCard', () => {
  it('renders the repo name and description', async () => {
    await renderCard(baseRepo);
    expect(await screen.findByText('react')).toBeOnTheScreen();
    expect(
      await screen.findByText(
        'The library for web and native user interfaces.',
      ),
    ).toBeOnTheScreen();
  });

  it('renders "No description" when description is null', async () => {
    await renderCard({ ...baseRepo, description: null });
    expect(await screen.findByText('No description')).toBeOnTheScreen();
  });

  it('renders the language when present', async () => {
    await renderCard(baseRepo);
    expect(await screen.findByText('JavaScript')).toBeOnTheScreen();
  });

  it('renders nothing for language when null', async () => {
    await renderCard({ ...baseRepo, language: null });
    await screen.findByText('react');
    expect(screen.queryByText('JavaScript')).toBeNull();
  });

  it('renders star, fork and open-issue counts', async () => {
    await renderCard(baseRepo);
    expect(await screen.findByText('⭐ 220k')).toBeOnTheScreen();
    expect(await screen.findByText('45k forks')).toBeOnTheScreen();
    expect(await screen.findByText('900 issues')).toBeOnTheScreen();
  });

  it('renders relative "updated" text', async () => {
    await renderCard(baseRepo);
    expect(await screen.findByText('updated 3 days ago')).toBeOnTheScreen();
  });

  it('exposes an accessible label describing the full repo (name, language, stats, updated, description)', async () => {
    await renderCard(baseRepo);
    expect(
      await screen.findByLabelText(
        'react, JavaScript, 220k stars, 45k forks, 900 open issues, updated 3 days ago, ' +
          'The library for web and native user interfaces.',
      ),
    ).toBeOnTheScreen();
  });

  it('falls back to "No description" in the accessible label when description is null', async () => {
    await renderCard({ ...baseRepo, description: null });
    expect(
      await screen.findByLabelText(
        'react, JavaScript, 220k stars, 45k forks, 900 open issues, updated 3 days ago, No description',
      ),
    ).toBeOnTheScreen();
  });

  it('calls onPress with the repo when pressed', async () => {
    const onPress = jest.fn();
    await renderCard(baseRepo, { onPress });
    const card = await screen.findByRole('button', { name: /^react,/ });
    await userEvent.press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(baseRepo);
  });

  it('calls onPressIn with the repo on press-in', async () => {
    const onPress = jest.fn();
    const onPressIn = jest.fn();
    await renderCard(baseRepo, { onPress, onPressIn });
    const card = await screen.findByRole('button', { name: /^react,/ });
    await userEvent.press(card);
    expect(onPressIn).toHaveBeenCalledTimes(1);
    expect(onPressIn).toHaveBeenCalledWith(baseRepo);
  });

  it('does not throw when onPressIn is omitted', async () => {
    const onPress = jest.fn();
    await renderCard(baseRepo, { onPress });
    const card = await screen.findByRole('button', { name: /^react,/ });
    await expect(userEvent.press(card)).resolves.not.toThrow();
  });
});
