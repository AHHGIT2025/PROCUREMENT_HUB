export type AnyRow = Record<string, any>;
export type User = { id:string; fullName:string; email:string; roles:string[] };
export type Dashboard = { totalRequests:number; pendingApprovals:number; approvedRequests:number; totalMaterials:number; statusChart:any[]; materialUsage:any[]; recentRequests:any[]; oracleStatus:any[] };
