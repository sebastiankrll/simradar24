import type { NextRequest } from "next/server";
import { forward } from "@/utils/api";

export const GET = (req: NextRequest) => forward(req, "");
export const PATCH = (req: NextRequest) => forward(req, "");
export const DELETE = (req: NextRequest) => forward(req, "");
