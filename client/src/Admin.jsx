import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "./apiClient";
import { useTime } from "./context/TimeContext";
import { ClipLoader } from "react-spinners";

const toDatetimeLocal = (ms) => {
	if (ms === null || Number.isNaN(ms)) return "";
	const d = new Date(ms);
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
		d.getHours(),
	)}:${pad(d.getMinutes())}`;
};

// Pinned to a fixed timezone rather than relying on the browser/OS's
// ambient timezone setting, which is easy to get wrong on a freshly set up
// event machine and silently shows a confusing offset.
const DISPLAY_TIMEZONE = "Asia/Kolkata";

const formatClock = (date) =>
	Number.isNaN(date.getTime())
		? "-"
		: date.toLocaleTimeString("en-IN", { timeZone: DISPLAY_TIMEZONE });

// datetime-local inputs always render using the browser's own OS timezone
// with no way to override that - so a mismatched device would still be
// confusing there. This gives an explicit, unambiguous IST readout next to
// the input as a cross-check, independent of the device's own settings.
const formatIstPreview = (datetimeLocalValue) => {
	if (!datetimeLocalValue) return "";
	const d = new Date(datetimeLocalValue);
	if (Number.isNaN(d.getTime())) return "";
	return d.toLocaleString("en-IN", {
		timeZone: DISPLAY_TIMEZONE,
		dateStyle: "medium",
		timeStyle: "short",
	});
};

const LOG_TABS = [
	{ key: "submissions", label: "Submissions" },
	{ key: "auth", label: "Auth" },
	{ key: "admin", label: "Admin" },
	{ key: "error", label: "Errors" },
];

const LEVEL_COLOR = {
	info: "text-gray-300",
	warn: "text-yellow-400",
	error: "text-red-400",
};

function LogsPanel() {
	const [tab, setTab] = useState("submissions");
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const fetchLogs = useCallback(async (currentTab) => {
		try {
			const url =
				currentTab === "submissions"
					? "/api/admin/submissions?limit=100"
					: `/api/admin/logs?type=${currentTab}&limit=100`;
			const response = await apiClient.get(url);
			setRows(response.data);
			setError(null);
		} catch (err) {
			console.error("Error fetching logs:", err);
			setError("Failed to load logs.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		setLoading(true);
		fetchLogs(tab);
		const interval = setInterval(() => fetchLogs(tab), 3000);
		return () => clearInterval(interval);
	}, [tab, fetchLogs]);

	return (
		<section className="bg-neutral-900 border border-gray-700 rounded-lg p-6">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-xl font-bold text-blue-400">Event Logs</h2>
				<div className="flex gap-2">
					{LOG_TABS.map(({ key, label }) => (
						<button
							key={key}
							onClick={() => setTab(key)}
							className={`px-3 py-1 rounded-md text-sm font-semibold ${
								tab === key
									? "bg-blue-600 text-white"
									: "bg-gray-700 text-gray-300 hover:bg-gray-600"
							}`}
						>
							{label}
						</button>
					))}
				</div>
			</div>

			{error && <p className="text-red-400 text-sm mb-3">{error}</p>}

			<div className="max-h-96 overflow-y-auto border border-gray-700 rounded-md">
				<table className="w-full text-sm text-left">
					<thead className="bg-neutral-800 text-gray-400 sticky top-0">
						{tab === "submissions" ? (
							<tr>
								<th className="p-2">Time</th>
								<th className="p-2">User</th>
								<th className="p-2">Problem</th>
								<th className="p-2">Marks</th>
							</tr>
						) : (
							<tr>
								<th className="p-2">Time</th>
								<th className="p-2">Level</th>
								<th className="p-2">User</th>
								<th className="p-2">Message</th>
							</tr>
						)}
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan={4} className="p-4 text-center text-gray-500">
									Loading...
								</td>
							</tr>
						) : rows.length === 0 ? (
							<tr>
								<td colSpan={4} className="p-4 text-center text-gray-500">
									Nothing here yet.
								</td>
							</tr>
						) : tab === "submissions" ? (
							rows.map((r) => (
								<tr key={r.id} className="border-t border-gray-800">
									<td className="p-2 text-gray-400">
										{formatClock(new Date(r.timestamp * 1000))}
									</td>
									<td className="p-2">{r.name || r.username}</td>
									<td className="p-2">{r.problemTitle}</td>
									<td className="p-2">
										{r.marks}
										{r.bonus_marks > 0 && (
											<span className="text-green-400"> +{r.bonus_marks}</span>
										)}
									</td>
								</tr>
							))
						) : (
							rows.map((r) => (
								<tr key={r.id} className="border-t border-gray-800">
									<td className="p-2 text-gray-400">
										{formatClock(new Date(r.created_at))}
									</td>
									<td className={`p-2 font-semibold ${LEVEL_COLOR[r.level] ?? ""}`}>
										{r.level}
									</td>
									<td className="p-2">{r.username || "-"}</td>
									<td className="p-2">{r.message}</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</section>
	);
}

function Admin() {
	const navigate = useNavigate();
	const {
		startTime,
		endTime,
		loading: timeLoading,
		refetch,
	} = useTime();

	const [userInfo, setUserInfo] = useState(null);
	const [checkingAccess, setCheckingAccess] = useState(true);
	const [accessError, setAccessError] = useState(null);

	const [startInput, setStartInput] = useState("");
	const [endInput, setEndInput] = useState("");
	const initializedRef = useRef(false);

	const [saving, setSaving] = useState(false);
	const [resetting, setResetting] = useState(false);
	const [statusMessage, setStatusMessage] = useState(null);
	const [statusIsError, setStatusIsError] = useState(false);

	const [now, setNow] = useState(() => new Date().getTime());

	useEffect(() => {
		const interval = setInterval(() => setNow(new Date().getTime()), 1000);
		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		apiClient
			.get("/api/userinfo")
			.then((response) => setUserInfo(response.data))
			.catch((err) => {
				console.error("Error fetching user info:", err);
				setAccessError("Failed to verify your account. Please log in again.");
			})
			.finally(() => setCheckingAccess(false));
	}, []);

	// Prefill the editor from the live config once, so it doesn't clobber
	// in-progress edits every time TimeContext polls.
	useEffect(() => {
		if (!initializedRef.current && !timeLoading && startTime !== null && endTime !== null) {
			setStartInput(toDatetimeLocal(startTime));
			setEndInput(toDatetimeLocal(endTime));
			initializedRef.current = true;
		}
	}, [timeLoading, startTime, endTime]);

	const applyUpdate = useCallback(
		async (payload, successMessage) => {
			setSaving(true);
			setStatusMessage(null);
			try {
				await apiClient.post("/api/update-time", payload);
				await refetch();
				setStatusIsError(false);
				setStatusMessage(successMessage);
			} catch (err) {
				console.error("Error updating config:", err);
				setStatusIsError(true);
				setStatusMessage(
					err.response?.data?.error || "Failed to update the schedule.",
				);
			} finally {
				setSaving(false);
			}
		},
		[refetch],
	);

	const handleSaveSchedule = (e) => {
		e.preventDefault();
		if (!startInput || !endInput) {
			setStatusIsError(true);
			setStatusMessage("Both start and end time are required.");
			return;
		}
		const start = new Date(startInput);
		const end = new Date(endInput);
		if (end <= start) {
			setStatusIsError(true);
			setStatusMessage("End time must be after start time.");
			return;
		}
		applyUpdate(
			{ start_time: start.toISOString(), end_time: end.toISOString() },
			"Schedule saved.",
		);
	};

	const handleStartNow = () => {
		const nowIso = new Date().toISOString();
		applyUpdate({ start_time: nowIso }, "Competition started.").then(() =>
			setStartInput(toDatetimeLocal(new Date().getTime())),
		);
	};

	const handleExtendEnd = (minutes) => {
		const base = endTime !== null && endTime > now ? endTime : now;
		const newEnd = new Date(base + minutes * 60 * 1000);
		applyUpdate(
			{ end_time: newEnd.toISOString() },
			`Extended end time by ${minutes} minutes.`,
		).then(() => setEndInput(toDatetimeLocal(newEnd.getTime())));
	};

	const handleEndNow = () => {
		if (!window.confirm("End the competition immediately for everyone?")) {
			return;
		}
		const nowDate = new Date();
		applyUpdate(
			{ end_time: nowDate.toISOString() },
			"Competition ended.",
		).then(() => setEndInput(toDatetimeLocal(nowDate.getTime())));
	};

	const handleResetSubmissions = async () => {
		if (
			!window.confirm(
				"This permanently deletes ALL submissions for every user (a backup is saved to db/backups/ first). Use this to clear out test attempts before the real event - not during it. Continue?",
			)
		) {
			return;
		}
		setResetting(true);
		setStatusMessage(null);
		try {
			const response = await apiClient.post("/api/admin/submissions/reset");
			setStatusIsError(false);
			setStatusMessage(
				`Reset ${response.data.rowsBackedUp} submission(s). Backup saved as ${response.data.backupFile}.`,
			);
		} catch (err) {
			console.error("Error resetting submissions:", err);
			setStatusIsError(true);
			setStatusMessage(
				err.response?.data?.error || "Failed to reset submissions.",
			);
		} finally {
			setResetting(false);
		}
	};

	if (checkingAccess) {
		return (
			<div className="w-full h-screen bg-neutral-950 flex items-center justify-center">
				<ClipLoader color="#fff" loading={true} size={32} />
			</div>
		);
	}

	if (accessError || !userInfo?.isAdmin) {
		return (
			<div className="w-full h-screen bg-neutral-950 text-white flex items-center justify-center">
				<div className="text-center">
					<h2 className="text-2xl font-bold text-red-500 mb-3">
						Access Denied
					</h2>
					<p className="text-gray-400 mb-6">
						{accessError || "You do not have admin access."}
					</p>
					<button
						onClick={() => navigate("/home")}
						className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700"
					>
						Back to Competition
					</button>
				</div>
			</div>
		);
	}

	let status = "Not Started";
	let statusColor = "text-gray-400";
	if (startTime !== null && endTime !== null) {
		if (now < startTime) {
			status = "Not Started";
			statusColor = "text-gray-400";
		} else if (now < endTime) {
			status = "Live";
			statusColor = "text-green-500";
		} else {
			status = "Ended";
			statusColor = "text-red-500";
		}
	}

	return (
		<div className="w-full min-h-screen bg-neutral-950 text-white">
			<header className="w-full px-5 py-3 bg-neutral-950 border-b border-gray-700 flex justify-between items-center">
				<div className="text-sm text-gray-200">
					<div className="text-lg font-semibold text-green-500">
						{userInfo.name}
					</div>
					<div className="text-xs">Admin Panel</div>
				</div>
				<h1 className="text-3xl font-extrabold text-blue-400 text-center">
					Bit By Query
				</h1>
				<div className="flex gap-3 text-sm">
					<button
						onClick={() => navigate("/home")}
						className="px-3 py-2 bg-gray-700 rounded-md hover:bg-gray-600 font-semibold"
					>
						Back to Competition
					</button>
					<button
						onClick={() => {
							localStorage.removeItem("authToken");
							navigate("/login");
						}}
						className="px-3 py-2 bg-red-600 rounded-md hover:bg-red-700 font-semibold"
					>
						Logout
					</button>
				</div>
			</header>

			<main className="max-w-5xl mx-auto p-6 space-y-6">
				<section className="bg-neutral-900 border border-gray-700 rounded-lg p-6">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-xl font-bold text-blue-400">Status</h2>
						<span className={`text-lg font-bold ${statusColor}`}>
							{status}
						</span>
					</div>

					<div className="flex flex-wrap gap-3">
						<button
							onClick={handleStartNow}
							disabled={saving}
							className="px-4 py-2 bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 font-semibold"
						>
							Start Now
						</button>
						<button
							onClick={() => handleExtendEnd(5)}
							disabled={saving}
							className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 font-semibold"
						>
							+5 min
						</button>
						<button
							onClick={() => handleExtendEnd(15)}
							disabled={saving}
							className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 font-semibold"
						>
							+15 min
						</button>
						<button
							onClick={() => handleExtendEnd(30)}
							disabled={saving}
							className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 font-semibold"
						>
							+30 min
						</button>
						<button
							onClick={handleEndNow}
							disabled={saving}
							className="px-4 py-2 bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 font-semibold ml-auto"
						>
							End Competition Now
						</button>
					</div>
				</section>

				<section className="bg-neutral-900 border border-gray-700 rounded-lg p-6">
					<h2 className="text-xl font-bold text-blue-400 mb-4">
						Edit Schedule
					</h2>
					<form onSubmit={handleSaveSchedule} className="space-y-4">
						<div>
							<label htmlFor="start_time" className="block text-sm mb-1">
								Start Time{" "}
								<span className="text-gray-500">
									(shown in this device&apos;s own timezone)
								</span>
							</label>
							<input
								type="datetime-local"
								id="start_time"
								value={startInput}
								onChange={(e) => setStartInput(e.target.value)}
								className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-md"
								required
							/>
							{startInput && (
								<p className="text-xs text-gray-400 mt-1">
									= {formatIstPreview(startInput)} IST
								</p>
							)}
						</div>
						<div>
							<label htmlFor="end_time" className="block text-sm mb-1">
								End Time{" "}
								<span className="text-gray-500">
									(shown in this device&apos;s own timezone)
								</span>
							</label>
							<input
								type="datetime-local"
								id="end_time"
								value={endInput}
								onChange={(e) => setEndInput(e.target.value)}
								className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-md"
								required
							/>
							{endInput && (
								<p className="text-xs text-gray-400 mt-1">
									= {formatIstPreview(endInput)} IST
								</p>
							)}
						</div>
						<button
							type="submit"
							disabled={saving}
							className="px-6 py-2 bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 font-semibold"
						>
							{saving ? "Saving..." : "Save Schedule"}
						</button>
					</form>
				</section>

				<section className="bg-neutral-900 border border-red-900 rounded-lg p-6">
					<h2 className="text-xl font-bold text-red-400 mb-2">Danger Zone</h2>
					<p className="text-gray-400 text-sm mb-4">
						Permanently deletes all submissions (a backup is saved to{" "}
						<code>db/backups/</code> first). Use this to clear out test
						attempts before the real event — not during it.
					</p>
					<button
						onClick={handleResetSubmissions}
						disabled={resetting}
						className="px-4 py-2 bg-red-700 rounded-md hover:bg-red-800 disabled:opacity-50 font-semibold"
					>
						{resetting ? "Resetting..." : "Reset All Submissions"}
					</button>
				</section>

				{statusMessage && (
					<div
						className={`p-4 rounded-md text-center font-semibold ${
							statusIsError ? "bg-red-600" : "bg-green-600"
						}`}
					>
						{statusMessage}
					</div>
				)}

				<LogsPanel />
			</main>
		</div>
	);
}

export default Admin;
