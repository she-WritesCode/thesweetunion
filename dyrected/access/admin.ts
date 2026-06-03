export const adminOnly = ({ user }: { user: any }) => !!user;
export const adminReadWrite = ({ user }: { user: any }) => !!user;
