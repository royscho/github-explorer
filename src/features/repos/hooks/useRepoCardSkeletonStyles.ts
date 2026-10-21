import { makeStyles } from '@shared/theme';

export const useRepoCardSkeletonStyles = makeStyles(theme => ({
  wrapper: {
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.xs,
  },
  container: {
    gap: theme.spacing.sm,
  },
  bar: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.radii.sm,
    height: 12,
  },
  title: {
    width: '50%',
    height: 16,
  },
  line: {
    width: '90%',
  },
  lineShort: {
    width: '60%',
  },
}));
