import { useEffect, useState } from "react";
import { sislabNowTime, sislabToday } from "../lib/session-dates.ts";

const TICK_MS = 30_000;

export type SislabClock = { today: string; nowTime: string };

/**
 * The current date and time in the SISLAB time zone, refreshed every 30
 * seconds. Null until the component mounts, so the server render and the first
 * client render match.
 */
export function useSislabClock(): SislabClock | null {
	const [clock, setClock] = useState<SislabClock | null>(null);
	useEffect(() => {
		const read = () => {
			const instant = new Date();
			const next = {
				today: sislabToday(instant),
				nowTime: sislabNowTime(instant),
			};
			setClock((current) =>
				current?.today === next.today && current.nowTime === next.nowTime
					? current
					: next,
			);
		};
		read();
		const timer = setInterval(read, TICK_MS);
		return () => clearInterval(timer);
	}, []);
	return clock;
}
