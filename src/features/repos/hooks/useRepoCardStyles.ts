import { makeStyles } from '@shared/theme';

export const useRepoCardStyles = makeStyles(theme => ({
  wrapper: {
    position: 'relative',
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.xs,
  },
  container: {
    gap: theme.spacing.xs,
  },
  description: {
    marginBottom: theme.spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  languagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.lg,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    alignSelf: 'flex-start',
  },
  languageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.xs,
  },
  favoriteToggle: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
  },
}));
