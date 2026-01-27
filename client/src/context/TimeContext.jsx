import {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
} from "react";
import axios from "axios";

const TimeContext = createContext(null);

export function TimeProvider({ children }) {
	const [startTime, setStartTime] = useState(null);
	const [endTime, setEndTime] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const fetchTimings = useCallback(async () => {
		try {
			const response = await axios.get("/api/get-time");
			const { start_time, end_time } = response.data;
			setStartTime(new Date(start_time).getTime());
			setEndTime(new Date(end_time).getTime());
			setError(null);
		} catch (err) {
			console.error("Error fetching timings:", err);
			setError(err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		// Initial fetch
		fetchTimings();

		// Poll every 5 seconds
		const interval = setInterval(fetchTimings, 10000);

		return () => clearInterval(interval);
	}, [fetchTimings]);

	return (
		<TimeContext.Provider
			value={{ startTime, endTime, loading, error, refetch: fetchTimings }}
		>
			{children}
		</TimeContext.Provider>
	);
}

export function useTime() {
	const context = useContext(TimeContext);
	if (context === null) {
		throw new Error("useTime must be used within a TimeProvider");
	}
	return context;
}

export default TimeContext;
