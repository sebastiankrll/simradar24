export type StatusMap = {
	airports?: boolean;
	firs?: boolean;
	tracons?: boolean;
	airlines?: boolean;
	aircrafts?: boolean;
	navigraph?: boolean;
};

export type StatusSetter = (status: Partial<StatusMap> | ((prev: Partial<StatusMap>) => Partial<StatusMap>)) => void;
