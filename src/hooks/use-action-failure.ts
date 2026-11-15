import { useCallback, useState } from "react";
import type { FailureState } from "#/components/notice.tsx";
import { notifyError } from "#/lib/notify.ts";

/**
 * The failure of the last action on a screen or in a dialog. `fail` shows the
 * message inline and raises an error toast, and `clear` hides the inline message
 * when the action starts again or the dialog closes. `reject` shows a message
 * inline only, for a check made before anything is sent.
 */
export function useActionFailure() {
	const [failure, setFailure] = useState<FailureState>(null);
	const fail = useCallback((message: string) => {
		setFailure(message);
		notifyError(message);
	}, []);
	const reject = useCallback((message: string) => setFailure(message), []);
	const clear = useCallback(() => setFailure(null), []);
	return { failure, fail, reject, clear };
}
