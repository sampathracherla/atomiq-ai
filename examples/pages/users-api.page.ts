/**
 * Page Object — JSONPlaceholder Users API
 *
 * Encapsulates all API endpoints and actions for the Users resource.
 */
import type { APIFixture } from "../../src/fixtures/enterprise-fixtures";
import type { APIResponse } from "../../src/adapters/api-adapter";

export class UsersApi {
  constructor(private readonly api: APIFixture) {}

  async getAll(): Promise<APIResponse> {
    return this.api.get("/users", {
      headers: { Accept: "application/json" },
    });
  }

  async getById(id: number): Promise<APIResponse> {
    return this.api.get(`/users/${id}`);
  }

  async create(data: {
    name: string;
    email: string;
    company?: string;
  }): Promise<APIResponse> {
    return this.api.post("/users", data);
  }

  async update(
    id: number,
    data: Record<string, unknown>,
  ): Promise<APIResponse> {
    return this.api.put(`/users/${id}`, data);
  }

  async remove(id: number): Promise<APIResponse> {
    return this.api.delete(`/users/${id}`);
  }
}
