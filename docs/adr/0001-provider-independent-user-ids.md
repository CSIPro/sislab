# Use provider-independent user IDs

The legacy API uses Clerk IDs as user primary keys. The rebuild will use its own stable user IDs and retain the legacy Clerk ID as an optional unique migration reference. This keeps historical relationships intact while allowing a move to self-hosted authentication without changing every user reference again.
