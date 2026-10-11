import { Avatar, AvatarFallback } from "#/components/ui/avatar.tsx";
import { initials } from "#/lib/user-roles.ts";
import { cn } from "#/lib/utils.ts";

/** A circle with the person's initials. SISLAB has no photos. */
export function PersonAvatar({
	person,
	accent = false,
	className,
}: {
	person: { name: string; surname: string };
	/** Green tint, for the person the screen is about. */
	accent?: boolean;
	className?: string;
}) {
	return (
		<Avatar aria-hidden="true" className={cn("size-11", className)}>
			<AvatarFallback
				className={cn(
					"bg-secondary text-sm font-bold text-foreground",
					accent && "bg-accent text-primary-text",
				)}
			>
				{initials(person)}
			</AvatarFallback>
		</Avatar>
	);
}
