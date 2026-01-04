export function setHeight(ref: React.RefObject<HTMLDivElement | null>, isOpen: boolean) {
	if (!ref.current) return;

	if (isOpen) {
		ref.current.style.minHeight = `${ref.current.scrollHeight}px`;
	} else {
		ref.current.style.minHeight = "0px";
	}
}

export function getSpriteOffset(status: string | undefined) {
	switch (status) {
		case "Climb":
			return -30;
		case "Cruise":
			return -60;
		case "Descent":
			return -90;
		default:
			return 0;
	}
}
