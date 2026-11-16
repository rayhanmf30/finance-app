import { httpClient } from '#lib/core/api/http-client';
import type { DashboardData } from '#lib/shared/models/domain';

class DashboardService {
	async getDashboard(year: number, month: number): Promise<DashboardData> {
		const params = new URLSearchParams({ year: String(year), month: String(month) });
		return httpClient.get<DashboardData>(`/api/dashboard/summary?${params}`);
	}
}

export const dashboardService = new DashboardService();
