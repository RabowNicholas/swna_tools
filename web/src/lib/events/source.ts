/**
 * Header a page sets when one tool drives another's route, e.g. Claims
 * Assembly calling /api/generate/ee1. Lives on its own so browser code can
 * import it without pulling in the server-side tracking.
 */
export const SOURCE_HEADER = 'x-swna-source';
