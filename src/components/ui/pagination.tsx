import { ChevronLeft, ChevronRight } from "lucide-react";
import type * as React from "react";
import { Button } from "#/components/ui/button.tsx";
import { cn } from "#/lib/utils.ts";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
	return (
		<nav
			aria-label="Paginación"
			className={cn("flex items-center justify-between gap-3", className)}
			data-slot="pagination"
			{...props}
		/>
	);
}

function PaginationPrevious(props: React.ComponentProps<typeof Button>) {
	return (
		<Button size="sm" variant="outline" {...props}>
			<ChevronLeft aria-hidden="true" size={16} />
			Anterior
		</Button>
	);
}

function PaginationNext(props: React.ComponentProps<typeof Button>) {
	return (
		<Button size="sm" variant="outline" {...props}>
			Siguiente
			<ChevronRight aria-hidden="true" size={16} />
		</Button>
	);
}

export { Pagination, PaginationNext, PaginationPrevious };
