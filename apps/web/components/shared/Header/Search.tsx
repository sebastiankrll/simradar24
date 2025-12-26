"use client";

import { useEffect, useState } from "react";

export default function Search() {
	const [searchValue, setSearchValue] = useState("");

	useEffect(() => {
		const resetInput = () => {
			setSearchValue("");
		};

		document.addEventListener("click", resetInput);

		return () => {
			document.removeEventListener("click", resetInput);
		};
	}, []);

	return (
		<div id="header-search-wrapper">
			<input id="header-search" type="text" placeholder="Not implemented yet." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} />
		</div>
	);
}
