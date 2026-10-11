import type * as React from "react";
import { Input } from "#/components/ui/input.tsx";

/** shadcn has no clock component: its time picker is the Input in time mode. */
function TimePicker(props: Omit<React.ComponentProps<typeof Input>, "type">) {
	return <Input data-slot="time-picker" type="time" {...props} />;
}

export { TimePicker };
