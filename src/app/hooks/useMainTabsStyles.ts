import { makeStyles } from '@shared/theme';

export const useMainTabsStyles = makeStyles(theme => ({
  tabBar: {
    backgroundColor: theme.colors.surface,
    borderTopColor: theme.colors.border,
  },
}));
