# Own password accounts initially

University sign-in needs the university IT department's support, so Sislab will initially own password accounts and accept email addresses from any domain. New accounts require admin activation after an out-of-band identity check; imported Clerk records are linked only after that check. Email verification and self-service password reset wait until an email service is available, with admins handling resets in the meantime. User records keep provider-independent IDs so university sign-in can be added later without replacing domain references.
