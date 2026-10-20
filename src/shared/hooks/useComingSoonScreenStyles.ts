import { makeStyles } from '@shared/theme';

export const useComingSoonScreenStyles = makeStyles(theme => ({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  message: {
    marginTop: theme.spacing.sm,
  },
}));
