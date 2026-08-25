import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Editor, { loader } from "@monaco-editor/react";
import { ClipLoader } from "react-spinners";
import PropTypes from "prop-types";
import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";

// Without this, Monaco falls back to spinning up its worker from a data:
// URL, whose bootstrap script uses a relative import that can't resolve
// with no base path - it fails silently (console error, no crash), but SQL
// doesn't need a dedicated language worker anyway so the plain editor
// worker covers everything the app uses.
self.MonacoEnvironment = {
	getWorker() {
		return new EditorWorker();
	},
};

console.log("QueryEditor module loaded");

const QueryEditor = ({ userQuery, setUserQuery, handleEvaluate, loading }) => {
	const [monacoReady, setMonacoReady] = useState(false);

	useEffect(() => {
		console.log("QueryEditor useEffect running");
		const envValue = import.meta.env.VITE_MONACO_LOAD_LOCAL;
		console.log(
			"VITE_MONACO_LOAD_LOCAL env value:",
			envValue,
			"type:",
			typeof envValue,
		);
		const shouldLoadLocal = envValue === "true";
		console.log("shouldLoadLocal:", shouldLoadLocal);

		if (shouldLoadLocal) {
			console.log("Configuring local Monaco...");
			loader.config({ monaco });
		}

		loader
			.init()
			.then(() => {
				console.log("Monaco initialized");
				setMonacoReady(true);
			})
			.catch((err) => {
				console.error("Monaco init error:", err);
				setMonacoReady(true);
			});
	}, []);
	const handleEvaluateRef = useRef(handleEvaluate);
	useLayoutEffect(() => {
		handleEvaluateRef.current = handleEvaluate;
	});

	const handleEditorMount = (editor, monaco) => {
		editor.addAction({
			id: "evaluate-query",
			label: "Evaluate Query",
			keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
			run: () => {
				handleEvaluateRef.current();
			},
		});
	};

	return (
		<div>
			<h2 className="text-2xl font-bold text-blue-400">SQL Editor</h2>
			<p className="text-gray-200 mb-6 text-lg">Write your SQL query here</p>

			{monacoReady ? (
				<Editor
					height="300px"
					language="sql"
					value={userQuery}
					onChange={(value) => setUserQuery(value)}
					onMount={handleEditorMount}
					options={{
						minimap: { enabled: false },
						fontSize: 22,
						theme: "vs-dark",
						lineNumbers: "off",
					}}
					className="border border-gray-700 rounded-md shadow-md my-4"
				/>
			) : (
				<div className="flex justify-center items-center h-64">
					<ClipLoader color="#fff" loading={true} size={24} />
				</div>
			)}

			<div className="flex flex-col items-end justify-end mt-4">
				<button
					onClick={handleEvaluate}
					disabled={loading}
					className={`px-6 py-2 me-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold ${
						loading ? "opacity-50 cursor-not-allowed" : ""
					}`}
				>
					{loading ? (
						<div className="flex justify-center items-center">
							<ClipLoader
								color="#fff"
								loading={loading}
								size={20}
								className="mr-2"
							/>
							Evaluating...
						</div>
					) : (
						"Evaluate"
					)}
				</button>
				<p className="text-gray-200 my-2 text-sm">
					Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to execute.
				</p>
			</div>
		</div>
	);
};

QueryEditor.propTypes = {
	userQuery: PropTypes.string.isRequired,
	setUserQuery: PropTypes.func.isRequired,
	handleEvaluate: PropTypes.func.isRequired,
	loading: PropTypes.bool.isRequired,
};

export default QueryEditor;
