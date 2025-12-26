export type StatusMap = {
	airports?: boolean;
	firs?: boolean;
	tracons?: boolean;
	airlines?: boolean;
	aircrafts?: boolean;
	cache?: boolean;
	map?: boolean;
};

export type StatusSetter = (status: Partial<StatusMap> | ((prev: Partial<StatusMap>) => Partial<StatusMap>)) => void;
