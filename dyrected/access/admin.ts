import type { AccessFunction } from "@dyrected/core";

export const adminOnly: AccessFunction<Record<string, unknown>> = ({ user }) => !!user;
export const adminReadWrite = "user != null";
