import "./Spinner.css";

export default function Spinner({ relative = false }: { relative?: boolean }) {
	return (
		<div className="spinner-wrapper" style={{ position: relative ? "relative" : "absolute" }}>
			<div className="spinner-inner"></div>
		</div>
	);
}
