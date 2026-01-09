import type { NextRequest } from "next/server";
import { forward } from "@/utils/api";

export const GET = (req: NextRequest) => forward(req, "/data");
