import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@shared/theme';

import { RepoStats } from './RepoStats';

function renderStats(props: Partial<React.ComponentProps<typeof RepoStats>>) {
  return render(
    <ThemeProvider>
      <RepoStats stars={220000} forks={45000} openIssues={900} {...props} />
    </ThemeProvider>,
  );
}

describe('RepoStats', () => {
  it('renders formatted stars, forks and open issues', async () => {
    await renderStats({});
    expect(await screen.findByText('⭐ 220k')).toBeOnTheScreen();
    expect(await screen.findByText('45k forks')).toBeOnTheScreen();
    expect(await screen.findByText('900 issues')).toBeOnTheScreen();
  });

  it('renders watchers when passed', async () => {
    await renderStats({ watchers: 220000 });
    expect(await screen.findByText('220k watchers')).toBeOnTheScreen();
  });

  it('omits watchers when not passed', async () => {
    await renderStats({});
    expect(screen.queryByText(/watchers/)).toBeNull();
  });

  it('exposes an accessible label per stat', async () => {
    await renderStats({ watchers: 220000 });
    expect(await screen.findByLabelText('220k stars')).toBeOnTheScreen();
    expect(await screen.findByLabelText('45k forks')).toBeOnTheScreen();
    expect(await screen.findByLabelText('900 open issues')).toBeOnTheScreen();
    expect(await screen.findByLabelText('220k watchers')).toBeOnTheScreen();
  });
});
