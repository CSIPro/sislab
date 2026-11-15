import { toast } from "sonner";

/** Options every error toast shares, including a loading toast that turns into an error. A success toast keeps Sonner's default of 4 seconds. */
const errorToast = { duration: 8000, closeButton: true } as const;

/** Reports a failed action as an error toast. The screen also shows the failure inline. Pass the id of a loading toast to turn it into the error. */
export function notifyError(message: string, id?: string | number) {
	return toast.error(message, { ...errorToast, id });
}
