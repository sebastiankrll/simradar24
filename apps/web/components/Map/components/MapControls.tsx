import './MapControls.css';

export default function MapControls() {
	return (
		<div id="map-controls">
			<button type="button" className="map-control-item">
				+
			</button>
			<button type="button" className="map-control-item">
				-
			</button>
			<button type="button" className="map-control-item">
				S
			</button>
		</div>
	);
}
