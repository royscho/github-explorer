import { makeStyles } from '@shared/theme';

export const useRepoStatsStyles = makeStyles(theme => ({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
}));
