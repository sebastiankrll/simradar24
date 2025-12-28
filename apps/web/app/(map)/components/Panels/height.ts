export function setHeight(ref: React.RefObject<HTMLDivElement | null>, isOpen: boolean) {
	if (!ref.current) return;

	if (isOpen) {
		ref.current.style.minHeight = `${ref.current.scrollHeight}px`;
	} else {
		ref.current.style.minHeight = "0px";
	}
}
