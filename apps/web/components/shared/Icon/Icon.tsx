export default function Icon({ name, size = 32, offset }: { name: string; size?: number; offset?: number }) {
	return (
		<svg width={size} height={size} aria-hidden="true" style={{ transform: offset ? `translateY(${offset}px)` : undefined }}>
			<use href={`/sprites/icons.svg#${name}`} />
		</svg>
	);
}
