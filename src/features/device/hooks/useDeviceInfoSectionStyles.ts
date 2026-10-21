import { makeStyles } from '@shared/theme';

export const useDeviceInfoSectionStyles = makeStyles(theme => ({
  container: {
    padding: theme.spacing.md,
  },
  title: {
    marginBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
}));
